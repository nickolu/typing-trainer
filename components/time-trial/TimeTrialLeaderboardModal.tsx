/**
 * Time Trial Leaderboard Modal
 * Displays full leaderboard for a specific time trial
 */

'use client';

import { useState, useEffect } from 'react';
import { X, Trophy } from 'lucide-react';
import { LeaderboardEntry, TimeTrialRank } from '@/lib/types';
import { LeaderboardTable } from './LeaderboardTable';
import { UserRankBadge } from './UserRankBadge';
import { getTimeTrialLeaderboard, getUserTimeTrialRank } from '@/lib/db/time-trials';

interface TimeTrialLeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  trialId: string;
  trialName: string;
  userId?: string;
}

export function TimeTrialLeaderboardModal({
  isOpen,
  onClose,
  trialId,
  trialName,
  userId,
}: TimeTrialLeaderboardModalProps) {
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<TimeTrialRank | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch leaderboard data when modal opens
  useEffect(() => {
    if (!isOpen) return;

    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // Fetch leaderboard
        const entries = await getTimeTrialLeaderboard(trialId, 100, userId);
        setLeaderboard(entries);

        // Fetch user's rank if authenticated
        if (userId) {
          const rank = await getUserTimeTrialRank(trialId, userId);
          setUserRank(rank);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
        setError('Failed to load leaderboard. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [isOpen, trialId, userId]);

  if (!isOpen) return null;

  // Check if user is in top 100
  const userInTopHundred = leaderboard.some((entry) => entry.isCurrentUser);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      onKeyDown={(e) => e.stopPropagation()}
      onKeyUp={(e) => e.stopPropagation()}
      onKeyPress={(e) => e.stopPropagation()}
    >
      <div
        className="bg-editor-bg border border-editor-muted rounded-lg max-w-3xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-editor-bg border-b border-editor-muted p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <div>
              <h2 className="text-xl font-bold">{trialName}</h2>
              <p className="text-sm text-gray-400">Leaderboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-editor-muted/30 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User's Rank Section (if not in top 100) */}
        {userId && userRank && !userInTopHundred && (
          <div className="p-4 bg-yellow-500/10 border-b border-yellow-500/20">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400 mb-1">Your Rank</p>
                <UserRankBadge rank={userRank} size="lg" />
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-400">Keep practicing!</p>
                <p className="text-xs text-gray-500">
                  {userRank.rank - 100} spots from top 100
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="p-6">
          {error ? (
            <div className="text-center py-12 text-red-400">{error}</div>
          ) : (
            <>
              <LeaderboardTable entries={leaderboard} isLoading={isLoading} />

              {/* Footer Info */}
              {!isLoading && leaderboard.length > 0 && (
                <div className="mt-6 text-center text-sm text-gray-400">
                  {leaderboard.length === 100 ? (
                    <p>Showing top 100 participants</p>
                  ) : (
                    <p>
                      {leaderboard.length}{' '}
                      {leaderboard.length === 1 ? 'participant' : 'participants'}
                    </p>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
