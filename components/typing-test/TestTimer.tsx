'use client';

import { useEffect, useState } from 'react';
import { Timer } from 'lucide-react';

interface TestTimerProps {
  duration: number; // Total duration in seconds
  startTime: number | null; // performance.now() when test started
  onComplete: () => void;
}

export function TestTimer({ duration, startTime, onComplete }: TestTimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(duration);

  // Update timeRemaining when duration changes (before test starts)
  useEffect(() => {
    if (!startTime) {
      setTimeRemaining(duration);
    }
  }, [duration, startTime]);

  useEffect(() => {
    if (!startTime) {
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
