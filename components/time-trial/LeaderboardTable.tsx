/**
 * Leaderboard table component
 * Displays rankings with trophy icons for top 3 and current user highlighting
 */

import { LeaderboardEntry } from '@/lib/types';
import {
  formatTimeTrialTime,
  getTrophyIcon,
  getRankColor,
  truncateDisplayName,
} from '@/lib/utils/time-trial-utils';

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  isLoading?: boolean;
}

export function LeaderboardTable({
  entries,
  isLoading = false,
}: LeaderboardTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-gray-400">Loading leaderboard...</div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="text-6xl mb-4">🏆</div>
        <div className="text-xl font-bold text-gray-300 mb-2">
          Be the first!
        </div>
        <div className="text-gray-400">
          Complete this trial to claim the top spot
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-gray-700">
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400 w-20">
              Rank
            </th>
            <th className="text-left py-3 px-4 text-sm font-medium text-gray-400">
              Name
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400 w-24">
              Time
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400 w-20">
              WPM
            </th>
            <th className="text-right py-3 px-4 text-sm font-medium text-gray-400 w-24">
              Errors
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map((entry, index) => {
            const trophy = getTrophyIcon(entry.rank);
            const rankColor = getRankColor(entry.rank);

            return (
              <tr
                key={`${entry.userId}-${index}`}
                className={`border-b border-gray-800 transition-colors ${
                  entry.isCurrentUser
                    ? 'bg-yellow-500/10 hover:bg-yellow-500/15'
                    : 'hover:bg-gray-800/50'
                }`}
              >
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    {trophy && <span className="text-xl">{trophy}</span>}
                    <span className={`font-medium ${rankColor}`}>
                      #{entry.rank}
                    </span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  <div className="flex items-center gap-2">
                    <span
                      className={
                        entry.isCurrentUser
                          ? 'font-medium text-yellow-400'
                          : 'text-gray-300'
                      }
                    >
                      {truncateDisplayName(entry.displayName)}
                    </span>
                    {entry.isCurrentUser && (
                      <span className="text-xs text-yellow-400">(You)</span>
                    )}
                  </div>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`font-mono ${
                      entry.isCurrentUser ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    {formatTimeTrialTime(entry.bestTime)}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`font-mono ${
                      entry.isCurrentUser ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    {entry.wpm}
                  </span>
                </td>
                <td className="py-3 px-4 text-right">
                  <span
                    className={`font-mono ${
                      entry.isCurrentUser ? 'text-yellow-400' : 'text-gray-300'
                    }`}
                  >
                    {entry.errorCount}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
