'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { TestResult } from '@/lib/types';
import {
  getAggregateSequenceTimings,
  getAggregateMistakes,
  AggregateSequence,
  AggregateMistakeData,
} from '@/lib/db/firebase';
import { useUserStore } from '@/store/user-store';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import { AggregateSequenceChart } from './AggregateSequenceChart';
import { AggregateMistakeChart } from './AggregateMistakeChart';
import { AggregateTargetedPracticeModal } from './AggregateTargetedPracticeModal';
import { Loader2, Target, BrainCircuit } from 'lucide-react';
import { getRandomTest, textToWords, calculateRequiredWords } from '@/lib/test-content';

interface AggregateAnalyticsProps {
  results: TestResult[];
}

export function AggregateAnalytics({ results }: AggregateAnalyticsProps) {
  const router = useRouter();
  const { currentUserId } = useUserStore();
  const { defaultDuration, llmModel, llmTemperature } = useSettingsStore();
  const { initializeTest, resetTest } = useTestStore();
  const [isLoading, setIsLoading] = useState(true);
  const [twoCharSequences, setTwoCharSequences] = useState<AggregateSequence[]>([]);
  const [threeCharSequences, setThreeCharSequences] = useState<AggregateSequence[]>([]);
  const [mistakeData, setMistakeData] = useState<AggregateMistakeData>({
    characterSubstitutions: [],
    mistakeSequences: [],
  });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGeneratingPractice, setIsGeneratingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);

  // Load aggregate data when results change
  useEffect(() => {
    const loadAggregateData = async () => {
      if (results.length === 0 || !currentUserId) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Load aggregate sequence timings in parallel
        const [twoChar, threeChar, mistakes] = await Promise.all([
          getAggregateSequenceTimings(currentUserId, 2, 10),
          getAggregateSequenceTimings(currentUserId, 3, 10),
          getAggregateMistakes(currentUserId),
        ]);

        setTwoCharSequences(twoChar);
        setThreeCharSequences(threeChar);
        setMistakeData(mistakes);
      } catch (error) {
        console.error('Failed to load aggregate analytics:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadAggregateData();
  }, [results, currentUserId]);

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
          <p className="text-editor-muted">Analyzing your typing patterns across all tests...</p>
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
          Complete a few more tests to see aggregate analytics across your typing history!
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
            Your typing patterns and common mistakes across all {results.length} test
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
