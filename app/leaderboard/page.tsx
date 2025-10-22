'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';

interface LeaderboardEntry {
  displayName: string;
  wpmScore: number;
}

export default function LeaderboardPage() {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
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

      const leaderboardData: LeaderboardEntry[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        if (data.wpmScore && data.displayName) {
          leaderboardData.push({
            displayName: data.displayName,
            wpmScore: data.wpmScore,
          });
        }
      });

      setLeaderboard(leaderboardData);
    } catch (err) {
      console.error('Failed to load leaderboard:', err);
      setError('Failed to load leaderboard. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading...</div>
          <div className="text-editor-muted">Fetching leaderboard</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2 text-red-500">Error</div>
          <div className="text-editor-muted mb-4">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">Global Leaderboard</h1>
          </div>
          <p className="text-editor-muted">
            Top 100 typists by highest WPM score
          </p>
        </div>

        {/* Leaderboard Table */}
        {leaderboard.length === 0 ? (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-12 text-center">
            <p className="text-xl text-editor-muted mb-4">
              No scores yet!
            </p>
            <p className="text-editor-muted">
              Be the first to complete a benchmark test and appear on the leaderboard.
            </p>
          </div>
        ) : (
          <div className="bg-editor-bg border border-editor-muted rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-editor-muted/20 border-b border-editor-muted">
                  <th className="px-6 py-4 text-left text-sm font-semibold text-editor-fg">
                    Rank
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-semibold text-editor-fg">
                    Name
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-semibold text-editor-fg">
                    WPM
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry, index) => (
                  <tr
                    key={index}
                    className={`border-b border-editor-muted/30 hover:bg-editor-muted/10 transition-colors ${
                      index < 3 ? 'bg-editor-accent/5' : ''
                    }`}
                  >
                    <td className="px-6 py-4 text-editor-fg font-medium">
                      <span className={index < 3 ? 'text-editor-accent font-bold' : ''}>
                        #{index + 1}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-editor-fg">
                      {entry.displayName}
                    </td>
                    <td className="px-6 py-4 text-right text-editor-fg font-mono font-bold">
                      {entry.wpmScore}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
