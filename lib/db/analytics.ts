/**
 * Aggregate analytics operations
 */

import { TestResult } from '@/lib/types';
import { getTestResultsByUser } from './test-results';

/**
 * Get aggregate slowest sequences across all test history for a user
 */
export async function getAggregateSlowSequences(userId: string, limit: number = 5): Promise<string[]> {
  try {
    const results = await getTestResultsByUser(userId);

    if (results.length === 0) {
      return [];
    }

    // Import calculateSequenceTimings dynamically to avoid circular dependency
    const { calculateSequenceTimings } = await import('@/lib/test-engine/calculations');

    // Aggregate sequence timings across all tests
    const sequenceMap = new Map<string, { totalTime: number; count: number }>();

    for (const result of results) {
      // Skip results without targetWords (will need to fetch from testContents if needed)
      if (!result.targetWords || result.targetWords.length === 0) continue;
      
      // Calculate 2-char and 3-char sequences for this test
      const twoChar = calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 2, 50);
      const threeChar = calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 3, 50);

      // Combine all sequences
      const allSequences = [...twoChar, ...threeChar];

      for (const seq of allSequences) {
        const existing = sequenceMap.get(seq.sequence);
        if (existing) {
          existing.totalTime += seq.averageTime * seq.occurrences;
          existing.count += seq.occurrences;
        } else {
          sequenceMap.set(seq.sequence, {
            totalTime: seq.averageTime * seq.occurrences,
            count: seq.occurrences,
          });
        }
      }
    }

    // Calculate average time for each sequence and sort by slowest
    const aggregated = Array.from(sequenceMap.entries())
      .map(([sequence, data]) => ({
        sequence,
        avgTime: data.totalTime / data.count,
        count: data.count,
      }))
      .filter(item => item.count >= 3) // Only include sequences that appeared at least 3 times
      .sort((a, b) => b.avgTime - a.avgTime)
      .slice(0, limit)
      .map(item => item.sequence);

    return aggregated;
  } catch (error) {
    console.error('Failed to get aggregate slow sequences:', error);
    return [];
  }
}

/**
 * Aggregate sequence timing data with trends
 */
export interface AggregateSequence {
  sequence: string;
  averageTime: number;
  totalOccurrences: number;
  recentAverage: number; // Last 10 tests
  overallAverage: number; // All tests
  trend: 'improving' | 'worsening' | 'stable';
}

/**
 * Get aggregate sequence timings across all tests with trend analysis
 */
