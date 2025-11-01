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
import { TestResult, StoredTestContent } from '@/lib/types';

// Collection names
const USERS_COLLECTION = 'users';
const TEST_RESULTS_COLLECTION = 'testResults';
const TEST_CONTENTS_COLLECTION = 'testContents';
const USER_LABELS_COLLECTION = 'userLabels';
const TIME_TRIAL_BEST_TIMES_COLLECTION = 'timeTrialBestTimes';

// User profile type (stored in Firestore)
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  wpmScore?: number | null; // Official WPM score from benchmark tests
  wpmLastUpdated?: Date | null; // When the WPM score was last updated
  wpmScoreResetDate?: Date | null; // When the score will reset (6 months from last update)
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
      wpmScore: data.wpmScore ?? null,
      wpmLastUpdated: data.wpmLastUpdated ? convertTimestampToDate(data.wpmLastUpdated) : null,
      wpmScoreResetDate: data.wpmScoreResetDate ? convertTimestampToDate(data.wpmScoreResetDate) : null,
    };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
}

/**
 * Generate a hash from text content for deduplication
 * Simple hash function for content comparison
 */
function generateContentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
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
 * Save test content to Firestore
 */
export async function saveTestContent(
  content: Omit<StoredTestContent, 'id' | 'createdAt' | 'contentHash'> & { id: string },
  userId: string
): Promise<string> {
  try {
    const { getFirebaseAuth } = await import('@/lib/firebase-config');
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Not authenticated - please log in again');
    }

    const db = getFirebaseDb();
    const contentRef = doc(db, TEST_CONTENTS_COLLECTION, content.id);

    const contentHash = generateContentHash(content.text);

    const firestoreData = {
      id: content.id,
      userId,
      text: content.text,
      words: content.words,
      sourceId: content.sourceId || null,
      contentHash,
      createdAt: Timestamp.now(),
    };

    await setDoc(contentRef, firestoreData);

    console.log('[Firebase] Successfully saved test content:', content.id);
    return content.id;
  } catch (error) {
    console.error('[Firebase] Failed to save test content:', error);
    throw error;
  }
}

/**
 * Get test content by ID
 */
export async function getTestContent(id: string): Promise<StoredTestContent | null> {
  try {
    const db = getFirebaseDb();
    const contentRef = doc(db, TEST_CONTENTS_COLLECTION, id);
    const contentDoc = await getDoc(contentRef);

    if (!contentDoc.exists()) {
      return null;
    }

    const data = contentDoc.data();
    return {
      id: data.id,
      userId: data.userId,
      text: data.text,
      words: data.words,
      sourceId: data.sourceId || undefined,
      contentHash: data.contentHash,
      createdAt: convertTimestampToDate(data.createdAt),
    };
  } catch (error) {
    console.error('[Firebase] Failed to get test content:', error);
    return null;
  }
}

/**
 * Find existing test content by sourceId and userId
 * Used to avoid duplicating static test content
 */
