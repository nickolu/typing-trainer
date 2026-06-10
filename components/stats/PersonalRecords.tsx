'use client';

import { useMemo } from 'react';
import { TestResult } from '@/lib/types';
import { DailyStreakInfo } from '@/lib/db/daily-streaks';
import { useSettingsStore } from '@/store/settings-store';

interface PersonalRecordsProps {
  results: TestResult[];
  streakInfo: DailyStreakInfo | null;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface RecordCard {
  label: string;
  value: string;
  date: string | null;
  goalProgress?: { currentAvg: number; progress: number };
}

export function PersonalRecords({ results, streakInfo }: PersonalRecordsProps) {
  const { wpmGoal } = useSettingsStore();

  const records = useMemo(() => {
    // Filter out practice and deleted results
    const valid = results.filter(
      (r) => !r.isPractice && r.status !== 'DELETED'
    );

    // Best WPM
    let bestWpmResult: TestResult | null = null;
    for (const r of valid) {
      if (!bestWpmResult || r.wpm > bestWpmResult.wpm) {
        bestWpmResult = r;
      }
    }

    // Best Accuracy
    let bestAccuracyResult: TestResult | null = null;
    for (const r of valid) {
      const acc = r.perCharacterAccuracy ?? r.accuracy;
      const bestAcc = bestAccuracyResult
        ? (bestAccuracyResult.perCharacterAccuracy ?? bestAccuracyResult.accuracy)
        : -1;
      if (acc > bestAcc) {
        bestAccuracyResult = r;
      }
    }

    // Fastest Test (lowest completionTime > 0)
    let fastestResult: TestResult | null = null;
    for (const r of valid) {
      if (r.completionTime && r.completionTime > 0) {
        if (!fastestResult || r.completionTime < fastestResult.completionTime!) {
          fastestResult = r;
        }
      }
    }

    const cards: RecordCard[] = [
      {
        label: 'Best WPM',
        value: bestWpmResult ? `${Math.round(bestWpmResult.wpm)}` : '—',
        date: bestWpmResult ? formatDate(bestWpmResult.createdAt) : null,
      },
      {
        label: 'Best Accuracy',
        value: bestAccuracyResult
          ? `${Math.round(bestAccuracyResult.perCharacterAccuracy ?? bestAccuracyResult.accuracy)}%`
          : '—',
        date: bestAccuracyResult ? formatDate(bestAccuracyResult.createdAt) : null,
      },
      {
        label: 'Fastest Test',
        value: fastestResult
          ? `${fastestResult.completionTime!.toFixed(1)}s`
          : '—',
        date: fastestResult ? formatDate(fastestResult.createdAt) : null,
      },
      {
        label: 'Longest Streak',
        value: streakInfo ? `${streakInfo.bestDailyStreak} days` : '—',
        date: null,
      },
    ];

    if (wpmGoal > 0) {
      const sorted = [...valid].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      const recent = sorted.slice(0, 10);
      const currentAvg =
        recent.length > 0
          ? Math.round(recent.reduce((sum, r) => sum + r.wpm, 0) / recent.length)
          : 0;
      const progress = Math.min(100, Math.round((currentAvg / wpmGoal) * 100));

      cards.push({
        label: 'WPM Goal',
        value: `${wpmGoal}`,
        date: null,
        goalProgress: { currentAvg, progress },
      });
    }

    return cards;
  }, [results, streakInfo, wpmGoal]);

  const gridCols = records.length === 5 ? 'lg:grid-cols-5' : 'lg:grid-cols-4';

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <h2 className="text-sm font-medium text-editor-muted uppercase tracking-wider mb-3">
        Personal Records
      </h2>
      <div className={`grid grid-cols-2 ${gridCols} gap-3`}>
        {records.map((record) => (
          <div
            key={record.label}
            className="bg-editor-bg border border-editor-muted/50 rounded-lg p-3 flex flex-col gap-1"
          >
            <span className="text-xs text-editor-muted font-medium">{record.label}</span>
            <span className="text-2xl font-bold text-editor-accent">{record.value}</span>
            {record.goalProgress ? (
              <>
                <div className="w-full bg-editor-muted/30 rounded-full h-2 mt-1">
                  <div
                    className="bg-editor-accent rounded-full h-2 transition-all"
                    style={{ width: `${record.goalProgress.progress}%` }}
                  />
                </div>
                <span className="text-xs text-editor-muted mt-1">
                  Avg: {record.goalProgress.currentAvg} WPM ({record.goalProgress.progress}%)
                </span>
              </>
            ) : record.date ? (
              <span className="text-xs text-editor-muted">{record.date}</span>
            ) : (
              <span className="text-xs text-editor-muted invisible">placeholder</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
