'use client';

import { Database, CheckCircle2 } from 'lucide-react';
import { FingerReport, TARGET_SAMPLES_PER_FINGER } from '@/lib/test-engine/finger-analysis';
import { FINGERS, LETTER_FINGERS } from '@/lib/finger-map';

interface DataProgressProps {
  report: FingerReport;
}

export function DataProgress({ report }: DataProgressProps) {
  const ready = report.readiness >= 1;
  const pct = Math.round(report.readiness * 100);
  const needing = report.fingersNeedingData
    .map((id) => report.fingers.find((f) => f.id === id)!)
    .sort((a, b) => a.samples - b.samples);

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            {ready ? (
              <CheckCircle2 className="w-5 h-5 text-editor-success" />
            ) : (
              <Database className="w-5 h-5 text-editor-accent" />
            )}
            <h2 className="text-xl font-bold">{ready ? 'Enough data to trust the picture' : 'Collecting data'}</h2>
          </div>
          <p className="text-editor-muted text-sm max-w-2xl">
            {ready
              ? `Every finger has at least ${TARGET_SAMPLES_PER_FINGER} timed keystrokes. Keep drilling and the estimates tighten further.`
              : `Each finger needs ${TARGET_SAMPLES_PER_FINGER} timed keystrokes before its estimate is reliable. The balanced drill below spreads work evenly so the slowest-to-fill fingers catch up.`}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold tabular-nums">{pct}%</div>
          <div className="text-xs text-editor-muted">
            {report.totalSamples.toLocaleString()} samples · {report.testsAnalyzed} tests
          </div>
        </div>
      </div>

      {/* Per-finger coverage, left pinky to right pinky */}
      <div className="mt-4 grid grid-cols-4 sm:grid-cols-8 gap-2">
        {LETTER_FINGERS.map((id) => {
          const f = report.fingers.find((x) => x.id === id)!;
          const done = f.confidence >= 1;
          return (
            <div key={id} className="flex flex-col gap-1">
              <div className="h-1.5 rounded-full bg-editor-muted/20 overflow-hidden">
                <div
                  className={`h-full rounded-full ${done ? 'bg-editor-success' : 'bg-editor-accent'}`}
                  style={{ width: `${Math.round(f.confidence * 100)}%` }}
                />
              </div>
              <div className="text-[11px] text-editor-muted leading-tight">
                {FINGERS[id].hand === 'L' ? 'L' : 'R'} {FINGERS[id].shortName}
                <span className="font-mono tabular-nums"> {Math.min(f.samples, TARGET_SAMPLES_PER_FINGER)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {!ready && needing.length > 0 && (
        <p className="mt-3 text-sm text-editor-muted">
          Furthest behind:{' '}
          {needing.slice(0, 3).map((f, i) => (
            <span key={f.id}>
              {i > 0 && ', '}
              <span className="text-editor-fg">{f.name}</span> ({TARGET_SAMPLES_PER_FINGER - f.samples} more)
            </span>
          ))}
        </p>
      )}
    </div>
  );
}