export async function findTestContentBySource(
  userId: string,
  sourceId: string
): Promise<StoredTestContent | null> {
  try {
    const db = getFirebaseDb();
    const contentsRef = collection(db, TEST_CONTENTS_COLLECTION);

    const q = query(
      contentsRef,
      where('userId', '==', userId),
      where('sourceId', '==', sourceId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Return the most recent one
    const data = snapshot.docs[0].data();
    return {
      id: data.id,
      userId: data.userId,
      text: data.text,
      words: data.words,
      sourceId: data.sourceId || undefined,
      contentHash: data.contentHash,
      createdAt: convertTimestampToDate(data.createdAt),
    };
  } catch (error) {
    console.error('[Firebase] Failed to find test content by source:', error);
    return null;
  }
}

/**
 * Find existing test content by contentHash and userId
 * Used to detect duplicate AI-generated content and maintain trial history
 */
export async function findTestContentByHash(
  userId: string,
  contentHash: string
): Promise<StoredTestContent | null> {
  try {
    const db = getFirebaseDb();
    const contentsRef = collection(db, TEST_CONTENTS_COLLECTION);

    const q = query(
      contentsRef,
      where('userId', '==', userId),
      where('contentHash', '==', contentHash),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Return the most recent one
    const data = snapshot.docs[0].data();
    return {
      id: data.id,
      userId: data.userId,
      text: data.text,
      words: data.words,
      sourceId: data.sourceId || undefined,
      contentHash: data.contentHash,
      createdAt: convertTimestampToDate(data.createdAt),
    };
  } catch (error) {
    console.error('[Firebase] Failed to find test content by hash:', error);
    return null;
  }
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
 * Update labels for an existing test result
 */
export async function updateTestResultLabels(
  resultId: string,
  userId: string,
  labels: string[]
): Promise<void> {
  try {
    const { getFirebaseAuth } = await import('@/lib/firebase-config');
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Not authenticated or user ID mismatch');
    }

    const db = getFirebaseDb();
    const resultRef = doc(db, TEST_RESULTS_COLLECTION, resultId);

    await updateDoc(resultRef, {
      labels: labels,
    });

    console.log('[Firebase] Successfully updated labels for test result:', resultId);
  } catch (error) {
    console.error('[Firebase] Failed to update test result labels:', error);
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
 * Get all test results for a specific user and content ID (sorted by date, oldest first)
 * Used to show the history of attempts on the same content
 */
export async function getTestResultsByContent(
  userId: string,
  testContentId: string
): Promise<TestResult[]> {
  try {
    const db = getFirebaseDb();
    const resultsRef = collection(db, TEST_RESULTS_COLLECTION);

    const q = query(
      resultsRef,
      where('userId', '==', userId),
      where('testContentId', '==', testContentId),
      orderBy('createdAt', 'asc')
    );

    const snapshot = await getDocs(q);
    const results: TestResult[] = [];

    snapshot.forEach((doc) => {
      const data = doc.data();
      const status = data.status || 'COMPLETE';

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
    console.error('Failed to get test results by content:', error);
    throw error;
  }
}

/**
 * Get the next iteration number for a specific content
 * Returns 1 if this is the first attempt
 */
export async function getNextIterationNumber(
  userId: string,
  testContentId: string
): Promise<number> {
  try {
    const results = await getTestResultsByContent(userId, testContentId);

    // Filter out practice tests as they shouldn't count toward iterations
    const nonPracticeResults = results.filter(r => !r.isPractice);

    // Return the next iteration number
    return nonPracticeResults.length + 1;
  } catch (error) {
    console.error('Failed to get next iteration number:', error);
    return 1; // Default to 1 on error
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

  // Convert to array and filter for count >= 2, then sort by frequency
  return Array.from(wordMistakeMap.entries())
    .filter(([_, count]) => count >= 2)
    .map(([word, count]) => ({ word, count }))
    .sort((a, b) => b.count - a.count);
}

/**
 * User label management
 */
export interface UserLabels {
  userId: string;
  labels: string[]; // Array of user-created labels (max 20)
  updatedAt: Date;
}

/**
 * Get all labels for a user
 */
export async function getUserLabels(userId: string): Promise<string[]> {
  try {
    const db = getFirebaseDb();
    const labelsRef = doc(db, USER_LABELS_COLLECTION, userId);
    const labelsDoc = await getDoc(labelsRef);

    if (!labelsDoc.exists()) {
      return [];
    }

    const data = labelsDoc.data();
    return data.labels || [];
  } catch (error) {
    console.error('Failed to get user labels:', error);
    return [];
  }
}

/**
 * Add a new label for a user (max 20 labels)
 */
export async function addUserLabel(userId: string, label: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const labelsRef = doc(db, USER_LABELS_COLLECTION, userId);
    const labelsDoc = await getDoc(labelsRef);

    let labels: string[] = [];
    if (labelsDoc.exists()) {
      labels = labelsDoc.data().labels || [];
    }

    // Check if label already exists
    if (labels.includes(label)) {
      return false; // Label already exists
    }

    // Check if user has reached the limit
    if (labels.length >= 20) {
      throw new Error('Maximum of 20 labels allowed. Please delete some labels to add new ones.');
    }

    // Add the new label
    labels.push(label);

    await setDoc(labelsRef, {
      userId,
      labels,
      updatedAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('Failed to add user label:', error);
    throw error;
  }
}

/**
 * Delete a label for a user
 */
export async function deleteUserLabel(userId: string, label: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const labelsRef = doc(db, USER_LABELS_COLLECTION, userId);
    const labelsDoc = await getDoc(labelsRef);

    if (!labelsDoc.exists()) {
      return;
    }

    let labels: string[] = labelsDoc.data().labels || [];
    labels = labels.filter(l => l !== label);

    await setDoc(labelsRef, {
      userId,
      labels,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to delete user label:', error);
    throw error;
  }
}

/**
 * Time trial best time record
 */
export interface TimeTrialBestTime {
  userId: string;
  trialId: string; // e.g., 'time-trial-001'
  bestTime: number; // in seconds
  testResultId: string; // Reference to the test result that set this best time
  updatedAt: Date;
}

/**
 * Get best time for a specific time trial
 * Returns null if no best time exists
 */
export async function getTimeTrialBestTime(
  userId: string,
  trialId: string
): Promise<number | null> {
  try {
    const db = getFirebaseDb();
    // Document ID is userId_trialId for easy lookup
    const docId = `${userId}_${trialId}`;
    const bestTimeRef = doc(db, TIME_TRIAL_BEST_TIMES_COLLECTION, docId);
    const bestTimeDoc = await getDoc(bestTimeRef);

    if (!bestTimeDoc.exists()) {
      return null;
    }

    const data = bestTimeDoc.data();
    return data.bestTime;
  } catch (error) {
    console.error('Failed to get time trial best time:', error);
    return null;
  }
}

/**
 * Update best time for a specific time trial
 * Returns true if new best time was set, false if current time wasn't better
 */
export async function updateTimeTrialBestTime(
  userId: string,
  trialId: string,
  completionTime: number,
  testResultId: string
): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const docId = `${userId}_${trialId}`;
    const bestTimeRef = doc(db, TIME_TRIAL_BEST_TIMES_COLLECTION, docId);
    const bestTimeDoc = await getDoc(bestTimeRef);

    // If no existing best time, set this as the best
    if (!bestTimeDoc.exists()) {
      await setDoc(bestTimeRef, {
        userId,
        trialId,
        bestTime: completionTime,
        testResultId,
        updatedAt: Timestamp.now(),
      });
      console.log('[Firebase] Set first best time for', trialId, ':', completionTime);
      return true;
    }

    // Check if this is a new best time (lower is better)
    const currentBest = bestTimeDoc.data().bestTime;
    if (completionTime < currentBest) {
      await updateDoc(bestTimeRef, {
        bestTime: completionTime,
        testResultId,
        updatedAt: Timestamp.now(),
      });
      console.log('[Firebase] New best time for', trialId, ':', completionTime, '(previous:', currentBest, ')');
      return true;
    }

    console.log('[Firebase] Time not better than current best for', trialId, ':', completionTime, 'vs', currentBest);
    return false;
  } catch (error) {
    console.error('Failed to update time trial best time:', error);
    throw error;
  }
}

/**
 * Get all best times for a user
 * Returns a map of trialId -> bestTime
 */
export async function getAllTimeTrialBestTimes(
  userId: string
): Promise<Record<string, number>> {
  try {
    const db = getFirebaseDb();
    const bestTimesRef = collection(db, TIME_TRIAL_BEST_TIMES_COLLECTION);
    const q = query(bestTimesRef, where('userId', '==', userId));

    const snapshot = await getDocs(q);
    const bestTimes: Record<string, number> = {};

    snapshot.forEach((doc) => {
      const data = doc.data();
      bestTimes[data.trialId] = data.bestTime;
    });

    return bestTimes;
  } catch (error) {
    console.error('Failed to get all time trial best times:', error);
    return {};
  }
}

/**
 * Calculate and update user's WPM score based on a benchmark test result
 * Returns the new WPM score
 */
export async function updateUserWPMScore(
  userId: string,
  benchmarkWPM: number
): Promise<number> {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      throw new Error('User profile not found');
    }

    const profile = userDoc.data();
    const now = new Date();
    const sixMonthsFromNow = new Date(now);
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    let newScore: number;
    let lastUpdated = profile.wpmLastUpdated
      ? convertTimestampToDate(profile.wpmLastUpdated)
      : null;
    const resetDate = profile.wpmScoreResetDate
      ? convertTimestampToDate(profile.wpmScoreResetDate)
      : null;

    // Check if score should be reset (past reset date)
    const shouldReset = resetDate && now >= resetDate;

    // Check if user has no score or score should be reset
    if (!profile.wpmScore || shouldReset) {
      // First test or reset: use the benchmark score as-is
      newScore = Math.round(benchmarkWPM);
      await updateDoc(userRef, {
        wpmScore: newScore,
        wpmLastUpdated: Timestamp.fromDate(now),
        wpmScoreResetDate: Timestamp.fromDate(sixMonthsFromNow),
      });
      return newScore;
    }

    // Check if less than 30 days since last update
    const daysSinceUpdate = lastUpdated
      ? Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    if (daysSinceUpdate < 30) {
      // Too soon to update, return current score
      return profile.wpmScore;
    }

    // Calculate average of old and new score
    newScore = Math.round((profile.wpmScore + benchmarkWPM) / 2);

    await updateDoc(userRef, {
      wpmScore: newScore,
      wpmLastUpdated: Timestamp.fromDate(now),
      wpmScoreResetDate: Timestamp.fromDate(sixMonthsFromNow),
    });

    return newScore;
  } catch (error) {
    console.error('Failed to update user WPM score:', error);
    throw error;
  }
}

/**
 * Get information about when a user can next update their WPM score
 */
export async function getWPMScoreStatus(userId: string): Promise<{
  canUpdate: boolean;
  hasScore: boolean;
  currentScore: number | null;
  daysUntilUpdate: number | null;
  daysUntilReset: number | null;
  updateAllowedDate: Date | null;
  resetDate: Date | null;
}> {
  try {
    const profile = await getUserProfile(userId);

    if (!profile) {
      return {
        canUpdate: true,
        hasScore: false,
        currentScore: null,
        daysUntilUpdate: null,
        daysUntilReset: null,
        updateAllowedDate: null,
        resetDate: null,
      };
    }

    const now = new Date();
    const resetDate = profile.wpmScoreResetDate;
    const lastUpdated = profile.wpmLastUpdated;

    // Check if score should be reset
    const shouldReset = resetDate && now >= resetDate;

    // If no score or past reset date, can take new test
    if (!profile.wpmScore || shouldReset) {
      return {
        canUpdate: true,
        hasScore: false,
        currentScore: null,
        daysUntilUpdate: 0,
        daysUntilReset: null,
        updateAllowedDate: now,
        resetDate: resetDate ? new Date(resetDate) : null,
      };
    }

    // Calculate days since last update
    const daysSinceUpdate = lastUpdated
      ? Math.floor((now.getTime() - lastUpdated.getTime()) / (1000 * 60 * 60 * 24))
      : Infinity;

    const canUpdate = daysSinceUpdate >= 30;
    const daysUntilUpdate = canUpdate ? 0 : 30 - daysSinceUpdate;

    const updateAllowedDate = lastUpdated
      ? new Date(lastUpdated.getTime() + 30 * 24 * 60 * 60 * 1000)
      : now;

    const daysUntilReset = resetDate
      ? Math.floor((resetDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    return {
      canUpdate,
      hasScore: true,
      currentScore: profile.wpmScore ?? null,
      daysUntilUpdate,
      daysUntilReset,
      updateAllowedDate,
      resetDate: resetDate ? new Date(resetDate) : null,
    };
  } catch (error) {
    console.error('Failed to get WPM score status:', error);
    throw error;
  }
}
