'use client';

import { useMemo, useState } from 'react';
import { KEYBOARD_ROWS, FINGERS } from '@/lib/finger-map';
import { FingerReport, KeyStat } from '@/lib/test-engine/finger-analysis';
import { speedColor, describeRelativeSpeed } from './finger-colors';

interface KeyboardHeatmapProps {
  report: FingerReport;
}

/** Horizontal offset (in key units) of each physical row, to mimic a staggered keyboard. */
const ROW_OFFSETS: Record<string, number> = {
  number: 0,
  top: 0.5,
  home: 0.75,
  bottom: 1.25,
  space: 3.5,
};

const KEY = 44; // px per key unit
const GAP = 4;

export function KeyboardHeatmap({ report }: KeyboardHeatmapProps) {
  const [hovered, setHovered] = useState<string | null>(null);
  const byChar = useMemo(() => {
    const map = new Map<string, KeyStat>();
    for (const k of report.keys) map.set(k.char, k);
    return map;
  }, [report.keys]);

  const active = hovered ? byChar.get(hovered) : undefined;
  const activeKey = hovered
    ? KEYBOARD_ROWS.flat().find((k) => k.base === hovered)
    : undefined;

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="mb-3">
        <h2 className="text-xl font-bold mb-1">Key Heatmap</h2>
        <p className="text-editor-muted text-sm">
          Same scale as the hand map, per key. Hover a key to see its finger, median time and accuracy.
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="inline-flex flex-col gap-1 min-w-max font-mono select-none">
          {KEYBOARD_ROWS.map((row) => {
            const rowName = row[0].row;
            const offset = ROW_OFFSETS[rowName] ?? 0;
            return (
              <div key={rowName} className="flex" style={{ gap: GAP, paddingLeft: offset * (KEY + GAP) }}>
                {row.map((key) => {
                  const stat = byChar.get(key.base);
                  const hasEstimate = stat?.medianMs != null;
                  const isSpace = key.base === ' ';
                  const width = isSpace ? KEY * 6 + GAP * 5 : KEY;
                  const isHovered = hovered === key.base;
                  return (
                    <button
                      key={key.base}
                      type="button"
                      onMouseEnter={() => setHovered(key.base)}
                      onMouseLeave={() => setHovered(null)}
                      onFocus={() => setHovered(key.base)}
                      onBlur={() => setHovered(null)}
                      aria-label={`${isSpace ? 'space' : key.base} key, ${FINGERS[key.finger].name}${hasEstimate ? `, ${stat!.medianMs} ms` : ', no estimate'}`}
                      className="relative rounded-md flex flex-col items-center justify-center text-sm transition-transform"
                      style={{
                        width,
                        height: KEY,
                        backgroundColor: speedColor(stat?.relativeSpeed ?? null),
                        border: `${isHovered ? 2 : 1}px ${hasEstimate ? 'solid' : 'dashed'} ${isHovered ? '#efefef' : '#474747'}`,
                        color: '#efefef',
                        transform: isHovered ? 'translateY(-1px)' : undefined,
                        opacity: hovered && !isHovered ? 0.6 : 1,
                      }}
                    >
                      <span className="font-semibold leading-none">{isSpace ? 'space' : key.base}</span>
                      {hasEstimate && (
                        <span className="text-[10px] leading-none mt-1 opacity-80">{stat!.medianMs}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-4 min-h-[44px] rounded bg-editor-muted/10 px-4 py-3 text-sm">
        {activeKey ? (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
            <span className="font-semibold font-mono">{activeKey.base === ' ' ? 'space' : activeKey.base}</span>
            <span className="text-editor-muted">{FINGERS[activeKey.finger].name}</span>
            {active && active.medianMs !== null ? (
              <>
                <span>
                  <span className="text-editor-muted">median </span>
                  <span className="font-mono">{active.medianMs} ms</span>
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
              </>
            ) : (
              <span className="text-editor-muted">
                {active?.samples ?? 0} timed samples. Needs at least 15 for an estimate.
              </span>
            )}
          </div>
        ) : (
          <span className="text-editor-muted">Hover or focus a key for details.</span>
        )}
      </div>
    </div>
  );
}
