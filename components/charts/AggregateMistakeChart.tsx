'use client';

import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { AggregateMistakeData } from '@/lib/db/firebase';

interface AggregateMistakeChartProps {
  mistakeData: AggregateMistakeData;
}

export function AggregateMistakeChart({ mistakeData }: AggregateMistakeChartProps) {
  const renderSequence = (seq: string) => {
    return seq.split('').map((char, idx) => {
      if (char === ' ') {
        return (
          <span
            key={idx}
            className="inline-block bg-orange-400/20 border border-orange-400/40 rounded px-1 mx-0.5"
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
          <span className="text-xs font-medium">Better</span>
        </div>
      );
    } else if (trend === 'worsening') {
      return (
        <div className="flex items-center gap-1 text-red-500">
          <TrendingUp className="w-4 h-4" />
          <span className="text-xs font-medium">Worse</span>
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

  const hasData =
    mistakeData.characterSubstitutions.length > 0 ||
    mistakeData.mistakeSequences.length > 0;

  if (!hasData) {
    return (
      <div className="bg-editor-bg border border-orange-500/30 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertTriangle className="w-5 h-5 text-green-400" />
          <h2 className="text-xl font-bold">Common Mistakes (All Tests)</h2>
        </div>
        <p className="text-editor-muted text-center py-4">
          No mistake data available yet. Complete more tests to see your common error patterns!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-editor-bg border border-orange-500/30 rounded-lg p-6">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-orange-400" />
        <h2 className="text-xl font-bold">Common Mistakes (All Tests)</h2>
      </div>
      <p className="text-editor-muted mb-6 text-sm">
        Mistakes that occur most frequently across all your tests. Trends show recent performance vs overall average.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Character Confusions */}
        {mistakeData.characterSubstitutions.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-orange-400">
              Character Confusions
            </h3>
            <p className="text-sm text-editor-muted mb-3">
              You most often type these characters incorrectly:
            </p>
            <div className="space-y-2">
              {mistakeData.characterSubstitutions.map((sub, index) => (
                <div
                  key={index}
                  className="bg-orange-500/10 border border-orange-500/30 rounded p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <span className="text-editor-muted font-mono text-sm w-6 flex-shrink-0">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-sm truncate">
                        Expected: <span className="font-bold text-green-400">&quot;{sub.expected}&quot;</span>
                        {' '}→{' '}
                        Typed: <span className="font-bold text-orange-400">&quot;{sub.actual}&quot;</span>
                      </span>
                    </div>
                    <span className="font-mono font-bold text-orange-400 flex-shrink-0">
                      {sub.totalCount}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pl-9">
                    <span className="text-editor-muted">
                      Recent: {sub.recentCount}x
                    </span>
                    {renderTrend(sub.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Mistake Sequences */}
        {mistakeData.mistakeSequences.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold mb-3 text-orange-400">
              Problem Sequences
            </h3>
            <p className="text-sm text-editor-muted mb-3">
              Sequences where you make mistakes most often:
            </p>
            <div className="space-y-2">
              {mistakeData.mistakeSequences.map((seq, index) => (
                <div
                  key={index}
                  className="bg-orange-500/10 border border-orange-500/30 rounded p-3"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-editor-muted font-mono text-sm w-6">
                        #{index + 1}
                      </span>
                      <span className="font-mono text-lg font-bold text-orange-400">
                        &quot;{renderSequence(seq.sequence)}&quot;
                      </span>
                    </div>
                    <span className="font-mono font-bold text-orange-400">
                      {seq.totalCount}x
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pl-9">
                    <span className="text-editor-muted">
                      Recent: {seq.recentCount}x
                    </span>
                    {renderTrend(seq.trend)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 p-4 bg-orange-500/10 border border-orange-500/30 rounded">
        <p className="text-sm text-editor-muted">
          <strong className="text-editor-fg">Tip:</strong> These are your most common mistakes across all tests.
          Green trends show improvement, red shows persistent problem areas that need more practice.
        </p>
      </div>
    </div>
  );
}
