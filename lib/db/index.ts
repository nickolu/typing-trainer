import { db } from './schema';
import { TestResult } from '@/lib/types';

// Save a test result
export async function saveTestResult(result: TestResult): Promise<string> {
  try {
    await db.testResults.add(result);
    return result.id;
  } catch (error) {
    console.error('Failed to save test result:', error);
    throw error;
  }
}

// Get a test result by ID
export async function getTestResult(id: string): Promise<TestResult | undefined> {
  try {
    return await db.testResults.get(id);
  } catch (error) {
    console.error('Failed to get test result:', error);
    throw error;
  }
}

// Get all test results, sorted by date (newest first)
export async function getAllTestResults(): Promise<TestResult[]> {
  try {
    return await db.testResults.orderBy('createdAt').reverse().toArray();
  } catch (error) {
    console.error('Failed to get all test results:', error);
    throw error;
  }
}

// Get test results for a specific user (for future multi-user support)
export async function getTestResultsByUser(userId: string): Promise<TestResult[]> {
  try {
    return await db.testResults
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('createdAt');
  } catch (error) {
    console.error('Failed to get test results by user:', error);
    throw error;
  }
}

// Delete a test result
export async function deleteTestResult(id: string): Promise<void> {
  try {
    await db.testResults.delete(id);
  } catch (error) {
    console.error('Failed to delete test result:', error);
    throw error;
  }
}

// Clear all test results
export async function clearAllTestResults(): Promise<void> {
  try {
    await db.testResults.clear();
  } catch (error) {
    console.error('Failed to clear test results:', error);
    throw error;
  }
}

// Get aggregate slowest sequences across all test history
export async function getAggregateSlowSequences(limit: number = 5): Promise<string[]> {
  try {
    const results = await getAllTestResults();

    if (results.length === 0) {
      return [];
    }

    // Import calculateSequenceTimings dynamically to avoid circular dependency
    const { calculateSequenceTimings } = await import('@/lib/test-engine/calculations');

    // Aggregate sequence timings across all tests
    const sequenceMap = new Map<string, { totalTime: number; count: number }>();

    for (const result of results) {
      // Calculate 2-char and 3-char sequences for this test
      const twoChar = calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 2, 50);
      const threeChar = calculateSequenceTimings(result.keystrokeTimings, result.targetWords, 3, 50);

      // Combine all sequences
      const allSequences = [...twoChar, ...threeChar];

      for (const seq of allSequences) {
        const existing = sequenceMap.get(seq.sequence);
        if (existing) {
          existing.totalTime += seq.avgTime * seq.occurrences;
          existing.count += seq.occurrences;
        } else {
          sequenceMap.set(seq.sequence, {
            totalTime: seq.avgTime * seq.occurrences,
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
  sequenceLength: number = 2,
  topN: number = 10,
  dateFilter?: { days?: number }
): Promise<AggregateSequence[]> {
  try {
    let results = await getAllTestResults();

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
  dateFilter?: { days?: number }
): Promise<AggregateMistakeData> {
  try {
    let results = await getAllTestResults();

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
      // Only analyze tests with keystroke data
      if (!result.keystrokeTimings || result.keystrokeTimings.length === 0) {
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

// Export the db instance
export { db };
