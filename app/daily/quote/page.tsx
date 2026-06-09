'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/store/user-store';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import { getTodayPST } from '@/lib/daily-challenge';
import { getDailyQuote, quoteToText, DailyQuote } from '@/lib/daily-quotes';
import { textToWords } from '@/lib/test-content';
import { TypingTest } from '@/components/typing-test/TypingTest';
import {
  DailyLeaderboardEntry,
  getDailyLeaderboard,
  getDailyChallengeScore,
  saveDailyChallengeScore,
  DailyChallengeResult,
} from '@/lib/db/daily-challenges';
import { getDailyStreakInfo, updateDailyStreak, DailyStreakInfo } from '@/lib/db/daily-streaks';

type PageState = 'loading' | 'ready' | 'typing' | 'complete' | 'already-completed';

function formatDate(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

interface DailyLeaderboardProps {
  date: string;
  currentUserId: string | null;
}

function DailyQuoteLeaderboard({ date, currentUserId }: DailyLeaderboardProps) {
  const [entries, setEntries] = useState<DailyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const data = await getDailyLeaderboard(date, 100, currentUserId ?? undefined, 'quote');
        setEntries(data);
      } catch (err) {
        console.error('Failed to load daily quote leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLeaderboard();
  }, [date, currentUserId]);

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg overflow-hidden">
      <div className="px-6 py-4 border-b border-editor-muted flex items-center justify-between">
        <h2 className="text-xl font-bold">Daily Leaderboard</h2>
        <span className="text-sm text-editor-muted">Accuracy &ge;95% required to qualify</span>
      </div>

      {loading ? (
        <div className="p-8 text-center text-editor-muted">Loading leaderboard...</div>
      ) : entries.length === 0 ? (
        <div className="p-8 text-center text-editor-muted">
          No qualifying scores yet. Be the first!
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="bg-editor-muted/20 border-b border-editor-muted">
              <th className="px-6 py-3 text-left text-sm font-semibold text-editor-fg">Rank</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-editor-fg">Name</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-editor-fg">WPM</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-editor-fg">Accuracy</th>
              <th className="px-6 py-3 text-right text-sm font-semibold text-editor-fg">Time</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.userId}
                className={`border-b border-editor-muted/30 transition-colors ${
                  entry.isCurrentUser
                    ? 'bg-editor-accent/10 hover:bg-editor-accent/15'
                    : 'hover:bg-editor-muted/10'
                }`}
              >
                <td className="px-6 py-3 text-editor-fg font-medium">
                  <span className={entry.rank <= 3 ? 'text-editor-accent font-bold' : ''}>
                    #{entry.rank}
                  </span>
                </td>
                <td className="px-6 py-3 text-editor-fg">
                  {entry.displayName}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs text-editor-accent">(you)</span>
                  )}
                </td>
                <td className="px-6 py-3 text-right font-mono font-bold text-editor-fg">
                  <span className={entry.rank <= 3 ? 'text-editor-accent' : ''}>{entry.wpm}</span>
                </td>
                <td className="px-6 py-3 text-right text-editor-fg">{entry.accuracy}%</td>
                <td className="px-6 py-3 text-right text-editor-fg font-mono">
                  {formatTime(entry.completionTime)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default function DailyQuotePage() {
  const { currentUserId, isAuthenticated } = useUserStore();
  const { initializeTest, resetTest, status, result } = useTestStore();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [today, setToday] = useState<string>('');
  const [quote, setQuote] = useState<DailyQuote | null>(null);
  const [existingScore, setExistingScore] = useState<DailyChallengeResult | null>(null);
  const [completedResult, setCompletedResult] = useState<{
    wpm: number;
    accuracy: number;
    completionTime: number;
    testResultId: string;
  } | null>(null);
  const [isPractice, setIsPractice] = useState(false);
  const [streakInfo, setStreakInfo] = useState<DailyStreakInfo | null>(null);

  // Track whether we've already handled the current test completion
  const handledResultId = useRef<string | null>(null);

  // Lock settings on mount, restore on unmount
  useEffect(() => {
    const unlockSettings = () => {
      useSettingsStore.setState({ challengeMode: false });
    };
    return unlockSettings;
  }, []);

  // Load daily quote and check completion status
  useEffect(() => {
    async function initialize() {
      const date = getTodayPST();
      setToday(date);
      const dailyQuote = getDailyQuote(date);
      setQuote(dailyQuote);

      if (isAuthenticated && currentUserId) {
        try {
          const score = await getDailyChallengeScore(currentUserId, date, 'quote');
          if (score) {
            setExistingScore(score);
            setPageState('already-completed');
          } else {
            setPageState('ready');
          }
        } catch (err) {
          console.error('Failed to check daily quote status:', err);
          setPageState('ready');
        }
        try {
          const streak = await getDailyStreakInfo(currentUserId);
          setStreakInfo(streak);
        } catch (err) {
          console.error('Failed to load streak info:', err);
        }
        return;
      }

      setPageState('ready');
    }
    initialize();
  }, [isAuthenticated, currentUserId]);

  // Watch for test completion
  useEffect(() => {
    if (
      status === 'complete' &&
      result !== null &&
      pageState === 'typing' &&
      handledResultId.current !== result.id
    ) {
      handledResultId.current = result.id;
      handleTestComplete(result);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, result, pageState]);

  const handleTestComplete = useCallback(
    async (testResult: typeof result) => {
      if (!testResult || !today) return;

      const wpm = testResult.wpm;
      const accuracy = testResult.perCharacterAccuracy ?? testResult.accuracy;
      const completionTime = testResult.completionTime ?? testResult.duration;
      const testResultId = testResult.id;

      // Restore challenge mode off
      useSettingsStore.setState({ challengeMode: false });

      if (isAuthenticated && currentUserId && !isPractice) {
        try {
          const { isFirstAttempt } = await saveDailyChallengeScore(
            currentUserId,
            today,
            wpm,
            accuracy,
            completionTime,
            testResultId,
            'quote'
          );
          if (isFirstAttempt) {
            const updatedStreak = await updateDailyStreak(currentUserId);
            setStreakInfo(updatedStreak);
          } else {
            // Race condition — already submitted
            setIsPractice(true);
          }
        } catch (err) {
          console.error('Failed to save daily quote score:', err);
        }
      }

      setCompletedResult({ wpm, accuracy, completionTime, testResultId });
      setPageState('complete');
    },
    [today, isAuthenticated, currentUserId, isPractice]
  );

  const startChallenge = useCallback(
    (practice: boolean = false) => {
      if (!quote) return;

      setIsPractice(practice);
      handledResultId.current = null;

      // Unlock settings to change them, then lock
      useSettingsStore.setState({ challengeMode: false });
      const settingsState = useSettingsStore.getState();
      settingsState.setCorrectionMode('normal');
      useSettingsStore.setState({ challengeMode: true });

      const quoteText = quoteToText(quote);
      const words = textToWords(quoteText, 1);

      resetTest();
      initializeTest(
        {
          duration: 'content-length',
          testContentId: `daily-quote-${today}`,
          testContentTitle: `Daily Quote by ${quote.author}`,
          testContentCategory: 'quote',
        },
        words
      );

      setPageState('typing');
    },
    [quote, today, resetTest, initializeTest]
  );

  const playAgain = useCallback(() => {
    startChallenge(true);
  }, [startChallenge]);

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-muted">Loading daily quote...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back link */}
        <div className="mb-4">
          <Link href="/daily" className="text-editor-muted hover:text-editor-fg text-sm transition-colors">
            ← Back to Daily Challenges
          </Link>
        </div>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Daily Quote</h1>
          <p className="text-editor-muted">
            {today ? formatDate(today) : ''} &mdash; A quick typing exercise. First attempt counts!
          </p>
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

        {/* Ready state: show quote and start button */}
        {pageState === 'ready' && quote && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
            {/* Quote display */}
            <blockquote className="mb-6">
              <p className="text-2xl italic text-editor-fg leading-relaxed mb-4">
                &ldquo;{quote.text}&rdquo;
              </p>
              <footer className="text-editor-muted text-base">
                &mdash; {quote.author}
                {quote.source && <span className="text-editor-muted/70">, <em>{quote.source}</em></span>}
              </footer>
            </blockquote>
            {!isAuthenticated && (
              <p className="text-editor-muted mb-4 text-sm">
                Sign in to save your score and appear on the leaderboard.
              </p>
            )}
            <button
              onClick={() => startChallenge(false)}
              className="px-8 py-4 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-bold text-lg transition-colors"
            >
              Start Daily Challenge
            </button>
          </div>
        )}

        {/* Typing state */}
        {pageState === 'typing' && <TypingTest />}

        {/* Complete state */}
        {pageState === 'complete' && completedResult && (
          <>
            {/* Results summary */}
            <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 mb-8">
              <p className="text-center text-editor-muted mb-6">
                You typed this quote in {formatTime(completedResult.completionTime)} at {completedResult.wpm} WPM
              </p>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-3xl font-bold">{completedResult.wpm}</div>
                  <div className="text-editor-muted">WPM</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{Math.round(completedResult.accuracy)}%</div>
                  <div className="text-editor-muted">Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {formatTime(completedResult.completionTime)}
                  </div>
                  <div className="text-editor-muted">Time</div>
                </div>
              </div>
              {isPractice && (
                <p className="text-editor-muted text-center mt-4">
                  Practice run &mdash; your first attempt is your official score
                </p>
              )}
            </div>

            {/* Leaderboard */}
            <DailyQuoteLeaderboard date={today} currentUserId={currentUserId} />

            {/* Play again button */}
            <div className="text-center mt-6">
              <button
                onClick={playAgain}
                className="px-6 py-3 border border-editor-muted text-editor-fg hover:bg-editor-muted/20 rounded-lg transition-colors"
              >
                Play Again (Practice)
              </button>
            </div>
          </>
        )}

        {/* Already completed state */}
        {pageState === 'already-completed' && existingScore && (
          <>
            <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 mb-8 text-center">
              <h2 className="text-2xl font-bold mb-2">Today&apos;s Quote Complete!</h2>
              <p className="text-editor-muted mb-6">
                You typed this quote in {formatTime(existingScore.completionTime)} at {existingScore.wpm} WPM
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <div className="text-3xl font-bold">{existingScore.wpm}</div>
                  <div className="text-editor-muted">WPM</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">{Math.round(existingScore.accuracy)}%</div>
                  <div className="text-editor-muted">Accuracy</div>
                </div>
                <div>
                  <div className="text-3xl font-bold">
                    {formatTime(existingScore.completionTime)}
                  </div>
                  <div className="text-editor-muted">Time</div>
                </div>
              </div>
              <button
                onClick={playAgain}
                className="mt-6 px-6 py-3 border border-editor-muted text-editor-fg hover:bg-editor-muted/20 rounded-lg transition-colors"
              >
                Play Again (Practice)
              </button>
            </div>
            <DailyQuoteLeaderboard date={today} currentUserId={currentUserId} />
          </>
        )}
      </div>
    </div>
  );
}
