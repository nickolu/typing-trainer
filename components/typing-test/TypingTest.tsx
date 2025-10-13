'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTestStore } from '@/store/test-store';
import { TestDisplay } from './TestDisplay';
import { TestTimer } from './TestTimer';
import { getRandomTest, textToWords } from '@/lib/test-content';

export function TypingTest() {
  const router = useRouter();
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
      const words = textToWords(testContent.text);

      initializeTest(
        {
          duration: 30,
          testContentId: testContent.id,
        },
        words
      );
    }
  }, [status, targetWords, initializeTest]);

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
      // Only process if test is active
      if (status !== 'active') {
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
  }, [status, handleKeyPress, handleBackspace, handleTab]);

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
      <div className="w-full max-w-4xl mb-8">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-3xl font-bold">Typing Test</h1>
          <TestTimer
            duration={duration}
            startTime={startTime}
            onComplete={handleComplete}
          />
        </div>
      </div>

      {/* Test display */}
      <div className="w-full max-w-4xl bg-editor-bg border border-editor-muted rounded-lg relative overflow-hidden">
        {/* Start overlay */}
        {status === 'idle' && (
          <div className="absolute inset-0 bg-editor-bg/95 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
            <h2 className="text-2xl font-bold mb-4">Ready to Start?</h2>
            <p className="text-editor-muted mb-6 text-center max-w-md">
              Click the button below to begin your 30-second typing test. Focus on accuracy and speed!
            </p>
            <button
              onClick={startTest}
              className="px-8 py-4 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium text-lg transition-colors"
            >
              Start Test
            </button>
          </div>
        )}

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
      {status === 'active' && (
        <div className="w-full max-w-4xl mt-4 text-sm text-editor-muted text-center">
          <p>Press Tab to skip to the next word</p>
        </div>
      )}
    </div>
  );
}
