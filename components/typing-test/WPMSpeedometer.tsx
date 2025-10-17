'use client';

interface WPMSpeedometerProps {
  wpm: number;
  maxWPM?: number;
}

export function WPMSpeedometer({ wpm, maxWPM = 120 }: WPMSpeedometerProps) {
  // Calculate needle rotation (0 WPM = -90deg, maxWPM = 90deg)
  const clampedWPM = Math.min(wpm, maxWPM);
  const rotation = -90 + (clampedWPM / maxWPM) * 180;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative w-32 h-20 pt-2 overflow-visible">
        {/* Speedometer arc background */}
        <svg
          viewBox="0 0 200 100"
          className="w-full h-full"
          style={{ transform: 'scaleY(1.2)' }}
        >
          {/* Background arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="currentColor"
            strokeWidth="12"
            className="text-editor-muted/20"
          />
          {/* Progress arc */}
          <path
            d="M 20 90 A 80 80 0 0 1 180 90"
            fill="none"
            stroke="url(#gradient)"
            strokeWidth="12"
            strokeDasharray="251.2"
            strokeDashoffset={251.2 - (251.2 * clampedWPM) / maxWPM}
            className="transition-all duration-300 ease-out"
            strokeLinecap="round"
          />
          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10b981" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
        </svg>

        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 w-1 h-14 bg-editor-accent origin-bottom transition-transform duration-300 ease-out"
          style={{
            transform: `translateX(-50%) rotate(${rotation}deg)`,
          }}
        >
          {/* Needle tip */}
          <div className="absolute top-0 left-1/2 w-0 h-0 -translate-x-1/2 -translate-y-1 border-l-[4px] border-r-[4px] border-b-[6px] border-l-transparent border-r-transparent border-b-editor-accent" />
        </div>

        {/* Center pivot */}
        <div className="absolute bottom-0 left-1/2 w-3 h-3 -translate-x-1/2 translate-y-1/2 bg-editor-accent rounded-full border-2 border-editor-bg" />
      </div>

      {/* WPM Display */}
      <div className="text-center">
        <div className="text-2xl font-bold tabular-nums">{Math.round(wpm)}</div>
        <div className="text-xs text-editor-muted">WPM</div>
      </div>
    </div>
  );
}
