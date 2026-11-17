/**
 * Daily streak tracking operations
 */

import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { USERS_COLLECTION } from './shared';
import { getTodayPST } from '@/lib/daily-challenge';

export interface DailyStreakInfo {
  dailyStreak: number;         // Current consecutive days
  bestDailyStreak: number;     // All-time best streak
  lastDailyChallengeDate: string | null;  // YYYY-MM-DD, PST
}

/**
 * Get user's current streak info
 */
export async function getDailyStreakInfo(userId: string): Promise<DailyStreakInfo> {
  const db = getFirebaseDb();
  const userRef = doc(db, USERS_COLLECTION, userId);
  const userDoc = await getDoc(userRef);

  if (!userDoc.exists()) {
    return { dailyStreak: 0, bestDailyStreak: 0, lastDailyChallengeDate: null };
  }

  const data = userDoc.data();
  return {
    dailyStreak: data.dailyStreak ?? 0,
    bestDailyStreak: data.bestDailyStreak ?? 0,
    lastDailyChallengeDate: data.lastDailyChallengeDate ?? null,
  };
}

/**
 * Update streak after completing a daily challenge.
 * Call this when a user completes their FIRST daily challenge attempt for the day.
 *
 * Logic:
 * - If lastDailyChallengeDate is yesterday (PST): increment streak
 * - If lastDailyChallengeDate is today: no-op (already counted)
 * - Otherwise (missed days or first ever): set streak to 1
 * - Update bestDailyStreak if current exceeds it
 */
export async function updateDailyStreak(userId: string): Promise<DailyStreakInfo> {
  const today = getTodayPST();
  const current = await getDailyStreakInfo(userId);

  // Already updated today
  if (current.lastDailyChallengeDate === today) {
    return current;
  }

  const newStreak =
    current.lastDailyChallengeDate && isYesterday(current.lastDailyChallengeDate, today)
      ? current.dailyStreak + 1
      : 1;
  const newBest = Math.max(newStreak, current.bestDailyStreak);
  const updated: DailyStreakInfo = {
    dailyStreak: newStreak,
    bestDailyStreak: newBest,
    lastDailyChallengeDate: today,
  };

  const db = getFirebaseDb();
  const userRef = doc(db, USERS_COLLECTION, userId);
  try {
    await setDoc(userRef, updated, { merge: true });
  } catch (err) {
    console.error('[updateDailyStreak] Failed to persist streak:', err);
    // Still return the computed value so the UI reflects the correct streak
  }

  return updated;
}

/**
 * Check if dateA is the day before dateB (both YYYY-MM-DD strings)
 * @internal
 */
export function isYesterday(dateA: string, dateB: string): boolean {
  const a = new Date(dateA + 'T12:00:00Z'); // Noon to avoid DST issues
  const b = new Date(dateB + 'T12:00:00Z');
  const diffMs = b.getTime() - a.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  return diffDays === 1;
}
