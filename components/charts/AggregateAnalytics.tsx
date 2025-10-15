'use client';

import { useMemo, useState, useEffect } from 'react';
import { TestResult } from '@/lib/types';
import {
  getAggregateSequenceTimings,
  getAggregateMistakes,
  AggregateSequence,
  AggregateMistakeData,
} from '@/lib/db';
import { AggregateSequenceChart } from './AggregateSequenceChart';
import { AggregateMistakeChart } from './AggregateMistakeChart';
import { Loader2 } from 'lucide-react';

interface AggregateAnalyticsProps {
  results: TestResult[];
}

export function AggregateAnalytics({ results }: AggregateAnalyticsProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [twoCharSequences, setTwoCharSequences] = useState<AggregateSequence[]>([]);
  const [threeCharSequences, setThreeCharSequences] = useState<AggregateSequence[]>([]);
  const [mistakeData, setMistakeData] = useState<AggregateMistakeData>({
    characterSubstitutions: [],
    mistakeSequences: [],
  });

  // Load aggregate data when results change
  useEffect(() => {
    const loadAggregateData = async () => {
      if (results.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        // Load aggregate sequence timings in parallel
        const [twoChar, threeChar, mistakes] = await Promise.all([
          getAggregateSequenceTimings(2, 10),
          getAggregateSequenceTimings(3, 10),
          getAggregateMistakes(),
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
  }, [results]);

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

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div>
        <h2 className="text-2xl font-bold mb-2">Aggregate Analytics</h2>
        <p className="text-editor-muted">
          Your typing patterns and common mistakes across all {results.length} test
          {results.length === 1 ? '' : 's'}
        </p>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
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
    </div>
  );
}
