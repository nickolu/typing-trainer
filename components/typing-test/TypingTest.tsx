'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import { TestDisplay } from './TestDisplay';
import { TestTimer } from './TestTimer';
import { SettingsToolbar } from '@/components/settings/SettingsToolbar';
import { getRandomTest, textToWords, calculateRequiredWords } from '@/lib/test-content';

export function TypingTest() {
  const router = useRouter();
  const { defaultDuration } = useSettingsStore();
  const {
    status,
    duration,
    targetWords,
    completedWords,
    currentInput,
    currentWordIndex,
    startTime,
    result,
    initializeTest,
    startTest,
    handleKeyPress,
    handleBackspace,
    handleTab,
    completeTest,
  } = useTestStore();

  // Initialize test on mount
  useEffect(() => {
    if (status === 'idle' && targetWords.length === 0) {
      const testContent = getRandomTest();
      const requiredWords = calculateRequiredWords(defaultDuration);
      const words = textToWords(testContent.text, requiredWords);

      initializeTest(
        {
          duration: defaultDuration,
          testContentId: testContent.id,
        },
        words
      );
    }
  }, [status, targetWords, initializeTest, defaultDuration]);

  // Handle test completion
  const handleComplete = useCallback(async () => {
    try {
      const result = await completeTest();
      // Navigate to results page
      router.push(`/results/${result.id}`);
    } catch (error) {
      console.error('Failed to complete test:', error);
    }
  }, [completeTest, router]);

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

  // Show loading state
  if (targetWords.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-muted">Loading test...</p>
      </div>
    );
  }

  // Show test UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      {/* Header with timer */}
      <div className="w-full max-w-4xl mb-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Typing Test</h1>
          <div className="flex items-center gap-4">
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
          </div>
        </div>
      </div>

      {/* Settings Toolbar */}
      <div className="w-full max-w-4xl">
        <SettingsToolbar />
      </div>

      {/* Test display */}
      <div className="w-full max-w-4xl bg-editor-bg border border-editor-muted rounded-lg relative overflow-hidden">
        <div className="h-48 overflow-y-auto p-8 scroll-smooth">
          <TestDisplay
            targetWords={targetWords}
            completedWords={completedWords}
            currentInput={currentInput}
            currentWordIndex={currentWordIndex}
          />
        </div>
      </div>

      {/* Footer hints */}
      <div className="w-full max-w-4xl mt-4 text-sm text-editor-muted text-center">
        {status === 'idle' && (
          <p>Start typing to begin the test...</p>
        )}
        {status === 'active' && (
          <p>Press Tab to skip to the next word</p>
        )}
      </div>
    </div>
  );
}
