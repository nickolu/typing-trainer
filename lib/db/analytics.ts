/**
 * Aggregate analytics operations
 *
 * The `aggregate*` functions are pure and work on whatever results they are given (for
 * example the stats page's time-filtered set). The `getAggregate*` wrappers fetch a user's
 * history, fill in each result's word list and delegate to them.
 */

import { TestResult } from '@/lib/types';
import { getTestResultsByUser, hydrateTargetWords } from './test-results';
import { calculateSequenceTimings } from '@/lib/test-engine/calculations';
import { analyzeMistakes } from '@/lib/test-engine/mistake-analysis';

type Trend = 'improving' | 'worsening' | 'stable';

/**
 * Results that carry what per-test analysis needs (words and keystrokes), oldest first so
 * a higher index means a more recent test. Results fetched from Firestore arrive newest
 * first, which is the opposite of what the "recent N tests" trend logic below assumes.
 */
function analyzableResults(results: TestResult[]): TestResult[] {
  return results
    .filter(
      (r) =>
        r.targetWords && r.targetWords.length > 0 &&
        r.keystrokeTimings && r.keystrokeTimings.length > 0
    )
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

async function loadResults(userId: string, dateFilter?: { days?: number }): Promise<TestResult[]> {
  let results = await getTestResultsByUser(userId);

  if (dateFilter?.days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - dateFilter.days);
    results = results.filter((r) => r.createdAt >= cutoffDate);
  }

  return hydrateTargetWords(results);
}

/**
 * Slowest 2- and 3-char sequences across the given results.
 * Only sequences that appeared at least 3 times are considered.
 */
