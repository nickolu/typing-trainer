'use client';

import { useState } from 'react';
import { FingerStat, FingerReport } from '@/lib/test-engine/finger-analysis';
import { FingerId } from '@/lib/finger-map';
import {
  speedColor,
  describeRelativeSpeed,
  SPEED_BANDS_ORDERED,
  SPEED_BAND_COLORS,
  SPEED_BAND_LABELS,
} from './finger-colors';

interface HandMapProps {
  report: FingerReport;
}

/**
 * Finger geometry for one hand drawn palm-down, fingers pointing up.
 * x is the finger's horizontal center within a 200-unit-wide hand; h is its length.
 * Order is pinky -> thumb for the LEFT hand; the right hand is mirrored.
 */
const FINGER_GEOMETRY: Array<{ digit: number; x: number; h: number; w: number }> = [
  { digit: 5, x: 32, h: 78, w: 30 }, // pinky
  { digit: 4, x: 68, h: 104, w: 32 }, // ring
  { digit: 3, x: 106, h: 116, w: 34 }, // middle
  { digit: 2, x: 144, h: 102, w: 34 }, // index
];
const PALM_TOP = 150;
const PALM = { x: 14, y: PALM_TOP, w: 162, h: 110, r: 26 };
// Rotated clockwise so the tip points up and away from the palm, base tucked into the palm's corner.
const THUMB = { x: 166, y: 132, w: 32, h: 92, r: 16, rotate: 40 };

function fingerId(hand: 'L' | 'R', digit: number): FingerId {
  return `${hand}${digit}` as FingerId;
}

interface HandProps {
  hand: 'L' | 'R';
  stats: Record<FingerId, FingerStat>;
  hovered: FingerId | null;
  onHover: (id: FingerId | null) => void;
}

