'use client';

import { useEffect, useState } from 'react';
import { Timer, FileText, Trophy } from 'lucide-react';
import { TestDuration } from '@/store/settings-store';

interface TestTimerProps {
  duration: number | string | 'content-length'; // Total duration in seconds (can be string from store) or 'content-length'
  startTime: number | null; // performance.now() when test started
  endTime?: number | null; // performance.now() when test ended (for failed status)
  onComplete: () => void;
  // For content-length mode
  totalWords?: number;
  remainingWords?: number;
  // For time trials
  bestTime?: number | null; // Best time in seconds
}

export function TestTimer({ duration, startTime, endTime, onComplete, totalWords, remainingWords, bestTime }: TestTimerProps) {
  // Helper to convert duration to number (handles both string and number from store)
  const getDurationAsNumber = (dur: number | 'content-length' | string): number => {
    if (dur === 'content-length') return 0;
    if (typeof dur === 'number') return dur;
    // Handle string numbers (from localStorage)
    const parsed = Number(dur);
    return isNaN(parsed) ? 0 : parsed;
  };

  const numericDuration = getDurationAsNumber(duration);
  const [timeRemaining, setTimeRemaining] = useState(numericDuration);

  // Update timeRemaining when duration changes (especially when test is idle)
  useEffect(() => {
    if (!startTime && duration !== 'content-length') {
      const numeric = getDurationAsNumber(duration);
      setTimeRemaining(numeric);
    }
  }, [duration, startTime]);

  useEffect(() => {
    // Stop the timer if the test has ended (failed or completed)
    if (!startTime || duration === 'content-length' || endTime) {
      return;
    }

    const numeric = getDurationAsNumber(duration);
    const interval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds
      const remaining = Math.max(0, numeric - elapsed);

      setTimeRemaining(Math.ceil(remaining));

      if (remaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [startTime, duration, endTime, onComplete]);

  // For content-length mode, display remaining words
  if (duration === 'content-length') {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-editor-fg">
          <FileText className="w-5 h-5" />
          <span className="text-2xl font-bold font-mono tabular-nums">
            {remainingWords ?? totalWords ?? 0} words
          </span>
        </div>
        {bestTime !== undefined && bestTime !== null && (
          <div className="flex items-center gap-2 text-yellow-400">
            <Trophy className="w-4 h-4" />
            <span className="text-sm font-bold font-mono">
              Best: {bestTime.toFixed(1)}s
            </span>
          </div>
        )}
      </div>
    );
  }

  // Format time display - if test hasn't started, show the full duration
  const displayTime = !startTime ? getDurationAsNumber(duration) : timeRemaining;
  const formattedTime = displayTime.toString();

  return (
    <div className="flex items-center gap-2 text-editor-fg">
      <Timer className="w-5 h-5" />
      <span className="text-2xl font-bold font-mono tabular-nums">
        {formattedTime}s
      </span>
    </div>
  );
}
