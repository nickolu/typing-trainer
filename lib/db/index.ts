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

// Export the db instance
export { db };
