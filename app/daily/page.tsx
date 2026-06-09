'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/store/user-store';
import { getTodayPST } from '@/lib/daily-challenge';
import { getDailyChallengeScore, DailyChallengeResult } from '@/lib/db/daily-challenges';
import { getDailyStreakInfo, DailyStreakInfo } from '@/lib/db/daily-streaks';
import { getTestResultsByUser } from '@/lib/db/test-results';
import { getWeeklyWinner, WeeklyWinner } from '@/lib/db/weekly-winner';

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatDate(dateStr: string): string {
  // dateStr is YYYY-MM-DD, parse in local timezone to avoid off-by-one
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

interface ChallengeCardProps {
  title: string;
  description: string;
  href?: string;
  completed?: boolean;
  score?: { wpm: number; accuracy: number };
  comingSoon?: boolean;
  disabled?: boolean;
}

function ChallengeCard({ title, description, href, completed, score, comingSoon, disabled }: ChallengeCardProps) {
  const isInactive = comingSoon || disabled;
  const content = (
    <div className={`bg-editor-bg border rounded-lg p-6 transition-colors ${
      isInactive
        ? 'border-editor-muted/50 opacity-60'
        : 'border-editor-muted hover:border-editor-accent/50'
    }`}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xl font-bold">{title}</h2>
        <div className="flex items-center gap-2">
          {completed && (
            <span className="text-editor-success text-sm font-medium flex items-center gap-1">
              ✓ Complete
            </span>
          )}
          {comingSoon && (
            <span className="text-editor-muted text-sm">Coming Soon</span>
          )}
          {disabled && !comingSoon && (
            <span className="text-editor-muted text-sm">Locked</span>
          )}
        </div>
      </div>
      <p className="text-editor-muted mb-4">{description}</p>

      {/* Score summary if completed */}
      {completed && score && (
        <div className="flex gap-4 mb-4 text-sm">
          <span className="text-editor-fg font-mono font-bold">{score.wpm} WPM</span>
          <span className="text-editor-fg">{Math.round(score.accuracy)}% accuracy</span>
        </div>
      )}

      {/* Action */}
      {!isInactive && (
        <div className="text-editor-accent font-medium text-sm">
          {completed ? 'View Results / Play Again →' : 'Start Challenge →'}
        </div>
      )}
    </div>
  );

  if (href && !isInactive) {
    return <Link href={href}>{content}</Link>;
  }
  return content;
}

export default function DailyHubPage() {
  const { currentUserId, isAuthenticated } = useUserStore();
  const [today, setToday] = useState('');
  const [streakInfo, setStreakInfo] = useState<DailyStreakInfo | null>(null);
  const [passageScore, setPassageScore] = useState<DailyChallengeResult | null>(null);
  const [quoteScore, setQuoteScore] = useState<DailyChallengeResult | null>(null);
  const [weaknessCompleted, setWeaknessCompleted] = useState(false);
  const [testCount, setTestCount] = useState(0);
  const [weeklyWinner, setWeeklyWinner] = useState<WeeklyWinner | null>(null);
  const [winnerDismissed, setWinnerDismissed] = useState(false);

  useEffect(() => {
    async function loadStatus() {
      const date = getTodayPST();
      setToday(date);

      if (isAuthenticated && currentUserId) {
        const [pScore, qScore, streak, results] = await Promise.all([
          getDailyChallengeScore(currentUserId, date, 'passage'),
          getDailyChallengeScore(currentUserId, date, 'quote'),
          getDailyStreakInfo(currentUserId),
          getTestResultsByUser(currentUserId).catch(() => []),
        ]);
        setPassageScore(pScore);
        setQuoteScore(qScore);
        setStreakInfo(streak);
        setTestCount(results.length);

        // Check weakness completion from localStorage
        const wCompleted = typeof window !== 'undefined' &&
          localStorage.getItem(`cunningtype-weakness-completed-${currentUserId}-${date}`) === 'true';
        setWeaknessCompleted(wCompleted);
      }

      // Load weekly winner (available to all visitors)
      const winner = await getWeeklyWinner();
      setWeeklyWinner(winner);
      if (winner && typeof window !== 'undefined') {
        const dismissKey = `cunningtype-weekly-winner-dismissed-${winner.weekStart}`;
        if (localStorage.getItem(dismissKey) === 'true') {
          setWinnerDismissed(true);
        }
      }
    }
    loadStatus();
  }, [isAuthenticated, currentUserId]);

  const dismissWinner = () => {
    if (weeklyWinner) {
      localStorage.setItem(
        `cunningtype-weekly-winner-dismissed-${weeklyWinner.weekStart}`,
        'true'
      );
      setWinnerDismissed(true);
    }
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Daily Challenges</h1>
          <p className="text-editor-muted">{today ? formatDate(today) : ''}</p>

          {/* Streak display */}
          {streakInfo && isAuthenticated && (
            <div className="flex items-center gap-6 mt-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <div className="text-lg font-bold">{streakInfo.dailyStreak} day{streakInfo.dailyStreak !== 1 ? 's' : ''}</div>
                  <div className="text-xs text-editor-muted">Current streak</div>
                </div>
              </div>
              {streakInfo.bestDailyStreak > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-2xl">⭐</span>
                  <div>
                    <div className="text-lg font-bold">{streakInfo.bestDailyStreak} day{streakInfo.bestDailyStreak !== 1 ? 's' : ''}</div>
                    <div className="text-xs text-editor-muted">Best streak</div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Weekly Winner Banner */}
        {weeklyWinner && !winnerDismissed && (
          <div className="mb-8 bg-editor-accent/10 border border-editor-accent/30 rounded-lg p-6 relative">
            <button
              onClick={dismissWinner}
              className="absolute top-3 right-3 text-editor-muted hover:text-editor-fg transition-colors"
              aria-label="Dismiss"
            >
              ✕
            </button>
            <div className="text-center">
              <div className="text-sm text-editor-accent font-medium mb-1">
                🏆 Last Week&apos;s Champion
              </div>
              <div className="text-2xl font-bold mb-1">
                {weeklyWinner.displayName}
              </div>
              <div className="text-editor-muted text-sm">
                {weeklyWinner.averageWpm} WPM avg · {weeklyWinner.averageAccuracy}% accuracy · {weeklyWinner.daysPlayed} days played
              </div>
              <div className="text-editor-muted text-xs mt-1">
                Week of {formatDateShort(weeklyWinner.weekStart)} – {formatDateShort(weeklyWinner.weekEnd)}
              </div>
            </div>
          </div>
        )}

        {/* Challenge Cards Grid */}
        <div className="grid gap-6">
          {/* Daily Passage Card */}
          <ChallengeCard
            title="Daily Passage"
            description="Type today's passage. Everyone gets the same text — compete for the fastest WPM!"
            href="/daily/passage"
            completed={!!passageScore}
            score={passageScore ? { wpm: passageScore.wpm, accuracy: passageScore.accuracy } : undefined}
          />

          {/* Daily Quote Card */}
          <ChallengeCard
            title="Daily Quote"
            description="A quick famous quote to type — takes 30 seconds. The perfect daily warm-up."
            href="/daily/quote"
            completed={!!quoteScore}
            score={quoteScore ? { wpm: quoteScore.wpm, accuracy: quoteScore.accuracy } : undefined}
          />

          {/* Daily Weakness Attack Card */}
          <ChallengeCard
            title="Weakness Attack"
            description={testCount < 5
              ? `Complete ${5 - testCount} more test${5 - testCount !== 1 ? 's' : ''} to unlock`
              : 'AI-generated passage targeting your slowest sequences and most mistyped words.'
            }
            href="/daily/weakness"
            completed={weaknessCompleted}
            disabled={!isAuthenticated || testCount < 5}
          />
        </div>
      </div>
    </div>
  );
}