export async function getAggregateSequenceTimings(
  userId: string,
  sequenceLength: number = 2,
  topN: number = 10,
  dateFilter?: { days?: number }
): Promise<AggregateSequence[]> {
  try {
    let results = await getTestResultsByUser(userId);

    // Apply date filter if provided
    if (dateFilter?.days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateFilter.days);
      results = results.filter(r => r.createdAt >= cutoffDate);
    }

    if (results.length === 0) {
      return [];
    }

    // Import calculateSequenceTimings dynamically
    const { calculateSequenceTimings } = await import('@/lib/test-engine/calculations');

    // Aggregate sequence timings across all tests
    const sequenceMap = new Map<string, { times: number[]; testIndices: number[] }>();

    results.forEach((result, index) => {
      // Skip results without targetWords
      if (!result.targetWords || result.targetWords.length === 0) return;
      
      const sequences = calculateSequenceTimings(
        result.keystrokeTimings,
        result.targetWords,
        sequenceLength,
        100 // Get more sequences for aggregation
      );

      for (const seq of sequences) {
        if (!sequenceMap.has(seq.sequence)) {
          sequenceMap.set(seq.sequence, { times: [], testIndices: [] });
        }
        const data = sequenceMap.get(seq.sequence)!;
        // Add this sequence's average time, weighted by occurrences
        for (let i = 0; i < seq.occurrences; i++) {
          data.times.push(seq.averageTime);
          data.testIndices.push(index);
        }
      }
    });

    // Calculate aggregates with trends
    const aggregated: AggregateSequence[] = [];

    sequenceMap.forEach((data, sequence) => {
      // Overall average
      const overallAverage = data.times.reduce((sum, t) => sum + t, 0) / data.times.length;

      // Recent average (last 10 tests that had this sequence)
      const recentTestIndices = [...new Set(data.testIndices)]
        .sort((a, b) => b - a) // Sort by most recent first
        .slice(0, 10);

      const recentTimes = data.times.filter((_, i) =>
        recentTestIndices.includes(data.testIndices[i])
      );
      const recentAverage = recentTimes.length > 0
        ? recentTimes.reduce((sum, t) => sum + t, 0) / recentTimes.length
        : overallAverage;

      // Calculate trend
      let trend: 'improving' | 'worsening' | 'stable' = 'stable';
      const percentChange = ((recentAverage - overallAverage) / overallAverage) * 100;

      if (recentTestIndices.length >= 3) { // Need at least 3 tests for trend
        if (percentChange < -10) {
          trend = 'improving'; // Getting faster
        } else if (percentChange > 10) {
          trend = 'worsening'; // Getting slower
        }
      }

      aggregated.push({
        sequence,
        averageTime: Math.round(overallAverage),
        totalOccurrences: data.times.length,
        recentAverage: Math.round(recentAverage),
        overallAverage: Math.round(overallAverage),
        trend,
      });
    });

    // Sort by slowest overall average and take top N
    return aggregated
      .filter(item => item.totalOccurrences >= 3) // Only sequences that appeared at least 3 times
      .sort((a, b) => b.overallAverage - a.overallAverage)
      .slice(0, topN);
  } catch (error) {
    console.error('Failed to get aggregate sequence timings:', error);
    return [];
  }
}

/**
 * Aggregate mistake data with trends
 */
export interface AggregateMistakeData {
  characterSubstitutions: Array<{
    expected: string;
    actual: string;
    totalCount: number;
    recentCount: number;
    trend: 'improving' | 'worsening' | 'stable';
  }>;
  mistakeSequences: Array<{
    sequence: string;
    totalCount: number;
    recentCount: number;
    trend: 'improving' | 'worsening' | 'stable';
  }>;
}

/**
 * Get aggregate mistake patterns across all tests with trend analysis
 */
