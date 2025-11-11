'use client';

import { AlertTriangle } from 'lucide-react';
import { AggregateMistakeData } from '@/lib/db';

interface AggregateMistakeChartProps {
  mistakeData: AggregateMistakeData;
}

export function AggregateMistakeChart({ mistakeData }: AggregateMistakeChartProps) {
  const hasData =
    mistakeData.characterSubstitutions.length > 0 ||
    mistakeData.mistakeSequences.length > 0;

  if (!hasData) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <AlertTriangle className="w-4 h-4 text-orange-500" />
          <h2 className="text-lg font-bold">Common Mistakes</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-editor-muted text-sm">
            Complete more tests to see your common error patterns
          </p>
        </div>
      </div>
    );
  }

  const allMistakes = [
    ...mistakeData.characterSubstitutions.map((sub) => ({
      text: `"${sub.expected}" → "${sub.actual}"`,
      count: sub.totalCount,
    })),
    ...mistakeData.mistakeSequences.map((seq) => ({
      text: `"${seq.sequence}"`,
      count: seq.totalCount,
    })),
  ].sort((a, b) => b.count - a.count);

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-orange-500" />
        <h2 className="text-lg font-bold">Common Mistakes</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {allMistakes.map((mistake, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-editor-muted/20 rounded hover:bg-editor-muted/30 transition-colors"
          >
            <span className="font-mono text-sm">{mistake.text}</span>
            <div className="flex items-center gap-2">
              <span className="text-editor-muted text-xs">errors</span>
              <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold text-xs">
                {mistake.count}x
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
