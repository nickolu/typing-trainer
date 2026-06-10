/**
 * Weekly winner calculation for Daily Passage challenge.
 */

import {
  collection,
  getDocs,
  query,
  where,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { DAILY_CHALLENGE_SCORES_COLLECTION } from './daily-challenges';
import { getTodayPST } from '@/lib/daily-challenge';

export interface WeeklyWinner {
  userId: string;
  displayName: string;
  averageWpm: number;
  averageAccuracy: number;
  daysPlayed: number;
  weekStart: string; // YYYY-MM-DD (Monday)
  weekEnd: string;   // YYYY-MM-DD (Sunday)
}

/**
 * Get the Monday and Sunday date strings for last week.
 * Accepts an optional todayOverride (YYYY-MM-DD) for testing.
 */
export function getLastWeekRange(todayOverride?: string): { weekStart: string; weekEnd: string } {
  const todayStr = todayOverride ?? getTodayPST();
  const today = new Date(todayStr + 'T12:00:00Z');
  const dayOfWeek = today.getUTCDay(); // 0=Sun, 1=Mon, ...

  // Days since last Monday (Mon=0 offset, Sun=6 offset)
  const daysToThisMonday = (dayOfWeek + 6) % 7;
  const thisMonday = new Date(today);
  thisMonday.setUTCDate(today.getUTCDate() - daysToThisMonday);

  const lastMonday = new Date(thisMonday);
  lastMonday.setUTCDate(thisMonday.getUTCDate() - 7);

  const lastSunday = new Date(lastMonday);
  lastSunday.setUTCDate(lastMonday.getUTCDate() + 6);

  const format = (d: Date) => d.toISOString().slice(0, 10);

  return {
    weekStart: format(lastMonday),
    weekEnd: format(lastSunday),
  };
}

/**
 * Get the weekly winner for last week's Daily Passage challenge.
 * Winner = highest average WPM among users who:
 *   - Played ≥3 days that week (passage mode only)
 *   - Had ≥95% accuracy on each qualifying day
 * Returns null if no one qualifies.
 */
export async function getWeeklyWinner(): Promise<WeeklyWinner | null> {
  try {
    const { weekStart, weekEnd } = getLastWeekRange();

    const db = getFirebaseDb();
    const scoresRef = collection(db, DAILY_CHALLENGE_SCORES_COLLECTION);
    const q = query(
      scoresRef,
      where('date', '>=', weekStart),
      where('date', '<=', weekEnd)
    );

    const snapshot = await getDocs(q);

    // Group by userId, only passage mode scores
    const userScores = new Map<string, Array<{
      wpm: number;
      accuracy: number;
      date: string;
      displayName: string;
    }>>();

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docMode: string | undefined = data.mode;

      // Only include passage mode: mode field is 'passage' or absent (legacy docs)
      if (docMode !== undefined && docMode !== 'passage' && docMode !== 'daily') return;

      const userId = data.userId;
      if (!userScores.has(userId)) {
        userScores.set(userId, []);
      }
      userScores.get(userId)!.push({
        wpm: data.wpm,
        accuracy: data.accuracy,
        date: data.date,
        displayName: data.displayName || 'Anonymous',
      });
    });

    // Find winner: highest average WPM with ≥3 qualifying days (accuracy ≥95%)
    let winner: WeeklyWinner | null = null;
    let bestAvgWpm = 0;

    for (const [userId, scores] of userScores) {
      const qualifyingScores = scores.filter(s => s.accuracy >= 95);

      if (qualifyingScores.length < 3) continue;

      const avgWpm =
        qualifyingScores.reduce((sum, s) => sum + s.wpm, 0) / qualifyingScores.length;

      if (avgWpm > bestAvgWpm) {
        bestAvgWpm = avgWpm;
        winner = {
          userId,
          displayName: qualifyingScores[0].displayName,
          averageWpm: Math.round(avgWpm),
          averageAccuracy: Math.round(
            qualifyingScores.reduce((sum, s) => sum + s.accuracy, 0) / qualifyingScores.length
          ),
          daysPlayed: qualifyingScores.length,
          weekStart,
          weekEnd,
        };
      }
    }

    return winner;
  } catch (error) {
    console.error('Failed to get weekly winner:', error);
    return null;
  }
}
