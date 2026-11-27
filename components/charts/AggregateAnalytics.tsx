'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { TestResult } from '@/lib/types';
import { aggregateSequenceTimings, aggregateMistakes } from '@/lib/db';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import { AggregateSequenceChart } from './AggregateSequenceChart';
import { AggregateMistakeChart } from './AggregateMistakeChart';
import { AggregateTargetedPracticeModal } from './AggregateTargetedPracticeModal';
import { Loader2, Target, BrainCircuit } from 'lucide-react';
import { getRandomTest, textToWords, calculateRequiredWords } from '@/lib/test-content';

interface AggregateAnalyticsProps {
  /** Results to analyze — the stats page passes its time- and label-filtered set. */
  results: TestResult[];
  /** True while the results' word lists are still being resolved. */
  isLoading?: boolean;
}

export function AggregateAnalytics({ results, isLoading = false }: AggregateAnalyticsProps) {
  const router = useRouter();
  const { defaultDuration, llmModel, llmTemperature } = useSettingsStore();
  const { initializeTest, resetTest } = useTestStore();
  // Computed from the results we're given (already filtered and hydrated by the stats
  // page), so this section reflects the selected time range.
  const twoCharSequences = useMemo(() => aggregateSequenceTimings(results, 2, 10), [results]);
  const threeCharSequences = useMemo(() => aggregateSequenceTimings(results, 3, 10), [results]);
  const mistakeData = useMemo(() => aggregateMistakes(results), [results]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  // Don't show anything if no results
  if (results.length === 0) {
    return null;
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-12">
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="w-8 h-8 animate-spin text-editor-accent" />
          <p className="text-editor-muted">Analyzing your typing patterns...</p>
        </div>
      </div>
    );
  }

  const hasSequenceData = twoCharSequences.length > 0 || threeCharSequences.length > 0;
  const hasMistakeData =
    mistakeData.characterSubstitutions.length > 0 ||
    mistakeData.mistakeSequences.length > 0;

  // Don't show section if no data at all
  if (!hasSequenceData && !hasMistakeData) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
        <p className="text-editor-muted">
          No aggregate analytics for this range yet. Complete a few more tests to see your patterns here.
        </p>
      </div>
    );
  }

  const handleGenerateTargetedPractice = async (selectedSequences: string[]) => {
    setPracticeError(null);
    setIsGeneratingPractice(true);
    setIsModalOpen(false); // Close modal

    try {
      if (selectedSequences.length === 0) {
        setPracticeError('Please select at least one sequence to practice');
        setIsGeneratingPractice(false);
        return;
      }

      const requiredWords = defaultDuration === 'content-length'
        ? 100
        : calculateRequiredWords(defaultDuration);

      // Use regular practice endpoint for sequences
      const response = await fetch('/api/generate-practice', {
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

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate practice content');
      }

      const practiceResult = await response.json();
      const words = textToWords(practiceResult.text, requiredWords);

      // Initialize test with practice metadata
      resetTest();
      initializeTest(
        {
          duration: defaultDuration,
          testContentId: 'ai-targeted-practice',
          isPractice: true,
          practiceSequences: selectedSequences,
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
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold mb-1">Aggregate Analytics</h2>
          <p className="text-editor-muted text-sm">
            Your typing patterns and common mistakes across these {results.length} test
            {results.length === 1 ? '' : 's'}
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          disabled={isGeneratingPractice}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center gap-2 text-sm"
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
      </div>

      {/* Practice Error */}
      {practiceError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <p className="text-sm text-red-400">{practiceError}</p>
        </div>
      )}

      {/* Generating Practice Loading State */}
      {isGeneratingPractice && (
        <div className="bg-purple-600/10 border border-purple-600/30 rounded-lg p-4">
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

      {/* Charts Grid */}
      <div className="space-y-4">
        {/* Sequence Analysis */}
        {hasSequenceData && (
          <AggregateSequenceChart
            twoCharSequences={twoCharSequences}
            threeCharSequences={threeCharSequences}
          />
        )}

        {/* Mistake Analysis */}
        {hasMistakeData && <AggregateMistakeChart mistakeData={mistakeData} />}
      </div>

      {/* Targeted Practice Modal */}
      <AggregateTargetedPracticeModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        twoCharSequences={twoCharSequences}
        threeCharSequences={threeCharSequences}
        mistakeData={mistakeData}
        onGeneratePractice={handleGenerateTargetedPractice}
      />
    </div>
  );
}
