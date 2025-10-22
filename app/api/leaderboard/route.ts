import { NextResponse } from 'next/server';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';

export interface LeaderboardEntry {
  displayName: string;
  wpmScore: number;
}

/**
 * GET /api/leaderboard
 * Returns top 100 users by WPM score
 */
export async function GET() {
  try {
    const db = getFirebaseDb();
    const usersRef = collection(db, 'users');

    // Query for users with wpmScore, ordered by wpmScore descending, limit 100
    const q = query(
      usersRef,
      where('wpmScore', '!=', null),
      orderBy('wpmScore', 'desc'),
      limit(100)
    );

    const snapshot = await getDocs(q);

    const leaderboard: LeaderboardEntry[] = [];
    snapshot.forEach((doc) => {
      const data = doc.data();
      if (data.wpmScore && data.displayName) {
        leaderboard.push({
          displayName: data.displayName,
          wpmScore: data.wpmScore,
        });
      }
    });

    return NextResponse.json({ leaderboard });
  } catch (error) {
    console.error('Failed to fetch leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 }
    );
  }
}
