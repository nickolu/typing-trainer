/**
 * User profile operations
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { USERS_COLLECTION, convertTimestampToDate } from './shared';

// User profile type (stored in Firestore)
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  createdAt: Date;
  wpmScore?: number | null; // Official WPM score from benchmark tests
  wpmLastUpdated?: Date | null; // When the WPM score was last updated
  wpmScoreResetDate?: Date | null; // When the score will reset (6 months from last update)
  timeTrialContentMigrated?: boolean; // Whether time trial content has been migrated (v1 -> v2)
  hasSeenTimeTrialResetNotice?: boolean; // Whether user has seen the time trial reset notice
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
      timeTrialContentMigrated: data.timeTrialContentMigrated ?? false,
      hasSeenTimeTrialResetNotice: data.hasSeenTimeTrialResetNotice ?? false,
    };
  } catch (error) {
    console.error('Failed to get user profile:', error);
    throw error;
  }
}

/**
 * Update a user's official WPM score from a benchmark test
 * Rules:
 * - First test: Set score directly
 * - Score reset (after 6 months): Set score directly
 * - Too soon (<30 days): Return existing score without updating
 * - After 30+ days: Average old and new score
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
