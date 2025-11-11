/**
 * Test results CRUD operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { TestResult } from '@/lib/types';
import {
  TEST_RESULTS_COLLECTION,
  convertTimestampToDate,
  removeUndefinedFields,
} from './shared';

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
