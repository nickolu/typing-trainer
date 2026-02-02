/**
 * Time trial utility functions
 */

/**
 * Format time in seconds to display format
 * Examples: 45.3s, 2:15.8, 1:02:34.5
 */
export function formatTimeTrialTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes < 60) {
    return `${minutes}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}:${remainingMinutes.toString().padStart(2, '0')}:${remainingSeconds.toFixed(1).padStart(4, '0')}`;
}

/**
 * Get ordinal suffix for rank (1st, 2nd, 3rd, 15th)
 */
export function getRankOrdinal(rank: number): string {
  const j = rank % 10;
  const k = rank % 100;

  if (j === 1 && k !== 11) {
    return `${rank}st`;
  }
  if (j === 2 && k !== 12) {
    return `${rank}nd`;
  }
  if (j === 3 && k !== 13) {
    return `${rank}rd`;
  }
  return `${rank}th`;
}

/**
 * Get Tailwind color class for rank badge/text
 */
export function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400'; // Gold
  if (rank === 2) return 'text-gray-300'; // Silver
  if (rank === 3) return 'text-amber-600'; // Bronze
  if (rank <= 10) return 'text-yellow-500'; // Top 10
  return 'text-gray-400'; // Everyone else
}

/**
 * Get trophy/medal icon for top 3 ranks
 */
export function getTrophyIcon(rank: number): string {
  if (rank === 1) return '🥇'; // Gold medal
  if (rank === 2) return '🥈'; // Silver medal
  if (rank === 3) return '🥉'; // Bronze medal
  return '';
}

/**
 * Truncate display name if too long
 */
export function truncateDisplayName(name: string, maxLength: number = 20): string {
  if (name.length <= maxLength) return name;
  return name.substring(0, maxLength - 1) + '…';
}
