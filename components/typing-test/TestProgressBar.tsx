'use client';

import { motion } from 'framer-motion';

interface TestProgressBarProps {
  progress: number;  // 0-100
  status: 'idle' | 'active' | 'complete' | 'failed';
}

export function TestProgressBar({ progress, status }: TestProgressBarProps) {
  // Determine bar color based on status
  const getBarColor = () => {
    if (status === 'complete') {
      return 'bg-green-500';
    }
    if (status === 'failed') {
      return 'bg-red-500';
    }
    return 'bg-gradient-to-r from-blue-500 via-teal-500 to-amber-500';
  };

  // Determine if we should show glow effect
  const shouldGlow = status === 'active';

  // Determine if we should show completion flash
  const shouldFlash = status === 'complete';

  return (
    <div
      className="absolute top-0 left-0 right-0 h-[3px] overflow-hidden rounded-t-lg z-20"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={status === 'active' ? 'Test progress' : status === 'complete' ? 'Test complete' : 'Test not started'}
    >
      <motion.div
        className={`h-full ${getBarColor()} ${shouldGlow ? 'progress-bar-active' : ''} ${shouldFlash ? 'progress-bar-flash' : ''}`}
        initial={{ scaleX: 0 }}
        animate={{
          scaleX: progress / 100,
          opacity: status === 'idle' ? 0.3 : 1
        }}
        transition={{
          duration: 0.3,
          ease: 'easeOut'
        }}
        style={{
          transformOrigin: 'left',
          willChange: 'transform',
          backgroundSize: '200% 100%',
        }}
      />
    </div>
  );
}
