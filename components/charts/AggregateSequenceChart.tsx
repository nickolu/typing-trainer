'use client';

import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AggregateSequence } from '@/lib/db';

interface AggregateSequenceChartProps {
  twoCharSequences: AggregateSequence[];
  threeCharSequences: AggregateSequence[];
}

export function AggregateSequenceChart({
  twoCharSequences,
  threeCharSequences,
}: AggregateSequenceChartProps) {
  const renderSequence = (seq: string) => {
    return seq.split('').map((char, idx) => {
      if (char === ' ') {
        return (
          <span
            key={idx}
            className="inline-block bg-purple-500/20 border border-purple-500/40 rounded px-1 mx-0.5"
          >
            ␣
          </span>
        );
      }
      return <span key={idx}>{char}</span>;
    });
  };

  const renderTrend = (trend: 'improving' | 'worsening' | 'stable') => {
    if (trend === 'improving') {
      return (
        <div className="flex items-center gap-1 text-green-500">
          <TrendingDown className="w-4 h-4" />
          <span className="text-xs font-medium">Faster</span>
        </div>
      );
    } else if (trend === 'worsening') {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">Slower</span>
        </div>
      );
    } else {
      return (
        <div className="flex items-center gap-1 text-gray-500">
          <Minus className="w-4 h-4" />
          <span className="text-xs font-medium">Stable</span>
        </div>
      );
    }
  };

  if (twoCharSequences.length === 0 && threeCharSequences.length === 0) {
    return (
      <div className="bg-editor-bg border border-purple-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-purple-500" />
          <h2 className="text-xl font-bold">Slowest Sequences (All Tests)</h2>
        </div>
        <p className="text-editor-muted text-center py-4">
          Not enough data to analyze aggregate sequences. Complete more tests to see your overall patterns!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-editor-bg border border-purple-500/30 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-2">
        <Target className="w-5 h-5 text-purple-500" />
        <h2 className="text-xl font-bold">Slowest Sequences (All Tests)</h2>
      </div>
      <p className="text-editor-muted mb-6 text-sm">
        Character sequences that take you the longest across all your tests. Trends show recent performance vs overall average.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2-Character Sequences */}
        {twoCharSequences.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-purple-400">
              2-Character Sequences
            </h3>
            <div className="space-y-2">
              {twoCharSequences.map((seq, index) => (
                <div
                  key={index}
                  className="bg-purple-500/10 border border-purple-500/30 rounded p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-editor-muted font-mono text-sm w-6">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-lg font-bold">
                        &quot;{renderSequence(seq.sequence)}&quot;
                      </span>
                      <span className="text-editor-muted text-sm">
                        ({seq.totalOccurrences}x)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-purple-400">
                      {seq.averageTime}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pl-9">
                    <span className="text-editor-muted">
                      Recent: {seq.recentAverage}ms
                    </span>
                    {renderTrend(seq.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 3-Character Sequences */}
        {threeCharSequences.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-purple-400">
              3-Character Sequences
            </h3>
            <div className="space-y-2">
              {threeCharSequences.map((seq, index) => (
                <div
                  key={index}
                  className="bg-purple-500/10 border border-purple-500/30 rounded p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-editor-muted font-mono text-sm w-6">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-lg font-bold">
                        &quot;{renderSequence(seq.sequence)}&quot;
                      </span>
                      <span className="text-editor-muted text-sm">
                        ({seq.totalOccurrences}x)
                      </span>
                    </div>
                    <span className="font-mono font-bold text-purple-400">
                      {seq.averageTime}ms
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pl-9">
                    <span className="text-editor-muted">
                      Recent: {seq.recentAverage}ms
                    </span>
                    {renderTrend(seq.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded">
        <p className="text-sm text-editor-muted">
          <strong className="text-editor-fg">Tip:</strong> These are your slowest sequences across all tests.
          Green trends show improvement, red shows areas needing more practice.
        </p>
      </div>
    </div>
  );
}
