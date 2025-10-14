'use client';

import { useMemo } from 'react';
import { TestResult } from '@/lib/types';
import { TrendingUp, Target, Award, BarChart3 } from 'lucide-react';

interface AggregateAnalyticsProps {
  results: TestResult[];
}

export function AggregateAnalytics({ results }: AggregateAnalyticsProps) {
  const analytics = useMemo(() => {
    if (results.length === 0) {
      return null;
    }

    // Calculate aggregate statistics
    const totalTests = results.length;
    const avgWPM = results.reduce((sum, r) => sum + r.wpm, 0) / totalTests;
    const avgAccuracy = results.reduce((sum, r) => sum + r.accuracy, 0) / totalTests;
    const bestWPM = Math.max(...results.map(r => r.wpm));
    const bestAccuracy = Math.max(...results.map(r => r.accuracy));

    // Recent performance (last 10 tests)
    const recentTests = results.slice(0, Math.min(10, results.length));
    const recentAvgWPM = recentTests.reduce((sum, r) => sum + r.wpm, 0) / recentTests.length;
    const recentAvgAccuracy = recentTests.reduce((sum, r) => sum + r.accuracy, 0) / recentTests.length;

    // Progress indicators
    const wpmImprovement = recentAvgWPM - avgWPM;
    const accuracyImprovement = recentAvgAccuracy - avgAccuracy;

    // Total words typed
    const totalWordsTyped = results.reduce((sum, r) => sum + (r.totalTypedWords || 0), 0);
    const totalCorrectWords = results.reduce((sum, r) => sum + r.correctWordCount, 0);

    return {
      totalTests,
      avgWPM: Math.round(avgWPM),
      avgAccuracy: Math.round(avgAccuracy * 10) / 10,
      bestWPM: Math.round(bestWPM),
      bestAccuracy: Math.round(bestAccuracy * 10) / 10,
      recentAvgWPM: Math.round(recentAvgWPM),
      recentAvgAccuracy: Math.round(recentAvgAccuracy * 10) / 10,
      wpmImprovement: Math.round(wpmImprovement),
      accuracyImprovement: Math.round(accuracyImprovement * 10) / 10,
      totalWordsTyped,
      totalCorrectWords,
    };
  }, [results]);

  if (!analytics) {
    return null;
  }

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-6">
      <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
        <BarChart3 className="w-6 h-6 text-editor-accent" />
        Aggregate Statistics
      </h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-4">
          <div className="text-xs text-editor-muted mb-1">Total Tests</div>
          <div className="text-3xl font-bold text-editor-accent">{analytics.totalTests}</div>
        </div>
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
          <div className="text-xs text-editor-muted mb-1">Total Words Typed</div>
          <div className="text-3xl font-bold text-blue-400">{analytics.totalWordsTyped}</div>
        </div>
        <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-4">
          <div className="text-xs text-editor-muted mb-1">Correct Words</div>
          <div className="text-3xl font-bold text-green-400">{analytics.totalCorrectWords}</div>
        </div>
        <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-4">
          <div className="text-xs text-editor-muted mb-1">Overall Accuracy</div>
          <div className="text-3xl font-bold text-purple-400">
            {Math.round((analytics.totalCorrectWords / analytics.totalWordsTyped) * 100)}%
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Average Performance */}
        <div className="bg-editor-bg/50 border border-editor-muted/30 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-400" />
            Average Performance
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-editor-muted">Average WPM</span>
              <span className="text-2xl font-bold text-blue-400">{analytics.avgWPM}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-editor-muted">Average Accuracy</span>
              <span className="text-2xl font-bold text-blue-400">{analytics.avgAccuracy}%</span>
            </div>
          </div>
        </div>

        {/* Personal Bests */}
        <div className="bg-editor-bg/50 border border-editor-muted/30 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Award className="w-5 h-5 text-yellow-400" />
            Personal Bests
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-editor-muted">Best WPM</span>
              <span className="text-2xl font-bold text-yellow-400">{analytics.bestWPM}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-editor-muted">Best Accuracy</span>
              <span className="text-2xl font-bold text-yellow-400">{analytics.bestAccuracy}%</span>
            </div>
          </div>
        </div>

        {/* Recent Performance */}
        <div className="bg-editor-bg/50 border border-editor-muted/30 rounded-lg p-5">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Target className="w-5 h-5 text-green-400" />
            Recent Performance
          </h3>
          <p className="text-xs text-editor-muted mb-3">Last {Math.min(10, analytics.totalTests)} tests</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-editor-muted">Recent Avg WPM</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-400">{analytics.recentAvgWPM}</span>
                {analytics.wpmImprovement !== 0 && (
                  <span className={`text-sm font-mono ${analytics.wpmImprovement > 0 ? 'text-green-400' : 'text-orange-400'}`}>
                    {analytics.wpmImprovement > 0 ? '+' : ''}{analytics.wpmImprovement}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-editor-muted">Recent Avg Accuracy</span>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-green-400">{analytics.recentAvgAccuracy}%</span>
                {analytics.accuracyImprovement !== 0 && (
                  <span className={`text-sm font-mono ${analytics.accuracyImprovement > 0 ? 'text-green-400' : 'text-orange-400'}`}>
                    {analytics.accuracyImprovement > 0 ? '+' : ''}{analytics.accuracyImprovement}%
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Progress Indicator */}
        <div className="bg-editor-bg/50 border border-editor-muted/30 rounded-lg p-5 flex flex-col justify-center">
          <h3 className="text-lg font-semibold mb-4">Progress Trend</h3>
          {analytics.wpmImprovement > 0 || analytics.accuracyImprovement > 0 ? (
            <div className="text-center">
              <div className="text-4xl mb-2">🚀</div>
              <p className="text-green-400 font-semibold">You&apos;re improving!</p>
              <p className="text-sm text-editor-muted mt-2">
                Your recent performance is better than your overall average. Keep it up!
              </p>
            </div>
          ) : analytics.wpmImprovement < 0 || analytics.accuracyImprovement < 0 ? (
            <div className="text-center">
              <div className="text-4xl mb-2">📊</div>
              <p className="text-orange-400 font-semibold">Keep practicing!</p>
              <p className="text-sm text-editor-muted mt-2">
                Your recent tests are slightly below average. Stay consistent!
              </p>
            </div>
          ) : (
            <div className="text-center">
              <div className="text-4xl mb-2">✨</div>
              <p className="text-blue-400 font-semibold">Consistent performance!</p>
              <p className="text-sm text-editor-muted mt-2">
                You&apos;re maintaining a steady pace. Great job!
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
