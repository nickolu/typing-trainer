'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/store/user-store';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import { getDailyPassage, getTodayPST } from '@/lib/daily-challenge';
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
import { TestContent } from '@/lib/types';

type PageState = 'loading' | 'ready' | 'typing' | 'complete' | 'already-completed';

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

function DailyLeaderboard({ date, currentUserId }: DailyLeaderboardProps) {
  const [entries, setEntries] = useState<DailyLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLeaderboard() {
      try {
        const data = await getDailyLeaderboard(date, 100, currentUserId ?? undefined);
        setEntries(data);
      } catch (err) {
        console.error('Failed to load daily leaderboard:', err);
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
            {entries.map((entry, index) => (
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

export default function DailyPassagePage() {
  const { currentUserId, isAuthenticated } = useUserStore();
  const { initializeTest, resetTest, status, result } = useTestStore();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [today, setToday] = useState<string>('');
  const [passage, setPassage] = useState<TestContent | null>(null);
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

  // Load daily passage and check completion status
  useEffect(() => {
    async function initialize() {
      const date = getTodayPST();
      setToday(date);
      const dailyPassage = getDailyPassage(date);
      setPassage(dailyPassage);

      if (isAuthenticated && currentUserId) {
        try {
          const score = await getDailyChallengeScore(currentUserId, date);
          if (score) {
            setExistingScore(score);
            setPageState('already-completed');
          } else {
            setPageState('ready');
          }
        } catch (err) {
          console.error('Failed to check daily challenge status:', err);
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
  }, [status, result, pageState]);

  const handleTestComplete = useCallback(
    async (testResult: typeof result) => {
      if (!testResult || !today) return;

      const wpm = testResult.wpm;
      const accuracy = testResult.perCharacterAccuracy ?? testResult.accuracy;
      const completionTime = testResult.completionTime ?? testResult.duration;
      const testResultId = testResult.id;

      // Restore challenge mode off (test is done)
      useSettingsStore.setState({ challengeMode: false });

      if (isAuthenticated && currentUserId && !isPractice) {
        try {
          const { isFirstAttempt } = await saveDailyChallengeScore(
            currentUserId,
            today,
            wpm,
            accuracy,
            completionTime,
            testResultId
          );
          if (isFirstAttempt) {
            const updatedStreak = await updateDailyStreak(currentUserId);
            setStreakInfo(updatedStreak);
          } else {
            // Race condition — already submitted
            setIsPractice(true);
          }
        } catch (err) {
          console.error('Failed to save daily challenge score:', err);
        }
      }

      setCompletedResult({ wpm, accuracy, completionTime, testResultId });
      setPageState('complete');
    },
    [today, isAuthenticated, currentUserId, isPractice]
  );

  const startChallenge = useCallback(
    (practice: boolean = false) => {
      if (!passage) return;

      setIsPractice(practice);
      handledResultId.current = null;

      // Unlock settings to change them, then lock
      useSettingsStore.setState({ challengeMode: false });
      const settingsState = useSettingsStore.getState();
      settingsState.setCorrectionMode('normal');
      useSettingsStore.setState({ challengeMode: true });

      const words = textToWords(passage.text);

      resetTest();
      initializeTest(
        {
          duration: 'content-length',
          testContentId: passage.id,
          testContentTitle: passage.title,
          testContentCategory: passage.category,
        },
        words
      );

      setPageState('typing');
    },
    [passage, resetTest, initializeTest]
  );

  const playAgain = useCallback(() => {
    startChallenge(true);
  }, [startChallenge]);

  if (pageState === 'loading') {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-muted">Loading daily challenge...</p>
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
          <h1 className="text-4xl font-bold mb-2">Daily Passage</h1>
          <p className="text-editor-muted">
            {today ? formatDate(today) : ''} &mdash; Everyone types the same passage. First attempt counts!
          </p>
          {/* Streak display - show below the header */}
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

        {/* Ready state: show passage title and start button */}
        {pageState === 'ready' && passage && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">{passage.title}</h2>
            {passage.source && (
              <p className="text-editor-muted mb-6">&mdash; {passage.source}</p>
            )}
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
            <DailyLeaderboard date={today} currentUserId={currentUserId} />

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
              <h2 className="text-2xl font-bold mb-6">Today&apos;s Challenge Complete!</h2>
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
            <DailyLeaderboard date={today} currentUserId={currentUserId} />
          </>
        )}
      </div>
    </div>
  );
}
