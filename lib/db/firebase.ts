import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { TestResult } from '@/lib/types';

// Collection names
const USERS_COLLECTION = 'users';
const TEST_RESULTS_COLLECTION = 'testResults';

// User profile type (stored in Firestore)
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
}

/**
 * Create a new user profile in Firestore
 * Called after Firebase Auth user is created
 */
export async function createUserProfile(
  userId: string,
  email: string,
  displayName: string
): Promise<UserProfile> {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);

    const userProfile: UserProfile = {
      id: userId,
      email,
      displayName,
      createdAt: new Date(),
    };

    await setDoc(userRef, {
      email,
      displayName,
      createdAt: Timestamp.now(),
    });

    return userProfile;
  } catch (error) {
    console.error('Failed to create user profile:', error);
    throw error;
  }
}

/**
 * Get user profile by ID
 */
export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      return null;
    }

    const data = userDoc.data();
    return {
      id: userDoc.id,
      email: data.email,
      displayName: data.displayName,
      createdAt: convertTimestampToDate(data.createdAt),
    };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
}

/**
 * Helper function to recursively remove undefined values from an object
 * Firestore doesn't accept undefined values, even in nested objects/arrays
 */
function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }

  // Handle objects (including Date, Timestamp, etc.)
  if (typeof obj === 'object') {
    // Don't process Date or Timestamp objects
    if (obj instanceof Date || obj.constructor?.name === 'Timestamp') {
      return obj;
    }

    const cleaned: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned;
  }

  // Return primitives as-is
  return obj;
}

/**
 * Helper function to safely convert Firestore Timestamp to Date
 * Handles different formats: Timestamp object, plain object with seconds/nanoseconds, Date, or string
 */
function convertTimestampToDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date();
  }

  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Firestore Timestamp object with toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Plain object with seconds (Firestore Timestamp serialized)
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }

  // String timestamp
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  // Number timestamp (milliseconds)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  // Fallback
  console.warn('Unknown timestamp format:', timestamp);
  return new Date();
}

/**
 * Save a test result
 */
export async function saveTestResult(result: TestResult, userId: string): Promise<string> {
  try {
    // Check Firebase Auth state
    const { getFirebaseAuth } = await import('@/lib/firebase-config');
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    console.log('[Firebase] Current Auth State:', {
      authUserId: currentUser?.uid,
      authEmail: currentUser?.email,
      passedUserId: userId,
      idsMatch: currentUser?.uid === userId,
      isAuthenticated: !!currentUser,
    });

    if (!currentUser) {
      console.error('[Firebase] No authenticated user found!');
      throw new Error('Not authenticated - please log in again');
    }

    if (currentUser.uid !== userId) {
      console.error('[Firebase] User ID mismatch!', {
        authUid: currentUser.uid,
        passedUserId: userId,
      });
      throw new Error('User ID mismatch - please log out and log in again');
    }

    const db = getFirebaseDb();
    const resultRef = doc(db, TEST_RESULTS_COLLECTION, result.id);

    // Convert TestResult to Firestore-compatible format
    // Remove undefined fields as Firestore doesn't accept them
    const firestoreData = removeUndefinedFields({
      ...result,
      userId, // Always include userId
      createdAt: Timestamp.fromDate(result.createdAt),
    });

    // Debug logging
    console.log('[Firebase] Attempting to save test result:', {
      id: result.id,
      userId,
      hasKeystrokeTimings: !!result.keystrokeTimings,
      keystrokeCount: result.keystrokeTimings?.length || 0,
    });

    await setDoc(resultRef, firestoreData);

    console.log('[Firebase] Successfully saved test result:', result.id);
    return result.id;
  } catch (error) {
    console.error('[Firebase] Failed to save test result:', error);
    console.error('[Firebase] UserID being used:', userId);
    throw error;
  }
}

/**
 * Get a test result by ID
 */
export async function getTestResult(id: string): Promise<TestResult | undefined> {
  try {
    const db = getFirebaseDb();
    const resultRef = doc(db, TEST_RESULTS_COLLECTION, id);
    const resultDoc = await getDoc(resultRef);

    if (!resultDoc.exists()) {
      return undefined;
    }

    const data = resultDoc.data();
    return {
      ...data,
      createdAt: convertTimestampToDate(data.createdAt),
    } as TestResult;
  } catch (error) {
    console.error('Failed to get test result:', error);
    throw error;
  }
}

/**
 * Get all test results for a specific user (sorted by date, newest first)
 * Excludes DELETED tests by default
 */
export async function getTestResultsByUser(userId: string): Promise<TestResult[]> {
  try {
    const db = getFirebaseDb();
    const resultsRef = collection(db, TEST_RESULTS_COLLECTION);
    
    // Query for all tests by user, then filter out DELETED tests in memory
    // We can't use 'in' with null in Firestore, so we query all and filter
    const q = query(
      resultsRef,
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);
    const results: TestResult[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status || 'COMPLETE'; // Default to COMPLETE for legacy tests
      
      // Only include tests that are not DELETED
      if (status !== 'DELETED') {
        results.push({
          ...data,
          createdAt: convertTimestampToDate(data.createdAt),
          status,
        } as TestResult);
      }
    });

    return results;
  } catch (error) {
    console.error('Failed to get test results by user:', error);
    throw error;
  }
}

/**
 * Delete a test result by setting status to DELETED (with user verification)
 */
export async function deleteTestResult(id: string, userId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const resultRef = doc(db, TEST_RESULTS_COLLECTION, id);

    // Verify ownership before deleting
    const resultDoc = await getDoc(resultRef);
    if (!resultDoc.exists()) {
      throw new Error('Test result not found');
    }

    const data = resultDoc.data();
    if (data.userId !== userId) {
      throw new Error('Unauthorized: You can only delete your own test results');
    }

    // Update status to DELETED using updateDoc (more efficient than setDoc with merge)
    await updateDoc(resultRef, { status: 'DELETED' });
  } catch (error) {
    console.error('Failed to delete test result:', error);
    throw error;
  }
}

/**
 * Restore a deleted test result by setting status back to COMPLETE
 */
export async function restoreTestResult(id: string, userId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const resultRef = doc(db, TEST_RESULTS_COLLECTION, id);

    // Verify ownership before restoring
    const resultDoc = await getDoc(resultRef);
    if (!resultDoc.exists()) {
      throw new Error('Test result not found');
    }

    const data = resultDoc.data();
    if (data.userId !== userId) {
      throw new Error('Unauthorized: You can only restore your own test results');
    }

    // Update status to COMPLETE using updateDoc
    await updateDoc(resultRef, { status: 'COMPLETE' });
  } catch (error) {
    console.error('Failed to restore test result:', error);
    throw error;
  }
}

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