function Hand({ hand, stats, hovered, onHover }: HandProps) {
  // The right hand is the left hand mirrored around the center of the 230-wide viewBox.
  const mirror = hand === 'R' ? 'translate(230 0) scale(-1 1)' : undefined;

  const renderFinger = (id: FingerId, shape: React.ReactNode, labelX: number, labelY: number, label: string) => {
    const stat = stats[id];
    const hasEstimate = stat.medianMs !== null;
    const isHovered = hovered === id;
    return (
      <g
        key={id}
        onMouseEnter={() => onHover(id)}
        onMouseLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
        tabIndex={0}
        role="img"
        aria-label={`${stat.name}: ${hasEstimate ? `${stat.medianMs} ms median, ${describeRelativeSpeed(stat.relativeSpeed)}` : 'not enough data'}`}
        className="cursor-pointer outline-none"
        style={{ opacity: hovered && !isHovered ? 0.55 : 1, transition: 'opacity 150ms' }}
      >
        {shape}
        {/* Mirror the text back so it reads normally on the right hand */}
        <text
          x={labelX}
          y={labelY}
          textAnchor="middle"
          fontSize="13"
          fontWeight={600}
          fill="#efefef"
          transform={hand === 'R' ? `translate(${labelX * 2} 0) scale(-1 1)` : undefined}
          style={{ pointerEvents: 'none' }}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <svg viewBox="0 0 230 270" className="w-full max-w-[260px]" aria-hidden={false}>
      <g transform={mirror}>
        {/* Palm */}
        <rect
          x={PALM.x}
          y={PALM.y}
          width={PALM.w}
          height={PALM.h}
          rx={PALM.r}
          fill="#2a2a2a"
          stroke="#474747"
          strokeWidth={1.5}
        />
        {/* Four fingers */}
        {FINGER_GEOMETRY.map((g) => {
          const id = fingerId(hand, g.digit);
          const stat = stats[id];
          const hasEstimate = stat.medianMs !== null;
          const top = PALM_TOP - g.h;
          const shape = (
            <rect
              x={g.x - g.w / 2}
              y={top}
              width={g.w}
              height={g.h + 24}
              rx={g.w / 2}
              fill={speedColor(stat.relativeSpeed)}
              stroke={hovered === id ? '#efefef' : '#474747'}
              strokeWidth={hovered === id ? 2 : 1.5}
              strokeDasharray={hasEstimate ? undefined : '4 3'}
            />
          );
          const label = hasEstimate ? `${stat.medianMs}` : '–';
          return renderFinger(id, shape, g.x, top + 22, label);
        })}
        {/* Thumb */}
        {(() => {
          const id = fingerId(hand, 1);
          const stat = stats[id];
          const hasEstimate = stat.medianMs !== null;
          const cx = THUMB.x + THUMB.w / 2;
          const cy = THUMB.y + THUMB.h / 2;
          const shape = (
            <rect
              x={THUMB.x}
              y={THUMB.y}
              width={THUMB.w}
              height={THUMB.h}
              rx={THUMB.r}
              fill={speedColor(stat.relativeSpeed)}
              stroke={hovered === id ? '#efefef' : '#474747'}
              strokeWidth={hovered === id ? 2 : 1.5}
              strokeDasharray={hasEstimate ? undefined : '4 3'}
              transform={`rotate(${THUMB.rotate} ${cx} ${cy})`}
            />
          );
          const label = hasEstimate ? `${stat.medianMs}` : '–';
          return renderFinger(id, shape, cx + 26, THUMB.y + 26, label);
        })()}
      </g>
    </svg>
  );
}

export function HandMap({ report }: HandMapProps) {
  const [hovered, setHovered] = useState<FingerId | null>(null);
  const stats = Object.fromEntries(report.fingers.map((f) => [f.id, f])) as Record<FingerId, FingerStat>;
  const active = hovered ? stats[hovered] : null;

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="mb-3">
        <h2 className="text-xl font-bold mb-1">Finger Speed Map</h2>
        <p className="text-editor-muted text-sm">
          Median milliseconds between keystrokes, per finger. Blue fingers are faster than your overall
          median, red ones slower. Dashed fingers need more data.
        </p>
      </div>

      <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-16">
        <div className="flex flex-col items-center">
          <Hand hand="L" stats={stats} hovered={hovered} onHover={setHovered} />
          <span className="text-sm text-editor-muted mt-1">Left hand</span>
        </div>
        <div className="flex flex-col items-center">
          <Hand hand="R" stats={stats} hovered={hovered} onHover={setHovered} />
          <span className="text-sm text-editor-muted mt-1">Right hand</span>
        </div>
      </div>

      {/* Detail panel: fixed height so the layout doesn't jump on hover */}
      <div className="mt-4 min-h-[64px] rounded bg-editor-muted/10 px-4 py-3 text-sm">
        {active ? (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="font-semibold text-editor-fg">{active.name}</span>
            {active.medianMs !== null ? (
              <>
                <span>
                  <span className="text-editor-muted">median </span>
                  <span className="font-mono">{active.medianMs} ms</span>
                  {active.ci95Ms !== null && (
                    <span className="text-editor-muted font-mono"> ± {active.ci95Ms}</span>
                  )}
                </span>
                <span className="text-editor-muted">{describeRelativeSpeed(active.relativeSpeed)}</span>
                <span>
                  <span className="text-editor-muted">accuracy </span>
                  <span className="font-mono">{active.accuracy}%</span>
                </span>
                <span>
                  <span className="text-editor-muted">samples </span>
                  <span className="font-mono">{active.samples}</span>
                </span>
                {active.slowestKeys.length > 0 && (
                  <span>
                    <span className="text-editor-muted">slowest keys </span>
                    <span className="font-mono">
                      {active.slowestKeys.map((k) => `${k.char === ' ' ? '␣' : k.char} ${k.medianMs}ms`).join(', ')}
                    </span>
                  </span>
                )}
              </>
            ) : (
              <span className="text-editor-muted">
                {active.samples} timed samples so far. Needs at least 15 for an estimate.
              </span>
            )}
          </div>
        ) : (
          <span className="text-editor-muted">Hover or focus a finger for details.</span>
        )}
      </div>

      {/* Legend */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-editor-muted">
        {SPEED_BANDS_ORDERED.map((band) => (
          <span key={band} className="flex items-center gap-1.5">
            <span className="inline-block w-3 h-3 rounded-sm" style={{ backgroundColor: SPEED_BAND_COLORS[band] }} />
            {SPEED_BAND_LABELS[band]}
          </span>
        ))}
        <span className="flex items-center gap-1.5">
          <span className="inline-block w-3 h-3 rounded-sm border border-dashed border-editor-muted" style={{ backgroundColor: SPEED_BAND_COLORS['no-data'] }} />
          {SPEED_BAND_LABELS['no-data']}
        </span>
      </div>
    </div>
  );
}
