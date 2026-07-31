'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useUserStore } from '@/store/user-store';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import {
  getDailyConfig,
  getDailyContent,
  getTodayPST,
  DailyChallengeConfig,
} from '@/lib/daily-challenge';
import { TypingTest } from '@/components/typing-test/TypingTest';
import {
  DailyLeaderboardEntry,
  getDailyLeaderboard,
  getDailyChallengeScore,
  saveDailyChallengeScore,
  DailyChallengeResult,
} from '@/lib/db/daily-challenges';
import { getDailyStreakInfo, updateDailyStreak, DailyStreakInfo } from '@/lib/db/daily-streaks';
import { getWeeklyWinner, WeeklyWinner } from '@/lib/db/weekly-winner';
import { TestContent } from '@/lib/types';
import { shareResult } from '@/lib/db/test-results';
import { Share2 } from 'lucide-react';

type PageState = 'loading' | 'ready' | 'typing' | 'complete' | 'already-completed';
type DailyMode = 'passage';

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

function formatDateShort(dateStr: string): string {
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
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
      setLoading(true);
      try {
        const data = await getDailyLeaderboard(date, 100, currentUserId ?? undefined, 'daily');
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

export default function DailyChallengePage() {
  const { currentUserId, isAuthenticated } = useUserStore();
  const { initializeTest, resetTest, status, result } = useTestStore();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [today, setToday] = useState<string>('');
  const [config, setConfig] = useState<DailyChallengeConfig | null>(null);
  const [content, setContent] = useState<TestContent | null>(null);
  const [preparedWords, setPreparedWords] = useState<string[]>([]);
  const [existingScore, setExistingScore] = useState<DailyChallengeResult | null>(null);
  const [completedResult, setCompletedResult] = useState<{
    wpm: number;
    accuracy: number;
    completionTime: number;
    testResultId: string;
  } | null>(null);
  const [isPractice, setIsPractice] = useState(false);
  const [streakInfo, setStreakInfo] = useState<DailyStreakInfo | null>(null);
  const [weeklyWinner, setWeeklyWinner] = useState<WeeklyWinner | null>(null);
  const [winnerDismissed, setWinnerDismissed] = useState(false);
  const [shareStatus, setShareStatus] = useState<'idle' | 'sharing' | 'shared' | 'error'>('idle');

  // Track whether we've already handled the current test completion
  const handledResultId = useRef<string | null>(null);

  // Save original autoSave setting and restore on unmount
  const originalAutoSave = useRef(useSettingsStore.getState().autoSave);
  useEffect(() => {
    return () => {
      useSettingsStore.setState({ challengeMode: false });
      useSettingsStore.getState().setAutoSave(originalAutoSave.current);
    };
  }, []);

  // Load daily config, content and check completion status
  useEffect(() => {
    async function initialize() {
      const date = getTodayPST();
      setToday(date);

      // Reset state when switching modes
      setPageState('loading');
      setConfig(null);
      setContent(null);
      setPreparedWords([]);
      setExistingScore(null);
      setCompletedResult(null);
      setIsPractice(false);
      setShareStatus('idle');
      handledResultId.current = null;

      const dailyConfig = getDailyConfig(date);
      setConfig(dailyConfig);

      const dailyContent = getDailyContent(dailyConfig);
      setContent(dailyContent);

      // Truncate to ~60 words so the daily challenge takes ~1 min at 60 WPM
      const rawWords = dailyContent.text.split(/\s+/).filter(Boolean);
      const targetWords = Math.min(60, rawWords.length);
      const count = Math.max(40, targetWords);
      const words = rawWords.slice(0, count);
      setPreparedWords(words);

      if (isAuthenticated && currentUserId) {
        try {
          const score = await getDailyChallengeScore(currentUserId, date, 'daily');
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
      } else {
        setPageState('ready');
      }

      if (isAuthenticated && currentUserId) {
        try {
          const streak = await getDailyStreakInfo(currentUserId);
          setStreakInfo(streak);
        } catch (err) {
          console.error('Failed to load streak info:', err);
        }
      }

      // Load weekly winner (available to all visitors)
      try {
        const winner = await getWeeklyWinner();
        setWeeklyWinner(winner);
        if (winner && typeof window !== 'undefined') {
          const dismissKey = `cunningtype-weekly-winner-dismissed-${winner.weekStart}`;
          if (localStorage.getItem(dismissKey) === 'true') {
            setWinnerDismissed(true);
          }
        }
      } catch (err) {
        console.error('Failed to load weekly winner:', err);
      }
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

      // Restore settings — always reset mistakeThreshold to prevent polluting regular tests
      useSettingsStore.setState({ challengeMode: false });
      useSettingsStore.getState().setMistakeThreshold(-1);

      if (isAuthenticated && currentUserId && !isPractice) {
        try {
          const { isFirstAttempt } = await saveDailyChallengeScore(
            currentUserId,
            today,
            wpm,
            accuracy,
            completionTime,
            testResultId,
            'daily'
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
      if (!config || !content || preparedWords.length === 0) return;

      setIsPractice(practice);
      handledResultId.current = null;

      // Unlock settings to change them
      useSettingsStore.setState({ challengeMode: false });
      const settingsState = useSettingsStore.getState();
      settingsState.setCorrectionMode(config.correctionMode);
      settingsState.setMistakeThreshold(config.errorLimit ?? -1);
      // Disable autoSave so TypingTest doesn't save to testResults —
      // daily challenges save to daily_scores via handleTestComplete instead
      settingsState.setAutoSave(false);
      // Lock settings during challenge
      useSettingsStore.setState({ challengeMode: true });

      resetTest();
      initializeTest(
        {
          duration: config.durationMode === 'timed' ? 60 : 'content-length',
          testContentId: content.id,
          testContentTitle: content.title,
          testContentCategory: content.category,
        },
        preparedWords
      );

      setPageState('typing');
    },
    [config, content, preparedWords, resetTest, initializeTest]
  );

  const playAgain = useCallback(() => {
    startChallenge(true);
  }, [startChallenge]);

  const dismissWinner = () => {
    if (weeklyWinner) {
      localStorage.setItem(
        `cunningtype-weekly-winner-dismissed-${weeklyWinner.weekStart}`,
        'true'
      );
      setWinnerDismissed(true);
    }
  };

  const handleDailyShare = useCallback(
    async (testResultId: string) => {
      if (!currentUserId) return;
      setShareStatus('sharing');
      try {
        const { correctionMode } = useSettingsStore.getState();
        await shareResult(testResultId, currentUserId, preparedWords, correctionMode);
        const url = window.location.origin + '/results/' + testResultId;
        await navigator.clipboard.writeText(url);
        setShareStatus('shared');
        setTimeout(() => setShareStatus('idle'), 2000);
      } catch (err) {
        console.error('Failed to share result:', err);
        setShareStatus('error');
        setTimeout(() => setShareStatus('idle'), 2000);
      }
    },
    [currentUserId, preparedWords]
  );

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
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Daily Challenge</h1>
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

        {/* Ready state */}
        {pageState === 'ready' && config && content && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
            <div className="mb-4">
              <p className="text-sm text-editor-muted uppercase tracking-wider mb-1">Today&apos;s Challenge</p>
              <p className="text-lg font-semibold text-editor-accent">{config.displayLabel}</p>
            </div>
            <h2 className="text-2xl font-bold mb-2">{content.title}</h2>
            {content.source && (
              <p className="text-editor-muted mb-6">&mdash; {content.source}</p>
            )}
            {!content.source && <div className="mb-6" />}
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
        {pageState === 'typing' && <TypingTest onComplete={() => {}} />}

        {/* Complete state */}
        {pageState === 'complete' && completedResult && (
          <>
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

            <DailyLeaderboard date={today} currentUserId={currentUserId} />

            <div className="text-center mt-6 flex items-center justify-center gap-3">
              <button
                onClick={playAgain}
                className="px-6 py-3 border border-editor-muted text-editor-fg hover:bg-editor-muted/20 rounded-lg transition-colors"
              >
                Play Again (Practice)
              </button>
              {isAuthenticated && (
                <button
                  onClick={() => handleDailyShare(completedResult.testResultId)}
                  disabled={shareStatus === 'sharing'}
                  className="px-6 py-3 flex items-center gap-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Share2 size={16} />
                  {shareStatus === 'sharing' ? 'Sharing...' : shareStatus === 'shared' ? 'Link copied!' : shareStatus === 'error' ? 'Error' : 'Share'}
                </button>
              )}
            </div>
          </>
        )}

        {/* Already completed state */}
        {pageState === 'already-completed' && existingScore && (
          <>
            <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 mb-8 text-center">
              <h2 className="text-2xl font-bold mb-6">Today&apos;s Challenge Complete!</h2>
              {config && (
                <p className="text-editor-muted mb-4 text-sm">{config.displayLabel}</p>
              )}
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
              <div className="mt-6 flex items-center justify-center gap-3">
                <button
                  onClick={playAgain}
                  className="px-6 py-3 border border-editor-muted text-editor-fg hover:bg-editor-muted/20 rounded-lg transition-colors"
                >
                  Play Again (Practice)
                </button>
                {isAuthenticated && existingScore.testResultId && (
                  <button
                    onClick={() => handleDailyShare(existingScore.testResultId)}
                    disabled={shareStatus === 'sharing'}
                    className="px-6 py-3 flex items-center gap-2 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Share2 size={16} />
                    {shareStatus === 'sharing' ? 'Sharing...' : shareStatus === 'shared' ? 'Link copied!' : shareStatus === 'error' ? 'Error' : 'Share'}
                  </button>
                )}
              </div>
            </div>
            <DailyLeaderboard date={today} currentUserId={currentUserId} />
          </>
        )}
      </div>
    </div>
  );
}
