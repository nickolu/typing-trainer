'use client';

import { useEffect, useState } from 'react';
import { useUserStore } from '@/store/user-store';
import { X, Trophy, RotateCcw } from 'lucide-react';
import { migrateUserTimeTrialContent, markTimeTrialResetNoticeSeen } from '@/lib/db/firebase';

export function TimeTrialResetNotice() {
  const { currentUserId, timeTrialContentMigrated, hasSeenTimeTrialResetNotice } = useUserStore();
  const [isOpen, setIsOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  useEffect(() => {
    // Show notice if:
    // 1. User is logged in
    // 2. User has NOT been migrated yet
    // 3. User has NOT seen the notice
    if (currentUserId && !timeTrialContentMigrated && !hasSeenTimeTrialResetNotice) {
      setIsOpen(true);
    }
  }, [currentUserId, timeTrialContentMigrated, hasSeenTimeTrialResetNotice]);

  const handleDismiss = async () => {
    if (!currentUserId) return;

    try {
      setIsMigrating(true);

      // Migrate the user's time trial data
      await migrateUserTimeTrialContent(currentUserId);

      // Mark notice as seen
      await markTimeTrialResetNoticeSeen(currentUserId);

      // Refresh user profile to update local state
      await useUserStore.getState().refreshUserProfile();

      setIsOpen(false);
    } catch (error) {
      console.error('Failed to dismiss time trial reset notice:', error);
    } finally {
      setIsMigrating(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 relative">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900 rounded-lg">
              <Trophy className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
              Time Trial Content Updated
            </h2>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-6">
          <p className="text-gray-700 dark:text-gray-300">
            We've completely redesigned the time trial tests with fresh, engaging content that
            better serves competitive typing practice!
          </p>

          <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <RotateCcw className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100 mb-1">
                  Your Records Will Be Reset
                </p>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  All existing time trial records will be cleared to ensure fair competition
                  with the new content. Everyone starts fresh!
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">
              What's new:
            </p>
            <ul className="text-sm text-gray-700 dark:text-gray-300 space-y-1 ml-4">
              <li>• <strong>Novice Sprint</strong> - Perfect for beginners with simple, flowing text</li>
              <li>• <strong>Intermediate Challenge</strong> - Urban life themes with moderate complexity</li>
              <li>• <strong>Advanced Velocity</strong> - Programming concepts and technical thinking</li>
              <li>• <strong>Expert Gauntlet</strong> - Neuroplasticity and cognitive science</li>
              <li>• <strong>Master Marathon</strong> - Distributed systems architecture</li>
              <li>• <strong>Grandmaster Crucible</strong> - Advanced cryptography concepts</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={handleDismiss}
          disabled={isMigrating}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
        >
          {isMigrating ? 'Resetting Records...' : 'Got it! Let's Start Fresh'}
        </button>
      </div>
    </div>
  );
}