export function aggregateSlowSequences(results: TestResult[], limit: number = 5): string[] {
  const sequenceMap = new Map<string, { totalTime: number; count: number }>();

  for (const result of analyzableResults(results)) {
    const twoChar = calculateSequenceTimings(result.keystrokeTimings, result.targetWords!, 2, 50);
    const threeChar = calculateSequenceTimings(result.keystrokeTimings, result.targetWords!, 3, 50);

    // Combine all sequences (whitespace-containing ones are already excluded)
    for (const seq of [...twoChar, ...threeChar]) {
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

  return Array.from(sequenceMap.entries())
    .map(([sequence, data]) => ({
      sequence,
      avgTime: data.totalTime / data.count,
      count: data.count,
    }))
    .filter((item) => item.count >= 3)
    .sort((a, b) => b.avgTime - a.avgTime)
    .slice(0, limit)
    .map((item) => item.sequence);
}

/**
 * Get aggregate slowest sequences across all test history for a user
 */
export async function getAggregateSlowSequences(userId: string, limit: number = 5): Promise<string[]> {
  try {
    return aggregateSlowSequences(await loadResults(userId), limit);
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
  trend: Trend;
}

/**
 * Slowest sequences of a given length across the given results, with a recent-vs-overall trend.
 */
export function aggregateSequenceTimings(
  results: TestResult[],
  sequenceLength: number = 2,
  topN: number = 10
): AggregateSequence[] {
  const sequenceMap = new Map<string, { times: number[]; testIndices: number[] }>();

  analyzableResults(results).forEach((result, index) => {
    const sequences = calculateSequenceTimings(
      result.keystrokeTimings,
      result.targetWords!,
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

  const aggregated: AggregateSequence[] = [];

  sequenceMap.forEach((data, sequence) => {
    const overallAverage = data.times.reduce((sum, t) => sum + t, 0) / data.times.length;

    // Recent average (last 10 tests that had this sequence)
    const recentTestIndices = [...new Set(data.testIndices)]
      .sort((a, b) => b - a) // Most recent first
      .slice(0, 10);

    const recentTimes = data.times.filter((_, i) =>
      recentTestIndices.includes(data.testIndices[i])
    );
    const recentAverage = recentTimes.length > 0
      ? recentTimes.reduce((sum, t) => sum + t, 0) / recentTimes.length
      : overallAverage;

    let trend: Trend = 'stable';
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

  return aggregated
    .filter((item) => item.totalOccurrences >= 3) // Only sequences that appeared at least 3 times
    .sort((a, b) => b.overallAverage - a.overallAverage)
    .slice(0, topN);
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
    return aggregateSequenceTimings(await loadResults(userId, dateFilter), sequenceLength, topN);
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
    trend: Trend;
  }>;
  mistakeSequences: Array<{
    sequence: string;
    totalCount: number;
    recentCount: number;
    trend: Trend;
  }>;
}

/** Recent-vs-overall trend for a mistake that happened `totalCount` times across `testIndices`. */
function mistakeTrend(
  data: { totalCount: number; testIndices: number[] },
  totalTests: number
): { recentCount: number; trend: Trend } {
  // Recent count (last 10 tests)
  const recentTestIndices = [...new Set(data.testIndices)]
    .sort((a, b) => b - a)
    .slice(0, 10);

  const recentCount = data.testIndices.filter((idx) => recentTestIndices.includes(idx)).length;

  // Per-test rates for trend
  const recentTests = Math.min(10, totalTests);
  const overallRate = data.totalCount / totalTests;
  const recentRate = recentCount / recentTests;

  let trend: Trend = 'stable';
  const percentChange = ((recentRate - overallRate) / (overallRate || 1)) * 100;

  if (recentTests >= 3) {
    if (percentChange < -25) {
      trend = 'improving'; // Making this mistake less often
    } else if (percentChange > 25) {
      trend = 'worsening'; // Making this mistake more often
    }
  }

  return { recentCount, trend };
}

/**
 * Most common character substitutions and mistake sequences across the given results.
 */
export function aggregateMistakes(results: TestResult[]): AggregateMistakeData {
  const analyzed = analyzableResults(results);

  const substitutionMap = new Map<string, { totalCount: number; testIndices: number[] }>();
  const mistakeSeqMap = new Map<string, { totalCount: number; testIndices: number[] }>();

  analyzed.forEach((result, index) => {
    const analysis = analyzeMistakes(
      result.keystrokeTimings,
      result.targetWords!,
      result.typedWords
    );

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

  const characterSubstitutions = Array.from(substitutionMap.entries())
    .map(([key, data]) => {
      const [expected, actual] = key.split('→');
      return { expected, actual, totalCount: data.totalCount, ...mistakeTrend(data, analyzed.length) };
    })
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 10);

  const mistakeSequences = Array.from(mistakeSeqMap.entries())
    .map(([sequence, data]) => ({
      sequence,
      totalCount: data.totalCount,
      ...mistakeTrend(data, analyzed.length),
    }))
    .sort((a, b) => b.totalCount - a.totalCount)
    .slice(0, 10);

  return { characterSubstitutions, mistakeSequences };
}

/**
 * Get aggregate mistake patterns across all tests with trend analysis
 */
export async function getAggregateMistakes(
  userId: string,
  dateFilter?: { days?: number }
): Promise<AggregateMistakeData> {
  try {
    return aggregateMistakes(await loadResults(userId, dateFilter));
  } catch (error) {
    console.error('Failed to get aggregate mistakes:', error);
    return { characterSubstitutions: [], mistakeSequences: [] };
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
 * Words whose final typed form differed from the target, counted across the given results.
 * Requires `targetWords` on each result. The stats page uses problemWordsFromResults
 * (lib/test-engine/word-errors), which also counts corrected typos.
 */
export function getProblematicWords(results: TestResult[]): ProblematicWord[] {
  const wordMistakeMap = new Map<string, number>();

  for (const result of results) {
    if (!result.targetWords || !result.typedWords) {
      continue;
    }

    for (let i = 0; i < Math.min(result.targetWords.length, result.typedWords.length); i++) {
      const target = result.targetWords[i];
      const typed = result.typedWords[i];

      if (target && typed && target !== typed && target.length > 0) {
        wordMistakeMap.set(target, (wordMistakeMap.get(target) || 0) + 1);
      }
    }
  }

  return Array.from(wordMistakeMap.entries())
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}
