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
  orderBy,
  limit as firestoreLimit,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { getUserProfile } from './users';

export const DAILY_CHALLENGE_SCORES_COLLECTION = 'dailyChallengeScores';

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
 * Save daily challenge score (first attempt only)
 * Document ID: `${userId}_${date}`
 * Only saves if user hasn't already submitted for this date
 */
export async function saveDailyChallengeScore(
  userId: string,
  date: string,
  wpm: number,
  accuracy: number,
  completionTime: number,
  testResultId: string
): Promise<{ isFirstAttempt: boolean }> {
  // Check if already submitted
  const existing = await getDailyChallengeScore(userId, date);
  if (existing) return { isFirstAttempt: false };

  const db = getFirebaseDb();
  const docId = `${userId}_${date}`;
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
    createdAt: Timestamp.now(),
  });

  return { isFirstAttempt: true };
}

/**
 * Get user's score for a specific date
 * Returns null if user has not submitted a score for this date
 */
export async function getDailyChallengeScore(
  userId: string,
  date: string
): Promise<DailyChallengeResult | null> {
  try {
    const db = getFirebaseDb();
    const docId = `${userId}_${date}`;
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
 * Get leaderboard for a specific date
 * Only includes entries with accuracy >= 95
 * Sorted by WPM desc, accuracy desc as tiebreaker
 * Limit 100
 */
export async function getDailyLeaderboard(
  date: string,
  maxResults: number = 100,
  currentUserId?: string
): Promise<DailyLeaderboardEntry[]> {
  try {
    const db = getFirebaseDb();
    const scoresRef = collection(db, DAILY_CHALLENGE_SCORES_COLLECTION);
    const q = query(
      scoresRef,
      where('date', '==', date),
      where('accuracy', '>=', 95),
      orderBy('accuracy', 'asc'),
      orderBy('wpm', 'desc'),
      firestoreLimit(maxResults)
    );

    const snapshot = await getDocs(q);

    // Collect all docs, then sort by wpm desc (accuracy desc is secondary)
    // Firestore can sort by wpm desc when we also filter/sort on accuracy,
    // but to keep ranking simple and correct we sort client-side after fetching.
    const rawEntries: Array<{
      userId: string;
      displayName: string;
      wpm: number;
      accuracy: number;
      completionTime: number;
    }> = [];

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
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

    // Assign ranks with tie handling
    const entries: DailyLeaderboardEntry[] = [];
    let currentRank = 1;
    let previousWpm: number | null = null;
    let sameRankCount = 0;

    rawEntries.forEach((entry) => {
      if (previousWpm !== null && entry.wpm === previousWpm) {
        sameRankCount++;
      } else if (previousWpm !== null) {
        currentRank += sameRankCount + 1;
        sameRankCount = 0;
      }

      entries.push({
        rank: currentRank,
        userId: entry.userId,
        displayName: entry.displayName,
        wpm: entry.wpm,
        accuracy: entry.accuracy,
        completionTime: entry.completionTime,
        isCurrentUser: currentUserId === entry.userId,
      });

      previousWpm = entry.wpm;
    });

    return entries;
  } catch (error) {
    console.error('Failed to get daily leaderboard:', error);
    return [];
  }
}

/**
 * Check if user has completed today's daily challenge
 */
export async function hasCompletedDailyChallenge(
  userId: string,
  date: string
): Promise<boolean> {
  const score = await getDailyChallengeScore(userId, date);
  return score !== null;
}
