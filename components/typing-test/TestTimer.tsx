'use client';

import { useEffect, useState } from 'react';
import { Timer, FileText } from 'lucide-react';
import { TestDuration } from '@/store/settings-store';

interface TestTimerProps {
  duration: number | 'content-length'; // Total duration in seconds or 'content-length'
  startTime: number | null; // performance.now() when test started
  onComplete: () => void;
  // For content-length mode
  totalWords?: number;
  remainingWords?: number;
}

export function TestTimer({ duration, startTime, onComplete, totalWords, remainingWords }: TestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(typeof duration === 'number' ? duration : 0);

  // Update timeRemaining when duration changes (especially when test is idle)
  useEffect(() => {
    if (!startTime && typeof duration === 'number') {
      setTimeRemaining(duration);
    }
  }, [duration, startTime]);

  useEffect(() => {
    if (!startTime || duration === 'content-length') {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = (performance.now() - startTime) / 1000; // Convert to seconds
      const remaining = Math.max(0, duration - elapsed);

      setTimeRemaining(Math.ceil(remaining));

      if (remaining <= 0) {
        clearInterval(interval);
        onComplete();
      }
    }, 100); // Update every 100ms for smooth countdown

    return () => clearInterval(interval);
  }, [startTime, duration, onComplete]);

  // For content-length mode, display remaining words
  if (duration === 'content-length') {
    return (
      <div className="flex items-center gap-2 text-editor-fg">
        <FileText className="w-5 h-5" />
        <span className="text-2xl font-bold font-mono tabular-nums">
          {remainingWords ?? totalWords ?? 0} words
        </span>
      </div>
    );
  }

  // Format time display
  const formattedTime = timeRemaining.toString();

  return (
    <div className="flex items-center gap-2 text-editor-fg">
      <Timer className="w-5 h-5" />
      <span className="text-2xl font-bold font-mono tabular-nums">
        {formattedTime}s
      </span>
    </div>
  );
}
