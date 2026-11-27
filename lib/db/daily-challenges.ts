/**
 * Daily challenge operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { getUserProfile } from './users';

export const DAILY_CHALLENGE_SCORES_COLLECTION = 'dailyChallengeScores';

export type DailyChallengeMode = 'passage' | 'weakness' | 'daily';

export interface DailyLeaderboardEntry {
  rank: number;
  userId: string;
  displayName: string;
  wpm: number;
  accuracy: number;
  completionTime: number;
  isCurrentUser: boolean;
}

export interface DailyChallengeResult {
  date: string;       // YYYY-MM-DD
  wpm: number;
  accuracy: number;
  completionTime: number;
  testResultId: string;
}

/**
 * Build the Firestore document ID for a daily challenge score.
 * For 'passage' mode we use the legacy format `${userId}_${date}` for backward compat.
 * For all other modes we use `${userId}_${date}_${mode}`.
 */
function buildDocId(userId: string, date: string, mode: DailyChallengeMode): string {
  if (mode === 'passage') {
    return `${userId}_${date}`;
  }
  return `${userId}_${date}_${mode}`;
}

/**
 * Save daily challenge score (first attempt only)
 * Document ID: `${userId}_${date}` for passage (legacy), `${userId}_${date}_${mode}` for others
 * Only saves if user hasn't already submitted for this date+mode
 */
export async function saveDailyChallengeScore(
  userId: string,
  date: string,
  wpm: number,
  accuracy: number,
  completionTime: number,
  testResultId: string,
  mode: DailyChallengeMode = 'passage'
): Promise<{ isFirstAttempt: boolean }> {
  // Check if already submitted
  const existing = await getDailyChallengeScore(userId, date, mode);
  if (existing) return { isFirstAttempt: false };

  const db = getFirebaseDb();
  const docId = buildDocId(userId, date, mode);
  const profile = await getUserProfile(userId);
  const displayName = profile?.displayName || 'Anonymous';

  await setDoc(doc(db, DAILY_CHALLENGE_SCORES_COLLECTION, docId), {
    userId,
    date,
    wpm,
    accuracy,
    completionTime,
    displayName,
    testResultId,
    mode,
    createdAt: Timestamp.now(),
  });

  return { isFirstAttempt: true };
}

/**
 * Get user's score for a specific date and mode.
 * Returns null if user has not submitted a score for this date+mode.
 */
export async function getDailyChallengeScore(
  userId: string,
  date: string,
  mode: DailyChallengeMode = 'passage'
): Promise<DailyChallengeResult | null> {
  try {
    const db = getFirebaseDb();
    const docId = buildDocId(userId, date, mode);
    const scoreRef = doc(db, DAILY_CHALLENGE_SCORES_COLLECTION, docId);
    const scoreDoc = await getDoc(scoreRef);

    if (!scoreDoc.exists()) {
      return null;
    }

    const data = scoreDoc.data();
    return {
      date: data.date,
      wpm: data.wpm,
      accuracy: data.accuracy,
      completionTime: data.completionTime,
      testResultId: data.testResultId,
    };
  } catch (error) {
    console.error('Failed to get daily challenge score:', error);
    return null;
  }
}

/**
 * Get leaderboard for a specific date and mode.
 * Sorted by WPM desc, accuracy desc as tiebreaker; equal WPM shares a rank.
 *
 * Reads every score for the date with a single equality filter, which Firestore serves
 * from its automatic single-field index, then filters by mode and sorts in memory. This
 * deliberately avoids server-side orderBy/limit: those need a composite index to be
 * deployed, and when it isn't the query fails and the board looks empty.
 *
 * For 'passage' mode: includes legacy docs (no mode field) and docs with mode='passage'.
 * For other modes: only docs with that mode.
 *
 * Throws if the read fails so callers can tell "no scores yet" from "couldn't load".
 */
export async function getDailyLeaderboard(
  date: string,
  maxResults: number = 100,
  currentUserId?: string,
  mode: DailyChallengeMode = 'passage'
): Promise<DailyLeaderboardEntry[]> {
  const db = getFirebaseDb();
  const scoresRef = collection(db, DAILY_CHALLENGE_SCORES_COLLECTION);
  const snapshot = await getDocs(query(scoresRef, where('date', '==', date)));

  type RawEntry = Omit<DailyLeaderboardEntry, 'rank' | 'isCurrentUser'>;
  const rawEntries: RawEntry[] = [];

  snapshot.forEach((docSnap) => {
    const data = docSnap.data();
    const docMode: string | undefined = data.mode;
    const matchesMode =
      mode === 'passage' ? docMode === undefined || docMode === 'passage' : docMode === mode;
    if (!matchesMode) return;
    rawEntries.push({
      userId: data.userId,
      displayName: data.displayName || 'Anonymous',
      wpm: data.wpm || 0,
      accuracy: data.accuracy || 0,
      completionTime: data.completionTime || 0,
    });
  });

  // Sort by wpm desc, then accuracy desc as tiebreaker
  rawEntries.sort((a, b) => {
    if (b.wpm !== a.wpm) return b.wpm - a.wpm;
    return b.accuracy - a.accuracy;
  });

  const trimmed = rawEntries.slice(0, maxResults);

  // Assign ranks with tie handling
  const entries: DailyLeaderboardEntry[] = [];
  let currentRank = 1;
  let previousWpm: number | null = null;
  let sameRankCount = 0;

  trimmed.forEach((entry) => {
    if (previousWpm !== null && entry.wpm === previousWpm) {
      sameRankCount++;
    } else if (previousWpm !== null) {
      currentRank += sameRankCount + 1;
      sameRankCount = 0;
    }

    entries.push({
      ...entry,
      rank: currentRank,
      isCurrentUser: currentUserId === entry.userId,
    });

    previousWpm = entry.wpm;
  });

  return entries;
}

/**
 * Check if user has completed today's daily challenge for a given mode.
 */
export async function hasCompletedDailyChallenge(
  userId: string,
  date: string,
  mode: DailyChallengeMode = 'passage'
): Promise<boolean> {
  const score = await getDailyChallengeScore(userId, date, mode);
  return score !== null;
}
