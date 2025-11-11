/**
 * Time trial operations
 */

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
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import {
  TIME_TRIAL_BEST_TIMES_COLLECTION,
  USERS_COLLECTION,
} from './shared';
import { getUserProfile } from './users';

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
): Promise<{ isNewBest: boolean; previousBest: number | null }> {
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
      return { isNewBest: true, previousBest: null };
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
      return { isNewBest: true, previousBest: currentBest };
    }

    console.log('[Firebase] Time not better than current best for', trialId, ':', completionTime, 'vs', currentBest);
    return { isNewBest: false, previousBest: currentBest };
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
 * Reset all time trial records for a user
 * This is used when time trial content is updated
 */
export async function resetUserTimeTrialRecords(userId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const bestTimesRef = collection(db, TIME_TRIAL_BEST_TIMES_COLLECTION);
    const q = query(bestTimesRef, where('userId', '==', userId));

    const snapshot = await getDocs(q);

    // Delete all time trial best times for this user
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);

    console.log(`Reset ${snapshot.docs.length} time trial records for user ${userId}`);
  } catch (error) {
    console.error('Failed to reset user time trial records:', error);
    throw error;
  }
}

/**
 * Migrate user's time trial data to new content version
 * Resets all time trial records and marks user as migrated
 */
export async function migrateUserTimeTrialContent(userId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);

    // Check if already migrated
    const profile = await getUserProfile(userId);
    if (profile?.timeTrialContentMigrated) {
      console.log('User already migrated, skipping');
      return;
    }

    // Reset all time trial records
    await resetUserTimeTrialRecords(userId);

    // Mark as migrated
    await updateDoc(userRef, {
      timeTrialContentMigrated: true,
    });

    console.log(`Migrated time trial content for user ${userId}`);
  } catch (error) {
    console.error('Failed to migrate user time trial content:', error);
    throw error;
  }
}

/**
 * Mark that user has seen the time trial reset notice
 */
export async function markTimeTrialResetNoticeSeen(userId: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const userRef = doc(db, USERS_COLLECTION, userId);

    await updateDoc(userRef, {
      hasSeenTimeTrialResetNotice: true,
    });

    console.log(`Marked time trial reset notice as seen for user ${userId}`);
  } catch (error) {
    console.error('Failed to mark time trial reset notice as seen:', error);
    throw error;
  }
}
