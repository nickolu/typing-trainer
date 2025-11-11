/**
 * Hook to manage WPM status loading and tooltip generation
 */

import { useState, useEffect } from 'react';

export interface WPMStatus {
  canUpdate: boolean;
  hasScore: boolean;
  currentScore: number | null;
  daysUntilUpdate: number | null;
  daysUntilReset: number | null;
  updateAllowedDate: Date | null;
  resetDate: Date | null;
}

export function useWPMStatus(
  isAuthenticated: boolean,
  currentUserId: string | null
): {
  wpmStatus: WPMStatus | null;
  tooltipMessage: string | null;
} {
  const [wpmStatus, setWpmStatus] = useState<WPMStatus | null>(null);

  // Load WPM status when authenticated
  useEffect(() => {
    if (isAuthenticated && currentUserId) {
      const loadWPMStatus = async () => {
        try {
          const { getWPMScoreStatus } = await import('@/lib/db');
          const status = await getWPMScoreStatus(currentUserId);
          setWpmStatus(status);
        } catch (error) {
          console.error('Failed to load WPM status:', error);
        }
      };
      loadWPMStatus();
    } else {
      setWpmStatus(null);
    }
  }, [isAuthenticated, currentUserId]);

  // Generate tooltip message based on WPM status
  const getTooltipMessage = (): string | null => {
    if (!wpmStatus) return null;

    if (!wpmStatus.hasScore) {
      return 'Take a benchmark test to set your official WPM';
    } else if (wpmStatus.canUpdate) {
      return `You can take one more benchmark test in the next ${wpmStatus.daysUntilReset} days. Your new score will be the average of the new score and the old score.`;
    } else {
      return `Your WPM score is set and cannot be changed until ${wpmStatus.updateAllowedDate?.toLocaleDateString()}. Your score will reset in ${wpmStatus.daysUntilReset} days.`;
    }
  };

  return {
    wpmStatus,
    tooltipMessage: getTooltipMessage(),
  };
}