export async function getAggregateMistakes(
  userId: string,
  dateFilter?: { days?: number }
): Promise<AggregateMistakeData> {
  try {
    let results = await getTestResultsByUser(userId);

    // Apply date filter if provided
    if (dateFilter?.days) {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - dateFilter.days);
      results = results.filter(r => r.createdAt >= cutoffDate);
    }

    if (results.length === 0) {
      return {
        characterSubstitutions: [],
        mistakeSequences: [],
      };
    }

    // Import analyzeMistakes dynamically
    const { analyzeMistakes } = await import('@/lib/test-engine/mistake-analysis');

    // Track substitutions across all tests
    const substitutionMap = new Map<string, { totalCount: number; testIndices: number[] }>();

    // Track mistake sequences across all tests
    const mistakeSeqMap = new Map<string, { totalCount: number; testIndices: number[] }>();

    results.forEach((result, index) => {
      // Only analyze tests with keystroke data and targetWords
      if (!result.keystrokeTimings || result.keystrokeTimings.length === 0 ||
          !result.targetWords || result.targetWords.length === 0) {
        return;
      }

      const analysis = analyzeMistakes(
        result.keystrokeTimings,
        result.targetWords,
        result.typedWords
      );

      // Aggregate character substitutions
      for (const sub of analysis.characterSubstitutions) {
        const key = `${sub.expected}→${sub.actual}`;
        if (!substitutionMap.has(key)) {
          substitutionMap.set(key, { totalCount: 0, testIndices: [] });
        }
        const data = substitutionMap.get(key)!;
        data.totalCount += sub.count;
        for (let i = 0; i < sub.count; i++) {
          data.testIndices.push(index);
        }
      }

      // Aggregate mistake sequences
      for (const seq of analysis.mistakeSequences) {
        if (!mistakeSeqMap.has(seq.sequence)) {
          mistakeSeqMap.set(seq.sequence, { totalCount: 0, testIndices: [] });
        }
        const data = mistakeSeqMap.get(seq.sequence)!;
        data.totalCount += seq.frequency;
        for (let i = 0; i < seq.frequency; i++) {
          data.testIndices.push(index);
        }
      }
    });

    // Calculate trends for character substitutions
    const characterSubstitutions = Array.from(substitutionMap.entries())
      .map(([key, data]) => {
        const [expected, actual] = key.split('→');

        // Recent count (last 10 tests)
        const recentTestIndices = [...new Set(data.testIndices)]
          .sort((a, b) => b - a)
          .slice(0, 10);

        const recentCount = data.testIndices.filter(idx =>
          recentTestIndices.includes(idx)
        ).length;

        // Calculate per-test averages for trend
        const totalTests = results.length;
        const recentTests = Math.min(10, totalTests);
        const overallRate = data.totalCount / totalTests;
        const recentRate = recentCount / recentTests;

        let trend: 'improving' | 'worsening' | 'stable' = 'stable';
        const percentChange = ((recentRate - overallRate) / (overallRate || 1)) * 100;

        if (recentTests >= 3) {
          if (percentChange < -25) {
            trend = 'improving'; // Making this mistake less often
          } else if (percentChange > 25) {
            trend = 'worsening'; // Making this mistake more often
          }
        }

        return {
          expected,
          actual,
          totalCount: data.totalCount,
          recentCount,
          trend,
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 10);

    // Calculate trends for mistake sequences
    const mistakeSequences = Array.from(mistakeSeqMap.entries())
      .map(([sequence, data]) => {
        // Recent count (last 10 tests)
        const recentTestIndices = [...new Set(data.testIndices)]
          .sort((a, b) => b - a)
          .slice(0, 10);

        const recentCount = data.testIndices.filter(idx =>
          recentTestIndices.includes(idx)
        ).length;

        // Calculate per-test averages for trend
        const totalTests = results.length;
        const recentTests = Math.min(10, totalTests);
        const overallRate = data.totalCount / totalTests;
        const recentRate = recentCount / recentTests;

        let trend: 'improving' | 'worsening' | 'stable' = 'stable';
        const percentChange = ((recentRate - overallRate) / (overallRate || 1)) * 100;

        if (recentTests >= 3) {
          if (percentChange < -25) {
            trend = 'improving';
          } else if (percentChange > 25) {
            trend = 'worsening';
          }
        }

        return {
          sequence,
          totalCount: data.totalCount,
          recentCount,
          trend,
        };
      })
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 10);

    return {
      characterSubstitutions,
      mistakeSequences,
    };
  } catch (error) {
    console.error('Failed to get aggregate mistakes:', error);
    return {
      characterSubstitutions: [],
      mistakeSequences: [],
    };
  }
}

/**
 * Aggregate problematic word data
 */
export interface ProblematicWord {
  word: string;
  count: number;
}

/**
 * Get aggregate problematic words from a set of test results
 * Returns words that were mistyped 2 or more times
 */
export function getProblematicWords(results: TestResult[]): ProblematicWord[] {
  const wordMistakeMap = new Map<string, number>();

  for (const result of results) {
    // Only analyze tests with target and typed words
    if (!result.targetWords || !result.typedWords) {
      continue;
    }

    // Compare target words with typed words
    for (let i = 0; i < Math.min(result.targetWords.length, result.typedWords.length); i++) {
      const target = result.targetWords[i];
      const typed = result.typedWords[i];

      // If the words don't match and both are non-empty, count as a mistake
      if (target && typed && target !== typed && target.length > 0) {
        wordMistakeMap.set(target, (wordMistakeMap.get(target) || 0) + 1);
      }
    }
  }

  // Convert to array and filter for count >= 1, then sort by frequency
  return Array.from(wordMistakeMap.entries())
    .filter(([_, count]) => count >= 1)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}
