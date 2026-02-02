/**
 * User rank badge component
 * Displays user's rank in a time trial with trophy icon for top 10
 */

import { TimeTrialRank } from '@/lib/types';
import { getRankOrdinal, getRankColor } from '@/lib/utils/time-trial-utils';

interface UserRankBadgeProps {
  rank: TimeTrialRank;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function UserRankBadge({
  rank,
  className = '',
  size = 'md',
}: UserRankBadgeProps) {
  const isTopTen = rank.rank <= 10;
  const rankColor = getRankColor(rank.rank);

  const sizeClasses = {
    sm: 'text-sm px-2 py-1',
    md: 'text-base px-3 py-1.5',
    lg: 'text-lg px-4 py-2',
  };

  return (
    <div
      className={`inline-flex items-center gap-2 rounded-full bg-gray-800 ${sizeClasses[size]} ${className}`}
    >
      {isTopTen && <span className="text-yellow-400">🏆</span>}
      <span className={`font-medium ${rankColor}`}>
        {isTopTen ? (
          <>Top {rank.rank}</>
        ) : (
          <>
            {getRankOrdinal(rank.rank)} of {rank.totalEntries}
          </>
        )}
      </span>
    </div>
  );
}
