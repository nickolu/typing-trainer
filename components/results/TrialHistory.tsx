'use client';

import { TestResult } from '@/lib/types';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrialHistoryProps {
  history: TestResult[];
  currentResult: TestResult;
}

export function TrialHistory({ history, currentResult }: TrialHistoryProps) {
  if (history.length === 0) {
    return null;
  }

  // Sort by iteration number (oldest to newest)
  const sortedHistory = [...history].sort((a, b) => {
    const iterA = a.iteration || 0;
    const iterB = b.iteration || 0;
    return iterA - iterB;
  });

  // Calculate trends
  const getTrend = (current: number, previous: number) => {
    const diff = current - previous;
    const percentChange = (diff / previous) * 100;
    return { diff, percentChange };
  };

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
      <h2 className="text-xl font-bold mb-4">Trial History</h2>
      <p className="text-sm text-editor-muted mb-4">
        Your progress on this content over {history.length} {history.length === 1 ? 'attempt' : 'attempts'}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-editor-muted">
              <th className="text-left py-2 px-3 font-medium text-editor-muted">Trial</th>
              <th className="text-right py-2 px-3 font-medium text-editor-muted">WPM</th>
              <th className="text-right py-2 px-3 font-medium text-editor-muted">Word Acc</th>
              <th className="text-right py-2 px-3 font-medium text-editor-muted">Char Acc</th>
              <th className="text-right py-2 px-3 font-medium text-editor-muted">Words</th>
              {currentResult.completionTime !== undefined && (
                <th className="text-right py-2 px-3 font-medium text-editor-muted">Time</th>
              )}
              <th className="text-left py-2 px-3 font-medium text-editor-muted">Date</th>
            </tr>
          </thead>
          <tbody>
            {sortedHistory.map((result, index) => {
              const isCurrentResult = result.id === currentResult.id;
              const previousResult = index > 0 ? sortedHistory[index - 1] : null;

              const wpmTrend = previousResult ? getTrend(result.wpm, previousResult.wpm) : null;
              const accuracyTrend = previousResult
                ? getTrend(result.accuracy, previousResult.accuracy)
                : null;
              const charAccuracyTrend = previousResult && result.perCharacterAccuracy !== undefined && previousResult.perCharacterAccuracy !== undefined
                ? getTrend(result.perCharacterAccuracy, previousResult.perCharacterAccuracy)
                : null;

              return (
                <tr
                  key={result.id}
                  className={`border-b border-editor-muted/50 ${
                    isCurrentResult ? 'bg-editor-accent/10' : ''
                  }`}
                >
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">
                        #{result.iteration || index + 1}
                      </span>
                      {isCurrentResult && (
                        <span className="text-xs px-2 py-0.5 rounded bg-editor-accent text-white">
                          Current
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono font-bold">{result.wpm}</span>
                      {wpmTrend && (
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            wpmTrend.diff > 0
                              ? 'text-green-400'
                              : wpmTrend.diff < 0
                              ? 'text-red-400'
                              : 'text-editor-muted'
                          }`}
                        >
                          {wpmTrend.diff > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : wpmTrend.diff < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          <span>{wpmTrend.diff > 0 ? '+' : ''}{wpmTrend.diff.toFixed(0)}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono font-bold">{result.accuracy.toFixed(1)}%</span>
                      {accuracyTrend && (
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            accuracyTrend.diff > 0
                              ? 'text-green-400'
                              : accuracyTrend.diff < 0
                              ? 'text-red-400'
                              : 'text-editor-muted'
                          }`}
                        >
                          {accuracyTrend.diff > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : accuracyTrend.diff < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          <span>{accuracyTrend.diff > 0 ? '+' : ''}{accuracyTrend.diff.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="font-mono font-bold">
                        {result.perCharacterAccuracy !== undefined ? `${result.perCharacterAccuracy.toFixed(1)}%` : '—'}
                      </span>
                      {charAccuracyTrend && (
                        <div
                          className={`flex items-center gap-1 text-xs ${
                            charAccuracyTrend.diff > 0
                              ? 'text-green-400'
                              : charAccuracyTrend.diff < 0
                              ? 'text-red-400'
                              : 'text-editor-muted'
                          }`}
                        >
                          {charAccuracyTrend.diff > 0 ? (
                            <TrendingUp className="w-3 h-3" />
                          ) : charAccuracyTrend.diff < 0 ? (
                            <TrendingDown className="w-3 h-3" />
                          ) : (
                            <Minus className="w-3 h-3" />
                          )}
                          <span>{charAccuracyTrend.diff > 0 ? '+' : ''}{charAccuracyTrend.diff.toFixed(1)}%</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right">
                    <span className="font-mono">{result.totalTypedWords}</span>
                  </td>
                  {currentResult.completionTime !== undefined && (
                    <td className="py-3 px-3 text-right">
                      <span className="font-mono">
                        {result.completionTime ? `${result.completionTime.toFixed(1)}s` : '-'}
                      </span>
                    </td>
                  )}
                  <td className="py-3 px-3 text-editor-muted">
                    {new Date(result.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary stats */}
      {history.length > 1 && (
        <div className="mt-4 pt-4 border-t border-editor-muted">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <div className="text-editor-muted">Best WPM</div>
              <div className="font-mono font-bold text-lg">
                {Math.max(...history.map(h => h.wpm))}
              </div>
            </div>
            <div>
              <div className="text-editor-muted">Best Word Acc</div>
              <div className="font-mono font-bold text-lg">
                {Math.max(...history.map(h => h.accuracy)).toFixed(1)}%
              </div>
            </div>
            <div>
              <div className="text-editor-muted">Best Char Acc</div>
              <div className="font-mono font-bold text-lg">
                {history.some(h => h.perCharacterAccuracy !== undefined)
                  ? Math.max(...history.filter(h => h.perCharacterAccuracy !== undefined).map(h => h.perCharacterAccuracy!)).toFixed(1) + '%'
                  : '—'}
              </div>
            </div>
            <div>
              <div className="text-editor-muted">Avg WPM</div>
              <div className="font-mono font-bold text-lg">
                {(history.reduce((sum, h) => sum + h.wpm, 0) / history.length).toFixed(0)}
              </div>
            </div>
            <div>
              <div className="text-editor-muted">Avg Word Acc</div>
              <div className="font-mono font-bold text-lg">
                {(history.reduce((sum, h) => sum + h.accuracy, 0) / history.length).toFixed(1)}%
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
