'use client';

import { FingerReport, TARGET_SAMPLES_PER_FINGER } from '@/lib/test-engine/finger-analysis';
import { speedColor, describeRelativeSpeed } from './finger-colors';

interface FingerTableProps {
  report: FingerReport;
}

export function FingerTable({ report }: FingerTableProps) {
  // Slowest first; fingers without an estimate sink to the bottom.
  const rows = [...report.fingers].sort((a, b) => {
    if (a.score === null && b.score === null) return 0;
    if (a.score === null) return 1;
    if (b.score === null) return -1;
    return a.score - b.score;
  });

  const maxMedian = Math.max(...rows.map((r) => r.medianMs ?? 0), 1);

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="mb-3">
        <h2 className="text-xl font-bold mb-1">Finger Breakdown</h2>
        <p className="text-editor-muted text-sm">
          Weakest first. Score combines speed relative to your average with the error rate.
          The ± is a 95% confidence interval; a finger is flagged when that interval sits clear of your overall median.
        </p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-editor-muted border-b border-editor-muted/40">
              <th className="py-2 pr-3 font-medium">Finger</th>
              <th className="py-2 pr-3 font-medium">Median</th>
              <th className="py-2 pr-3 font-medium w-[28%]">vs. average</th>
              <th className="py-2 pr-3 font-medium text-right">Accuracy</th>
              <th className="py-2 pr-3 font-medium text-right">Score</th>
              <th className="py-2 pr-3 font-medium">Data</th>
              <th className="py-2 font-medium">Flag</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((f) => {
              const hasEstimate = f.medianMs !== null;
              const barPct = hasEstimate ? (f.medianMs! / maxMedian) * 100 : 0;
              return (
                <tr key={f.id} className="border-b border-editor-muted/20 hover:bg-editor-muted/10">
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className="inline-block w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: speedColor(f.relativeSpeed) }}
                      />
                      <span className="font-medium">{f.name}</span>
                    </div>
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums whitespace-nowrap">
                    {hasEstimate ? (
                      <>
                        {f.medianMs} ms
                        {f.ci95Ms !== null && <span className="text-editor-muted"> ± {f.ci95Ms}</span>}
                      </>
                    ) : (
                      <span className="text-editor-muted">–</span>
                    )}
                  </td>
                  <td className="py-2 pr-3">
                    {hasEstimate ? (
                      <div className="flex items-center gap-2">
                        <div className="h-2 flex-1 rounded-full bg-editor-muted/20 overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${barPct}%`, backgroundColor: speedColor(f.relativeSpeed) }}
                          />
                        </div>
                        <span className="text-xs text-editor-muted whitespace-nowrap w-28">
                          {describeRelativeSpeed(f.relativeSpeed)}
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-editor-muted">not enough samples</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums text-right">
                    {f.accuracy !== null ? `${f.accuracy}%` : <span className="text-editor-muted">–</span>}
                  </td>
                  <td className="py-2 pr-3 font-mono tabular-nums text-right">
                    {f.score !== null ? f.score : <span className="text-editor-muted">–</span>}
                  </td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 rounded-full bg-editor-muted/20 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-editor-accent"
                          style={{ width: `${Math.round(f.confidence * 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-editor-muted font-mono tabular-nums whitespace-nowrap">
                        {f.samples.toLocaleString()}
                        {f.confidence < 1 && ` / ${TARGET_SAMPLES_PER_FINGER}`}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 text-xs whitespace-nowrap">
                    {f.significantlySlow && (
                      <span className="px-2 py-0.5 rounded-full bg-[#eb6263]/20 text-[#f0a0a0]">▼ reliably slower</span>
                    )}
                    {f.significantlyFast && (
                      <span className="px-2 py-0.5 rounded-full bg-[#338ced]/20 text-[#8fc0f5]">▲ reliably faster</span>
                    )}
                    {!f.significantlySlow && !f.significantlyFast && hasEstimate && (
                      <span className="text-editor-muted">–</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
