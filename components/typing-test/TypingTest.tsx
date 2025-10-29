'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore, isAIContentStyle } from '@/store/settings-store';
import { useUserStore } from '@/store/user-store';
import { TestDisplay } from './TestDisplay';
import { TestTimer } from './TestTimer';
import { WPMSpeedometer } from './WPMSpeedometer';
import { TipsBanner } from './TipsBanner';
import { SettingsToolbar } from '@/components/settings/SettingsToolbar';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { getRandomTest, textToWords, calculateRequiredWords, getTestById, isTimeTrialTest } from '@/lib/test-content';
import { getRandomBenchmarkContent, BENCHMARK_CONFIG } from '@/lib/benchmark-config';
import { calculateLiveWPM } from '@/lib/test-engine/calculations';

export function TypingTest() {
  const router = useRouter();
  const { currentUserId, isAuthenticated, wpmScore } = useUserStore();
  const { defaultDuration, llmModel, llmTemperature, defaultContentStyle, customPrompt, customSequences, autoSave, showPracticeHighlights, showSpeedometer, setAutoSave, setDefaultContentStyle, correctionMode, mistakeThreshold } = useSettingsStore();
  const {
    status,
    duration,
    targetWords,
    completedWords,
    currentInput,
    currentWordIndex,
    startTime,
    endTime,
    result,
    isPractice,
    practiceSequences,
    strictModeErrors,
    failedReason,
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
  const [shouldShake, setShouldShake] = useState(false);
  const [wpmStatus, setWpmStatus] = useState<{
    canUpdate: boolean;
    hasScore: boolean;
    currentScore: number | null;
    daysUntilUpdate: number | null;
    daysUntilReset: number | null;
    updateAllowedDate: Date | null;
    resetDate: Date | null;
  } | null>(null);

  // Check if we're in benchmark mode
  const isBenchmarkMode = defaultContentStyle === 'benchmark';

  // Check if we're in time trial mode
  const isTimeTrialMode = isTimeTrialTest(defaultContentStyle);

  // Time trial best time state
  const [timeTrialBestTime, setTimeTrialBestTime] = useState<number | null>(null);

  // Load best time for time trials
  useEffect(() => {
    if (isTimeTrialMode && currentUserId) {
      import('@/lib/db/firebase').then(({ getTimeTrialBestTime }) => {
        getTimeTrialBestTime(currentUserId, defaultContentStyle).then((bestTime) => {
          setTimeTrialBestTime(bestTime);
        }).catch((error) => {
          console.error('Failed to load best time:', error);
        });
      });
    } else {
      setTimeTrialBestTime(null);
    }
  }, [isTimeTrialMode, currentUserId, defaultContentStyle]);

  // Check if we're in content-length mode
  const isContentLengthMode = duration === 'content-length';
  const remainingWords = isContentLengthMode
    ? targetWords.length - currentWordIndex
    : undefined;

  // Load WPM status when authenticated (for tooltip)
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      const loadWPMStatus = async () => {
        try {
          const { getWPMScoreStatus } = await import('@/lib/db/firebase');
          const status = await getWPMScoreStatus(currentUserId);
          setWpmStatus(status);
        } catch (error) {
          console.error('Failed to load WPM status:', error);
        }
      };
      loadWPMStatus();
    } else {
      setWpmStatus(null);
    }
  }, [isAuthenticated, currentUserId]);

  // Generate tooltip message based on WPM status
  const getWpmTooltipMessage = () => {
    if (!wpmStatus) return null;

    if (!wpmStatus.hasScore) {
      return 'Take a benchmark test to set your official WPM';
    } else if (wpmStatus.canUpdate) {
      return `You can take one more benchmark test in the next ${wpmStatus.daysUntilReset} days. Your new score will be the average of the new score and the old score.`;
    } else {
      return `Your WPM score is set and cannot be changed until ${wpmStatus.updateAllowedDate?.toLocaleDateString()}. Your score will reset in ${wpmStatus.daysUntilReset} days.`;
    }
  };

  // Handle restart
  const handleRestart = useCallback(() => {
    // Reset the test state to idle, preserving the current content
    const currentState = useTestStore.getState();

    // Re-initialize the test with the same words and configuration
    initializeTest(
      {
        duration: currentState.duration,
        testContentId: currentState.testContentId || 'restarted',
        testContentTitle: currentState.testContentTitle || undefined,
        testContentCategory: currentState.testContentCategory || undefined,
        isPractice: currentState.isPractice,
        practiceSequences: currentState.practiceSequences,
        userLabels: currentState.userLabels,
        isTimeTrial: currentState.isTimeTrial,
        timeTrialId: currentState.timeTrialId || undefined,
      },
      currentState.targetWords
    );
  }, [initializeTest]);

  // Handle content generation/loading
  const handleContentLoad = useCallback(async () => {
    // Get the current content style from the store to ensure we have the latest value
    const currentContentStyle = useSettingsStore.getState().defaultContentStyle;
    console.log('[TypingTest] handleContentLoad called, currentContentStyle:', currentContentStyle);
    setGenerationError(null);
    setIsLoadingContent(true);

    // Reset test to clear previous content from button
    resetTest();

    const isAI = isAIContentStyle(currentContentStyle);

    if (isAI) {
      // Generate AI content
      setIsGenerating(true);

      try {
        // For content-length mode, use a default word count for generation (e.g., 100 words)
        const requiredWords = defaultDuration === 'content-length'
          ? 100
          : calculateRequiredWords(defaultDuration);

        // Check if the style is "ai-sequences" - use targeted practice mode
        if (currentContentStyle === 'ai-sequences') {
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
          const apiStyle = currentContentStyle.replace('ai-', '') as 'prose' | 'quote' | 'technical' | 'common' | 'custom';

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
    } else if (currentContentStyle === 'benchmark') {
      // Load benchmark content with special constraints
      console.log('[TypingTest] Loading benchmark content');
      try {
        const benchmarkContent = getRandomBenchmarkContent();
        console.log('[TypingTest] Got benchmark content:', benchmarkContent.title);
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
        console.log('[TypingTest] Benchmark test initialized');
      } catch (error) {
        console.error('Benchmark content loading error:', error);
        setGenerationError(
          error instanceof Error ? error.message : 'Failed to load benchmark content'
        );
      } finally {
        console.log('[TypingTest] Setting isLoadingContent to false');
        setIsLoadingContent(false);
      }
    } else {
      // Load static content
      try {
        // Check if this is a time trial
        const isTimeTrial = isTimeTrialTest(currentContentStyle);
        let testContent;

        if (isTimeTrial) {
          // Load specific time trial by ID
          testContent = getTestById(currentContentStyle);
          if (!testContent) {
            throw new Error(`Time trial ${currentContentStyle} not found`);
          }
        } else {
          // Load regular content
          // Extract category from content style
          // At this point, we know currentContentStyle is one of: 'random' | 'quote' | 'prose' | 'technical' | 'common'
          // (AI styles and benchmark were handled above, time-trials were handled in if block)
          const category = currentContentStyle === 'random'
            ? undefined
            : (currentContentStyle as 'quote' | 'prose' | 'technical' | 'common');
          testContent = getRandomTest(category);
        }

        // For time trials, use content-length mode
        // For regular content, use user's duration preference
        const testDuration = isTimeTrial ? 'content-length' : defaultDuration;
        const requiredWords = testDuration === 'content-length'
          ? 100
          : calculateRequiredWords(testDuration);
        const words = textToWords(testContent.text, requiredWords);

        // If random was selected, update settings to show what was actually loaded
        if (currentContentStyle === 'random') {
          // Only update if it's a standard category (not time-trial)
          if (testContent.category !== 'time-trial') {
            setDefaultContentStyle(testContent.category);
          }
        }

        initializeTest(
          {
            duration: testDuration,
            testContentId: testContent.id,
            testContentTitle: testContent.title,
            testContentCategory: testContent.category.charAt(0).toUpperCase() + testContent.category.slice(1),
            isTimeTrial: isTimeTrial,
            timeTrialId: isTimeTrial ? currentContentStyle : undefined,
          },
          words
        );
      } catch (error) {
        console.error('Static content loading error:', error);
        setGenerationError(
          error instanceof Error ? error.message : 'Failed to load static content'
        );
      } finally {
        setIsLoadingContent(false);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [llmModel, llmTemperature, customPrompt, customSequences, defaultDuration, resetTest, initializeTest]);

  // Manage autoSave based on authentication status
  useEffect(() => {
    if (!isAuthenticated && autoSave) {
      // Disable autoSave for anonymous users (they can't save results anyway)
      setAutoSave(false);
    }
    // Note: We don't force autoSave to be enabled for authenticated users
    // to respect their preference. They can toggle it manually.
  }, [isAuthenticated, autoSave, setAutoSave]);

  // Initialize test on mount
  useEffect(() => {
    if (status === 'idle' && targetWords.length === 0) {
      console.log('[TypingTest] Initializing test on mount, defaultContentStyle:', defaultContentStyle);
      // Check if benchmark mode is selected
      if (defaultContentStyle === 'benchmark') {
        console.log('[TypingTest] Loading benchmark content on mount');
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
        console.log('[TypingTest] Benchmark test initialized on mount');
      } else {
        const testContent = getRandomTest();
        const requiredWords = defaultDuration === 'content-length'
          ? 100
          : calculateRequiredWords(defaultDuration);
        const words = textToWords(testContent.text, requiredWords);

        // Update settings to reflect the actual content loaded (sync settings with reality)
        // Only update if it's a standard category (not time-trial)
        if (testContent.category !== 'time-trial') {
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
      }
    }
  }, [status, targetWords, initializeTest, defaultDuration, defaultContentStyle, setDefaultContentStyle]);

  // Update test duration when defaultDuration changes (and test is idle)
  useEffect(() => {
    // Skip duration updates for benchmark mode (it has a fixed duration)
    if (isBenchmarkMode) return;
    
    // Skip duration updates for time trial mode (it always uses content-length)
    if (isTimeTrialMode) return;
    
    if (status === 'idle' && targetWords.length > 0 && duration !== defaultDuration) {
      // If using AI content, regenerate with new duration
      if (isAIContentStyle(defaultContentStyle)) {
        handleContentLoad();
      } else {
        // For static content, reinitialize the test with new duration but preserve all metadata
        const currentState = useTestStore.getState();

        initializeTest(
          {
            duration: defaultDuration,
            testContentId: currentState.testContentId || 'regenerated',
            testContentTitle: currentState.testContentTitle || undefined,
            testContentCategory: currentState.testContentCategory || undefined,
            isPractice,
            practiceSequences,
            userLabels: currentState.userLabels,
          },
          targetWords
        );
      }
    }
  }, [defaultDuration, status, targetWords, duration, initializeTest, isPractice, practiceSequences, isBenchmarkMode, isTimeTrialMode, defaultContentStyle, handleContentLoad]);

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

  // Auto-complete test when all words are typed in content-length mode
  useEffect(() => {
    if (isContentLengthMode && status === 'active' && currentWordIndex >= targetWords.length) {
      handleComplete();
    }
  }, [isContentLengthMode, status, currentWordIndex, targetWords.length, handleComplete]);

  // Trigger screen shake on strict mode errors (including time trials which force strict mode)
  useEffect(() => {
    if ((correctionMode === 'strict' || isTimeTrialMode) && strictModeErrors > 0) {
      setShouldShake(true);
      const timer = setTimeout(() => setShouldShake(false), 500);
      return () => clearTimeout(timer);
    }
  }, [strictModeErrors, correctionMode, isTimeTrialMode]);

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
      // Handle Cmd+Enter (Mac) or Ctrl+Enter (Windows) for restart
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        handleRestart();
        return;
      }

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
      if (e.key === 'Tab' || e.key === 'Backspace' || e.key === ' ') {
        e.preventDefault();
      }

      // Prevent Firefox's Quick Find feature (triggered by single quote)
      if (e.key === "'" || e.key === '/') {
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
  }, [status, handleKeyPress, handleBackspace, handleTab, startTest, handleRestart]);

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
        <div className="flex items-center justify-end mb-4">
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <>
                <TestTimer
                  duration={duration}
                  startTime={startTime}
                  endTime={endTime}
                  onComplete={handleComplete}
                  totalWords={targetWords.length}
                  remainingWords={remainingWords}
                  bestTime={isTimeTrialMode ? timeTrialBestTime : undefined}
                />
                <LogoutButton wpmStatusMessage={getWpmTooltipMessage()} />
              </>
            ) : (
              <>
                <TestTimer
                  duration={duration}
                  startTime={startTime}
                  endTime={endTime}
                  onComplete={handleComplete}
                  totalWords={targetWords.length}
                  remainingWords={remainingWords}
                  bestTime={isTimeTrialMode ? timeTrialBestTime : undefined}
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

      {/* Correction Mode Banners */}
      {isTimeTrialMode && (
        <div className="w-full max-w-4xl mb-4">
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-7 h-7 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🏆</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-yellow-400 text-sm">Time Trial Mode</h3>
                <p className="text-xs text-editor-muted">
                  Type the entire passage as fast as possible! Wrong keys are blocked. Mistakes: <span className="font-bold text-yellow-400">{strictModeErrors}</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isTimeTrialMode && correctionMode === 'speed' && (
        <div className="w-full max-w-4xl mb-4">
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-7 h-7 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">⚡</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-orange-400 text-sm">Speed Mode Active</h3>
                <p className="text-xs text-editor-muted">Backspace is disabled - skip mistakes and keep moving!</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isTimeTrialMode && correctionMode === 'strict' && (
        <div className="w-full max-w-4xl mb-4">
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <div className="w-7 h-7 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <span className="text-lg">🎯</span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-red-400 text-sm">Strict Mode Active</h3>
                <p className="text-xs text-editor-muted">
                  Wrong keys are blocked. Mistakes: <span className="font-bold text-red-400">{strictModeErrors}</span>
                  {mistakeThreshold > 0 && <span> / {mistakeThreshold}</span>}
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
          onRestart={handleRestart}
        />
        {generationError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-4">
            <p className="text-sm text-red-400">{generationError}</p>
          </div>
        )}
      </div>

      {/* Test Failure Display - Show when test fails due to too many mistakes */}
      {status === 'failed' && failedReason && (
        <div className="w-full max-w-4xl mb-6 bg-editor-bg/80 border border-red-500/30 rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4 text-red-400">Test Failed</h2>

          {/* Failure message */}
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 mb-6">
            <p className="text-lg text-editor-fg mb-2">{failedReason}</p>
            <p className="text-sm text-editor-muted">
              Mistakes made: <span className="font-bold text-red-400">{strictModeErrors}</span>
            </p>
          </div>

          {/* Messaging based on authentication and auto-save status */}
          {!isAuthenticated && (
            // Not logged in
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-400 mb-2">Want to Track Your Progress?</h3>
              <p className="text-sm text-editor-muted mb-3">
                Create a free account to save your results and see detailed analytics. Track your improvement over time!
              </p>
              <div className="flex gap-3">
                <Link
                  href="/signup"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-center"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="flex-1 px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors text-center"
                >
                  Log In
                </Link>
              </div>
            </div>
          )}

          {/* Retry button */}
          <button
            onClick={resetTest}
            className="w-full px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Quick Results Display - Show inline when results aren't being saved */}
      {status === 'complete' && result && !autoSave && (
        <div className="w-full max-w-4xl mb-6 bg-editor-bg/80 border border-editor-muted rounded-lg p-6">
          <h2 className="text-2xl font-bold mb-4">Test Complete!</h2>

          {/* Results Grid */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-editor-bg/50 rounded-lg p-4">
              <div className="text-sm text-editor-muted mb-1">WPM</div>
              <div className="text-3xl font-bold">{result.wpm}</div>
            </div>
            <div className="bg-editor-bg/50 rounded-lg p-4">
              <div className="text-sm text-editor-muted mb-1">Accuracy</div>
              <div className="text-3xl font-bold">{result.accuracy}%</div>
            </div>
          </div>

          {/* Messaging based on authentication status */}
          {isAuthenticated ? (
            // Logged in user with Save Results disabled
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-blue-400 mb-2">Want to see more in-depth analysis?</h3>
              <p className="text-sm text-editor-muted mb-3">
                Enable &quot;Save Results&quot; in the menu bar to unlock detailed performance metrics, progress tracking, and personalized insights. Your results will be saved to help you improve over time!
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setAutoSave(true);
                    resetTest();
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                >
                  Enable Saving
                </button>
                <button
                  onClick={resetTest}
                  className="flex-1 px-4 py-2 bg-editor-muted/30 hover:bg-editor-muted/50 text-editor-fg rounded-lg font-medium transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          ) : (
            // Not logged in
            <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4 mb-4">
              <h3 className="font-semibold text-green-400 mb-2">Get More From Your Practice!</h3>
              <p className="text-sm text-editor-muted mb-3">
                Create a free account (email only required) to unlock:
              </p>
              <ul className="text-sm text-editor-muted mb-4 space-y-1 list-disc list-inside">
                <li>Detailed performance analytics and progress tracking</li>
                <li>Personalized practice recommendations</li>
                <li>Historical data and trends over time</li>
                <li>Custom test configurations and sequences</li>
              </ul>
              <div className="flex gap-3">
                <Link
                  href="/signup"
                  className="flex-1 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors text-center"
                >
                  Sign Up
                </Link>
                <Link
                  href="/login"
                  className="flex-1 px-4 py-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors text-center"
                >
                  Log In
                </Link>
              </div>
              <button
                onClick={resetTest}
                className="w-full mt-3 px-4 py-2 bg-editor-muted/30 hover:bg-editor-muted/50 text-editor-fg rounded-lg font-medium transition-colors"
              >
                Try Again
              </button>
            </div>
          )}
        </div>
      )}

      {/* Test display */}
      <div className={`w-full max-w-4xl bg-editor-bg border border-editor-muted rounded-lg relative overflow-hidden ${
        isGenerating ? 'opacity-50' : 'opacity-100'
      } transition-opacity ${status === 'complete' || status === 'failed' ? 'hidden' : ''} ${
        shouldShake ? 'animate-shake' : ''
      }`}>
        {isGenerating && (
          <div className="absolute inset-0 flex items-center justify-center bg-editor-bg/80 backdrop-blur-sm z-10">
            <p className="text-editor-muted">Generating new content...</p>
          </div>
        )}
        <div className="h-48 p-8">
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
      {/* Tips Banner */}
      <TipsBanner />

      {/* Footer hints */}
      {status !== 'complete' && status !== 'failed' && (
        <div className="w-full max-w-4xl mt-4 text-sm text-editor-muted text-center">
          {status === 'idle' && !isGenerating && (
            <p>Start typing to begin the test...</p>
          )}
          {status === 'active' && (
            <p>
              Press Tab or Space to skip to the next word.
              {correctionMode === 'speed' && ' Backspace is disabled.'}
              {correctionMode === 'strict' && ' Wrong keys are blocked.'}
            </p>
          )}
        </div>
      )}
      {/* Live WPM Speedometer - Only show when test is active and speedometer is enabled */}
      <div style={{minHeight: showSpeedometer ? '180px' : '0px'}}>
      <AnimatePresence>
        {status === 'active' && showSpeedometer && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="w-full max-w-4xl mt-6 flex justify-center"
          >
            <WPMSpeedometer wpm={liveWPM} averageWPM={wpmScore} />
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
