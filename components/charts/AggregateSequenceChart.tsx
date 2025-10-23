'use client';

import { Target } from 'lucide-react';
import { AggregateSequence } from '@/lib/db/firebase';

interface AggregateSequenceChartProps {
  twoCharSequences: AggregateSequence[];
  threeCharSequences: AggregateSequence[];
}

export function AggregateSequenceChart({
  twoCharSequences,
  threeCharSequences,
}: AggregateSequenceChartProps) {
  if (twoCharSequences.length === 0 && threeCharSequences.length === 0) {
    return (
      <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
        <div className="flex items-center gap-2 mb-3">
          <Target className="w-4 h-4 text-purple-500" />
          <h2 className="text-lg font-bold">Slowest Sequences</h2>
        </div>
        <div className="text-center py-6">
          <p className="text-editor-muted text-sm">
            Complete more tests to see your slowest sequences
          </p>
        </div>
      </div>
    );
  }

  const allSequences = [
    ...twoCharSequences.map((seq) => ({
      text: `"${seq.sequence}"`,
      time: seq.averageTime,
    })),
    ...threeCharSequences.map((seq) => ({
      text: `"${seq.sequence}"`,
      time: seq.averageTime,
    })),
  ].sort((a, b) => b.time - a.time);

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="flex items-center gap-2 mb-3">
        <Target className="w-4 h-4 text-purple-500" />
        <h2 className="text-lg font-bold">Slowest Sequences</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
        {allSequences.map((sequence, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-2 bg-editor-muted/20 rounded hover:bg-editor-muted/30 transition-colors"
          >
            <span className="font-mono text-sm">{sequence.text}</span>
            <div className="flex items-center gap-2">
              <span className="text-editor-muted text-xs">avg time</span>
              <span className="bg-purple-500/20 text-purple-400 px-2 py-0.5 rounded-full font-semibold text-xs">
                {sequence.time}ms
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
