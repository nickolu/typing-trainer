'use client';

import { useRouter } from 'next/navigation';
import { TestResult } from '@/lib/types';
import { StatsCard } from './StatsCard';
import { Zap, Target, Check, X } from 'lucide-react';
import { useTestStore } from '@/store/test-store';
import { getRandomTest, textToWords } from '@/lib/test-content';

interface ResultsViewProps {
  result: TestResult;
}

export function ResultsView({ result }: ResultsViewProps) {
  const router = useRouter();
  const { initializeTest, resetTest } = useTestStore();

  const handleTryAgain = () => {
    // Reset the store and go back to home
    resetTest();
    router.push('/');
  };

  const handleNewTest = () => {
    // Initialize a new test and go to home
    const testContent = getRandomTest();
    const words = textToWords(testContent.text);

    initializeTest(
      {
        duration: 30,
        testContentId: testContent.id,
      },
      words
    );

    router.push('/');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <h1 className="text-4xl font-bold text-center mb-8">Test Complete!</h1>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <StatsCard
            label="Words Per Minute"
            value={result.wpm}
            icon={<Zap className="w-8 h-8" />}
          />
          <StatsCard
            label="Accuracy"
            value={`${result.accuracy}%`}
            icon={<Target className="w-8 h-8" />}
          />
        </div>

        {/* Detailed Stats */}
        <div className="bg-editor-bg border border-editor-muted rounded-lg p-6 mb-8">
          <h2 className="text-xl font-bold mb-4">Detailed Statistics</h2>
          <div className="space-y-3 text-editor-fg">
            <div className="flex justify-between items-center">
              <span className="text-editor-muted">Words Typed:</span>
              <span className="font-mono font-bold">{result.totalTypedWords}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-editor-muted flex items-center gap-2">
                <Check className="w-4 h-4 text-editor-success" />
                Correct Words:
              </span>
              <span className="font-mono font-bold text-editor-success">
                {result.correctWordCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-editor-muted flex items-center gap-2">
                <X className="w-4 h-4 text-editor-error" />
                Mistakes:
              </span>
              <span className="font-mono font-bold text-editor-error">
                {result.incorrectWordCount}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-editor-muted">Test Duration:</span>
              <span className="font-mono font-bold">{result.duration}s</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={handleTryAgain}
            className="px-6 py-3 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
          >
            Try Same Test Again
          </button>
          <button
            onClick={handleNewTest}
            className="px-6 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            New Test
          </button>
        </div>
      </div>
    </div>
  );
}
