'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Lock } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore, isAIContentStyle } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { TestDisplay } from './TestDisplay';
import { TestTimer } from './TestTimer';
import { WPMSpeedometer } from './WPMSpeedometer';
import { SettingsToolbar } from '@/components/settings/SettingsToolbar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { getRandomTest, textToWords, calculateRequiredWords } from '@/lib/test-content';
import { getRandomBenchmarkContent, BENCHMARK_CONFIG } from '@/lib/benchmark-config';
import { calculateLiveWPM } from '@/lib/test-engine/calculations';

export function TypingTest() {
  const router = useRouter();
  const { currentUserId, isAuthenticated } = useUserStore();
  const { defaultDuration, llmModel, llmTemperature, defaultContentStyle, customPrompt, customSequences, autoSave, noBackspaceMode, showPracticeHighlights, setAutoSave, setDefaultContentStyle } = useSettingsStore();
  const {
    status,
    duration,
    targetWords,
    completedWords,
    currentInput,
    currentWordIndex,
    startTime,
    result,
    isPractice,
    practiceSequences,
    initializeTest,
    startTest,
    handleKeyPress,
    handleBackspace,
    handleTab,
    completeTest,
    resetTest,
  } = useTestStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [isCompletingTest, setIsCompletingTest] = useState(false);
  const [liveWPM, setLiveWPM] = useState(0);
  const [isLoadingContent, setIsLoadingContent] = useState(false);

  // Check if we're in benchmark mode
  const isBenchmarkMode = defaultContentStyle === 'benchmark';

  // Manage autoSave based on authentication status and benchmark mode
  useEffect(() => {
    if (!isAuthenticated && autoSave) {
      // Disable autoSave for anonymous users
      setAutoSave(false);
    } else if (isAuthenticated && !autoSave && isBenchmarkMode) {
      // Enable autoSave by default for benchmark tests if user is logged in
      setAutoSave(true);
    } else if (isAuthenticated && !autoSave && !isBenchmarkMode) {
      // Enable autoSave by default for logged-in users
      setAutoSave(true);
    }
  }, [isAuthenticated, autoSave, isBenchmarkMode, setAutoSave]);

  // Initialize test on mount
  useEffect(() => {
    if (status === 'idle' && targetWords.length === 0) {
      // Check if benchmark mode is selected
      if (defaultContentStyle === 'benchmark') {
        const benchmarkContent = getRandomBenchmarkContent();
        const requiredWords = calculateRequiredWords(BENCHMARK_CONFIG.duration);
        const words = textToWords(benchmarkContent.text, requiredWords);

        initializeTest(
          {
            duration: BENCHMARK_CONFIG.duration,
            testContentId: benchmarkContent.id,
            testContentTitle: benchmarkContent.title,
            testContentCategory: 'Benchmark',
            userLabels: [BENCHMARK_CONFIG.label],
          },
          words
        );
      } else {
        const testContent = getRandomTest();
        const requiredWords = calculateRequiredWords(defaultDuration);
        const words = textToWords(testContent.text, requiredWords);

        // Update settings to reflect the actual content loaded (sync settings with reality)
        setDefaultContentStyle(testContent.category);

        initializeTest(
          {
            duration: defaultDuration,
            testContentId: testContent.id,
            testContentTitle: testContent.title,
            testContentCategory: testContent.category.charAt(0).toUpperCase() + testContent.category.slice(1),
          },
          words
        );
      }
    }
  }, [status, targetWords, initializeTest, defaultDuration, defaultContentStyle, setDefaultContentStyle]);

  // Update test duration when defaultDuration changes (and test is idle)
  useEffect(() => {
    if (status === 'idle' && targetWords.length > 0 && duration !== defaultDuration) {
      // Get current user labels from the store
      const currentUserLabels = useTestStore.getState().userLabels;

      // Reinitialize the test with new duration but same words
      // Preserve practice mode, sequences, and user labels
      initializeTest(
        {
          duration: defaultDuration,
          testContentId: 'regenerated',
          isPractice,
          practiceSequences,
          userLabels: currentUserLabels,
        },
        targetWords
      );
    }
  }, [defaultDuration, status, targetWords, duration, initializeTest, isPractice, practiceSequences]);

  // Cleanup: Reset test when component unmounts (e.g., navigating away)
  useEffect(() => {
    return () => {
      // Get the latest state when unmounting
      const currentStatus = useTestStore.getState().status;
      if (currentStatus === 'active') {
        resetTest();
      }
    };
  }, [resetTest]);

  // Handle content generation/loading
  const handleContentLoad = useCallback(async () => {
    setGenerationError(null);
    setIsLoadingContent(true);

    // Reset test to clear previous content from button
    resetTest();

    const isAI = isAIContentStyle(defaultContentStyle);

    if (isAI) {
      // Generate AI content
      setIsGenerating(true);

      try {
        const requiredWords = calculateRequiredWords(defaultDuration);

        // Check if the style is "ai-sequences" - use targeted practice mode
        if (defaultContentStyle === 'ai-sequences') {
          // Use custom sequences if available, otherwise fallback to historical data
          let sequencesToUse: string[] = [];

          if (customSequences.length > 0) {
            sequencesToUse = customSequences;
          } else {
            // Fallback: Import and get historical slow sequences
            if (currentUserId) {
              const { getAggregateSlowSequences } = await import('@/lib/db/firebase');
              sequencesToUse = await getAggregateSlowSequences(currentUserId, 5);
            }
          }

          if (sequencesToUse.length === 0) {
            setGenerationError('No sequences defined. Add sequences in the content settings or click "Use Slowest Sequences" to auto-fill from your history.');
            setIsGenerating(false);
            return;
          }

          // Use the practice API endpoint
          const response = await fetch('/api/generate-practice', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sequences: sequencesToUse,
              options: {
                model: llmModel,
                temperature: llmTemperature,
                minWords: requiredWords,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate practice content');
          }

          const result = await response.json();
          const words = textToWords(result.text, requiredWords);

          // Initialize test with practice metadata
          resetTest();
          initializeTest(
            {
              duration: defaultDuration,
              testContentId: 'ai-sequences',
              testContentTitle: result.title || 'Character Sequence Practice',
              testContentCategory: 'AI Character Sequence',
              isPractice: true,
              practiceSequences: sequencesToUse,
            },
            words
          );
        } else {
          // Regular AI content generation
          // Map AI style to API style
          const apiStyle = defaultContentStyle.replace('ai-', '') as 'prose' | 'quote' | 'technical' | 'common' | 'custom';

          const response = await fetch('/api/generate-content', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              options: {
                model: llmModel,
                temperature: llmTemperature,
                style: apiStyle,
                customPrompt: customPrompt || undefined,
                minWords: requiredWords,
              },
            }),
          });

          if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Failed to generate content');
          }

          const result = await response.json();
          const words = textToWords(result.text, requiredWords);

          // Initialize test with generated content
          resetTest();
          initializeTest(
            {
              duration: defaultDuration,
              testContentId: `ai-${apiStyle}`,
              testContentTitle: result.title || 'Generated Content',
              testContentCategory: `AI ${apiStyle.charAt(0).toUpperCase() + apiStyle.slice(1)}`,
            },
            words
          );
        }
      } catch (error) {
        console.error('AI generation error:', error);
        setGenerationError(
          error instanceof Error ? error.message : 'Failed to generate content'
        );
      } finally {
        setIsGenerating(false);
        setIsLoadingContent(false);
      }
    } else if (defaultContentStyle === 'benchmark') {
      // Load benchmark content with special constraints
      const benchmarkContent = getRandomBenchmarkContent();
      const requiredWords = calculateRequiredWords(BENCHMARK_CONFIG.duration);
      const words = textToWords(benchmarkContent.text, requiredWords);

      // Get current user labels
      const currentUserLabels = useTestStore.getState().userLabels;

      initializeTest(
        {
          duration: BENCHMARK_CONFIG.duration,
          testContentId: benchmarkContent.id,
          testContentTitle: benchmarkContent.title,
          testContentCategory: 'Benchmark',
          userLabels: [...currentUserLabels, BENCHMARK_CONFIG.label],
        },
        words
      );
      setIsLoadingContent(false);
    } else {
      // Load static content
      const testContent = getRandomTest(defaultContentStyle === 'random' ? undefined : defaultContentStyle);
      const requiredWords = calculateRequiredWords(defaultDuration);
      const words = textToWords(testContent.text, requiredWords);

      // If random was selected, update settings to show what was actually loaded
      if (defaultContentStyle === 'random') {
        setDefaultContentStyle(testContent.category);
      }

      initializeTest(
        {
          duration: defaultDuration,
          testContentId: testContent.id,
          testContentTitle: testContent.title,
          testContentCategory: testContent.category.charAt(0).toUpperCase() + testContent.category.slice(1),
        },
        words
      );
      setIsLoadingContent(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llmModel, llmTemperature, defaultContentStyle, customPrompt, customSequences, defaultDuration, resetTest, initializeTest]);

  // Update test duration when defaultDuration changes (and test is idle)
  useEffect(() => {
    if (status === 'idle' && targetWords.length > 0 && duration !== defaultDuration) {
      // If using AI content, regenerate with new duration
      if (isAIContentStyle(defaultContentStyle)) {
        handleContentLoad();
      } else {
        // For static content, reinitialize the test with new duration but same words
        // Preserve practice mode and sequences
        initializeTest(
          {
            duration: defaultDuration,
            testContentId: 'regenerated',
            isPractice,
            practiceSequences,
          },
          targetWords
        );
      }
    }
  }, [defaultDuration, status, targetWords, duration, initializeTest, isPractice, practiceSequences, defaultContentStyle, handleContentLoad]);

  // Handle test completion
  const handleComplete = useCallback(async () => {
    setIsCompletingTest(true);
    try {
      const result = await completeTest(autoSave);
      // Navigate to results page only if we got a valid result AND it was saved
      if (result && autoSave) {
        router.push(`/results/${result.id}`);
      } else {
        // If practice mode, show results inline
        setIsCompletingTest(false);
      }
      // If practice mode (autoSave is false), result is stored in test store
      // and will be displayed inline - no navigation needed
    } catch (error) {
      console.error('Failed to complete test:', error);
      setIsCompletingTest(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [completeTest, router, autoSave]);

  // Update live WPM during active test
  useEffect(() => {
    if (status === 'active' && startTime) {
      const interval = setInterval(() => {
        const wpm = calculateLiveWPM(
          targetWords,
          completedWords,
          currentInput,
          currentWordIndex,
          startTime
        );
        setLiveWPM(wpm);
      }, 100); // Update every 100ms for smooth animation

      return () => clearInterval(interval);
    } else {
      setLiveWPM(0);
    }
  }, [status, startTime, targetWords, completedWords, currentInput, currentWordIndex]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // If test is idle, start it on first character input
      if (status === 'idle') {
        // Only start on actual characters (not Shift, Ctrl, etc.)
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          startTest();
          // Let the key press be handled by the active state logic below
          // by not returning here
        } else {
          // Don't start on modifier keys
          return;
        }
      }

      // Only process if test is active (or just became active)
      if (status !== 'active' && status !== 'idle') {
        return;
      }

      // Prevent default for keys we're handling
      if (e.key === 'Tab' || e.key === 'Backspace') {
        e.preventDefault();
      }

      // Handle Tab (skip to next word)
      if (e.key === 'Tab') {
        handleTab();
        return;
      }

      // Handle Backspace
      if (e.key === 'Backspace') {
        handleBackspace();
        return;
      }

      // Handle regular characters and space
      if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
        handleKeyPress(e.key);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [status, handleKeyPress, handleBackspace, handleTab, startTest]);

  // Show initial loading state (only when no content at all)
  if (targetWords.length === 0 && !isGenerating) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-muted">Loading test...</p>
      </div>
    );
  }

  // Show loading state when completing test and navigating
  if (isCompletingTest && autoSave) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-editor-accent/30 border-t-editor-accent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-editor-muted">Loading results...</p>
        </div>
      </div>
    );
  }

  // Show test UI with contextual loading
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Header with timer */}
      <div className="w-full max-w-4xl mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Typing Test</h1>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <Link
                  href="/stats"
                  className="px-4 py-2 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
                >
                  View Stats
                </Link>
                <TestTimer
                  duration={duration}
                  startTime={startTime}
                  onComplete={handleComplete}
                />
                <LogoutButton />
              </>
            ) : (
              <>
                <div className="relative group">
                  <button
                    disabled
                    className="px-4 py-2 bg-editor-muted/30 text-editor-muted rounded-lg font-medium transition-colors flex items-center gap-2 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    View Stats
                  </button>
                  {/* Tooltip */}
                  <div className="absolute left-0 top-full mt-2 w-48 p-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                    Create an account or log in to access stats
                  </div>
                </div>
                <TestTimer
                  duration={duration}
                  startTime={startTime}
                  onComplete={handleComplete}
                />
                <Link
                  href="/login"
                  className="px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
                >
                  Sign In
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* No Corrections Mode Banner */}
      {(noBackspaceMode || isBenchmarkMode) && (
        <div className="w-full max-w-4xl mb-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🔒</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-400 text-sm">No Corrections Mode Active</h3>
                <p className="text-xs text-editor-muted">
                  {isBenchmarkMode
                    ? 'Backspace is disabled for all benchmark tests - focus on accuracy!'
                    : 'Backspace is disabled - focus on accuracy!'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Targeted Practice Banner - Only show when practicing specific sequences */}
      {isPractice && practiceSequences.length > 0 && (
        <div className="w-full max-w-4xl mb-4">
          <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-0.5">
                <div className="w-8 h-8 bg-purple-600/20 rounded-lg flex items-center justify-center">
                  <span className="text-xl">🎯</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-400 mb-1">Targeted Practice</h3>
                <p className="text-sm text-editor-muted mb-2">
                  This test focuses on improving your typing with these sequences:
                </p>
                <div className="flex flex-wrap gap-2">
                  {practiceSequences.map((seq, i) => (
                    <span
                      key={i}
                      className="px-3 py-1 bg-purple-600/20 border border-purple-600/40 rounded-full text-sm font-mono font-bold text-purple-300"
                    >
                      {seq.split('').map((char, idx) => (
                        char === ' ' ? (
                          <span key={idx} className="inline-block bg-purple-400/30 border border-purple-400/50 rounded px-0.5 mx-0.5">␣</span>
                        ) : (
                          <span key={idx}>{char}</span>
                        )
                      ))}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Settings Toolbar */}
      <div className="w-full max-w-4xl">
        <SettingsToolbar
          disabled={status === 'active'}
          onContentChange={handleContentLoad}
          showHighlightToggle={isPractice && practiceSequences.length > 0}
          isLoadingContent={isLoadingContent}
        />
        {generationError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-400">{generationError}</p>
          </div>
        )}
      </div>

      {/* Quick Results Display - Show inline when results aren't being saved */}
      {status === 'complete' && result && !autoSave && (
        <div className="w-full max-w-4xl mb-6 bg-editor-bg/80 border border-editor-muted rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Test Complete!</h2>
          <p className="text-sm text-editor-muted mb-4">Results not saved (Save Results is off)</p>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-editor-bg/50 rounded-lg p-4">
              <div className="text-sm text-editor-muted mb-1">WPM</div>
              <div className="text-3xl font-bold">{result.wpm}</div>
            </div>
            <div className="bg-editor-bg/50 rounded-lg p-4">
              <div className="text-sm text-editor-muted mb-1">Accuracy</div>
              <div className="text-3xl font-bold">{result.accuracy}%</div>
            </div>
          </div>
          <button
            onClick={resetTest}
            className="w-full px-4 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Test display */}
      <div className={`w-full max-w-4xl bg-editor-bg border border-editor-muted rounded-lg relative overflow-hidden ${
        isGenerating ? 'opacity-50' : 'opacity-100'
      } transition-opacity ${status === 'complete' ? 'hidden' : ''}`}>
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-editor-bg/80 backdrop-blur-sm z-10">
            <p className="text-editor-muted">Generating new content...</p>
          </div>
        )}
        <div className="h-48 overflow-y-auto p-8">
          <TestDisplay
            targetWords={targetWords}
            completedWords={completedWords}
            currentInput={currentInput}
            currentWordIndex={currentWordIndex}
            practiceSequences={isPractice ? practiceSequences : []}
            showHighlights={showPracticeHighlights}
          />
        </div>
      </div>
      {/* Footer hints */}
      <div className="w-full max-w-4xl mt-4 text-sm text-editor-muted text-center">
        {status === 'idle' && !isGenerating && (
          <p>Start typing to begin the test...</p>
        )}
        {status === 'active' && (
          <p>Press Tab or Space to skip to the next word.{(noBackspaceMode || isBenchmarkMode) ? ' Backspace is disabled' : ''}</p>
        )}
      </div>
      {/* Live WPM Speedometer - Only show when test is active */}
      <div style={{minHeight: '180px'}}>
      <AnimatePresence>
        {status === 'active' && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-4xl mt-6 flex justify-center"
          >
            <WPMSpeedometer wpm={liveWPM} />
          </motion.div>
        )}
      </AnimatePresence>
      </div>



      {/* Attribution */}
      <div className="w-full max-w-4xl mt-6 text-xs text-editor-muted/60 text-center">
        <a
          href="https://cunningjams.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hover:text-editor-muted transition-colors"
        >
          By Nickolus Cunningham
        </a>
      </div>
    </div>
  );
}
