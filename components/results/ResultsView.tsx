'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { TestResult } from '@/lib/types';
import { StatsCard } from './StatsCard';
import { SequenceAnalysis } from './SequenceAnalysis';
import { MistakeAnalysis } from './MistakeAnalysis';
import { TargetedPracticeModal } from './TargetedPracticeModal';
import { Zap, Target, Check, X, BrainCircuit } from 'lucide-react';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import { getRandomTest, textToWords, calculateRequiredWords } from '@/lib/test-content';
import { calculateSequenceTimings } from '@/lib/test-engine/calculations';
import { analyzeMistakes, getMistakeSequencesForPractice } from '@/lib/test-engine/mistake-analysis';

interface ResultsViewProps {
  result: TestResult;
}

export function ResultsView({ result }: ResultsViewProps) {
  const router = useRouter();
  const { defaultDuration, llmModel, llmTemperature } = useSettingsStore();
  const { initializeTest, resetTest, retryLastTest } = useTestStore();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  // Calculate sequence timings
  const twoCharSequences = useMemo(
    () => calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 2, 10),
    [result.keystrokeTimings, result.targetWords]
  );

  const threeCharSequences = useMemo(
    () => calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 3, 10),
    [result.keystrokeTimings, result.targetWords]
  );

  const handleTryAgain = () => {
    // Retry the same test configuration and go back to home
    retryLastTest();
    router.push('/');
  };

  const handleNewTest = () => {
    // Initialize a new test and go to home
    const testContent = getRandomTest();
    const requiredWords = defaultDuration === 'content-length'
      ? 100
      : calculateRequiredWords(defaultDuration);
    const words = textToWords(testContent.text, requiredWords);

    initializeTest(
      {
        duration: defaultDuration,
        testContentId: testContent.id,
      },
      words
    );

    router.push('/');
  };

  const handleGenerateTargetedPractice = async (selectedSequences: string[], selectedWords: string[]) => {
    setPracticeError(null);
    setIsGeneratingPractice(true);
    setIsModalOpen(false); // Close modal

    try {
      // Combine sequences and words for practice
      if (selectedSequences.length === 0 && selectedWords.length === 0) {
        setPracticeError('Please select at least one item to practice');
        setIsGeneratingPractice(false);
        return;
      }

      const requiredWords = defaultDuration === 'content-length'
        ? 100
        : calculateRequiredWords(defaultDuration);

      // Determine which API endpoint to use based on selections
      // If we have words, use the mistake practice endpoint, otherwise use regular practice
      const hasMistakeData = selectedWords.length > 0;

      let response;
      if (hasMistakeData) {
        // Use mistake practice endpoint which can handle both sequences and words
        response = await fetch('/api/generate-mistake-practice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sequences: selectedSequences,
            mistakeData: {
              commonWords: selectedWords.map(word => ({ target: word, typed: '', count: 1 })),
            },
            options: {
              model: llmModel,
              temperature: llmTemperature,
              minWords: requiredWords,
            },
          }),
        });
      } else {
        // Use regular practice endpoint for sequences only
        response = await fetch('/api/generate-practice', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sequences: selectedSequences,
            options: {
              model: llmModel,
              temperature: llmTemperature,
              minWords: requiredWords,
            },
          }),
        });
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate practice content');
      }

      const practiceResult = await response.json();
      const words = textToWords(practiceResult.text, requiredWords);

      // Initialize test with practice metadata
      // Combine sequences and words - treat them all as practice targets
      const allPracticeTargets = [...selectedSequences, ...selectedWords];

      resetTest();
      initializeTest(
        {
          duration: defaultDuration,
          testContentId: 'ai-targeted-practice',
          isPractice: true,
          practiceSequences: allPracticeTargets,
        },
        words
      );

      router.push('/');
    } catch (error) {
      console.error('Practice generation error:', error);
      setPracticeError(
        error instanceof Error ? error.message : 'Failed to generate practice content'
      );
    } finally {
      setIsGeneratingPractice(false);
    }
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

        {/* Sequence Analysis */}
        <div className="mb-8">
          <SequenceAnalysis
            twoCharSequences={twoCharSequences}
            threeCharSequences={threeCharSequences}
          />
        </div>

        {/* Mistake Analysis */}
        <div className="mb-8">
          <MistakeAnalysis result={result} />
        </div>

        {/* Practice Error */}
        {practiceError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-8">
            <p className="text-sm text-red-400">{practiceError}</p>
          </div>
        )}

        {/* Generating Practice Loading State */}
        {isGeneratingPractice && (
          <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4 mb-8">
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0">
                <BrainCircuit className="w-6 h-6 text-purple-400 animate-spin" />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-purple-400 mb-1">Generating Targeted Practice...</h3>
                <p className="text-sm text-editor-muted">
                  Creating custom content for your selected sequences. This may take a few moments.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-4 justify-center flex-wrap">
          <button
            onClick={() => setIsModalOpen(true)}
            disabled={isGeneratingPractice}
            className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2"
          >
            {isGeneratingPractice ? (
              <>
                <BrainCircuit className="w-5 h-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Target className="w-5 h-5" />
                Generate Targeted Practice
              </>
            )}
          </button>
          <Link
            href="/stats"
            className="px-6 py-3 bg-editor-muted/50 hover:bg-editor-muted/70 text-editor-fg rounded-lg font-medium transition-colors"
          >
            View Stats
          </Link>
          <button
            onClick={handleTryAgain}
            className="px-6 py-3 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
          >
            Try Again
          </button>
          <button
            onClick={handleNewTest}
            className="px-6 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
          >
            New Test
          </button>
        </div>
      </div>

      {/* Targeted Practice Modal */}
      <TargetedPracticeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        result={result}
        onGeneratePractice={handleGenerateTargetedPractice}
      />
    </div>
  );
}
