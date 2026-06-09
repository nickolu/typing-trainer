'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useUserStore } from '@/store/user-store';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore } from '@/store/settings-store';
import { textToWords } from '@/lib/test-content';
import { TypingTest } from '@/components/typing-test/TypingTest';
import { getTodayPST } from '@/lib/daily-challenge';
import { getAggregateSlowSequences } from '@/lib/db/analytics';
import { getTestResultsByUser } from '@/lib/db/test-results';
import { getDailyStreakInfo, updateDailyStreak, DailyStreakInfo } from '@/lib/db/daily-streaks';

type PageState = 'loading' | 'insufficient-data' | 'generating' | 'ready' | 'typing' | 'complete' | 'error';

interface WeaknessContent {
  text: string;
  title: string;
  targetSequences: string[];
  date: string;
}

function getCacheKey(userId: string, date: string): string {
  return `cunningtype-weakness-${userId}-${date}`;
}

function getCompletionKey(userId: string, date: string): string {
  return `cunningtype-weakness-completed-${userId}-${date}`;
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${Math.round(seconds)}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return `${m}m ${s}s`;
}

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

export default function DailyWeaknessPage() {
  const { currentUserId, isAuthenticated } = useUserStore();
  const { initializeTest, resetTest, status, result } = useTestStore();

  const [pageState, setPageState] = useState<PageState>('loading');
  const [today, setToday] = useState<string>('');
  const [testCount, setTestCount] = useState(0);
  const [content, setContent] = useState<WeaknessContent | null>(null);
  const [completedResult, setCompletedResult] = useState<{
    wpm: number;
    accuracy: number;
    completionTime: number;
    testResultId: string;
  } | null>(null);
  const [isPractice, setIsPractice] = useState(false);
  const [streakInfo, setStreakInfo] = useState<DailyStreakInfo | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  const handledResultId = useRef<string | null>(null);

  // Lock settings on mount, restore on unmount
  useEffect(() => {
    return () => {
      useSettingsStore.setState({ challengeMode: false });
    };
  }, []);

  // Initialize: check auth, fetch analytics, generate content
  useEffect(() => {
    async function initialize() {
      const date = getTodayPST();
      setToday(date);

      if (!isAuthenticated || !currentUserId) {
        // Non-authenticated users can't use this mode (no analytics to draw from)
        setPageState('insufficient-data');
        setTestCount(0);
        return;
      }

      try {
        // Load streak info in parallel with test results
        const [results, streak] = await Promise.all([
          getTestResultsByUser(currentUserId),
          getDailyStreakInfo(currentUserId).catch(() => null),
        ]);

        setStreakInfo(streak);
        const count = results.length;
        setTestCount(count);

        if (count < 5) {
          setPageState('insufficient-data');
          return;
        }

        // Check localStorage cache for today's generated content
        const cacheKey = getCacheKey(currentUserId, date);
        const cached = typeof window !== 'undefined' ? localStorage.getItem(cacheKey) : null;

        if (cached) {
          try {
            const parsed: WeaknessContent = JSON.parse(cached);
            if (parsed.date === date) {
              setContent(parsed);
              setPageState('ready');
              return;
            }
          } catch {
            // Invalid cache, regenerate
          }
        }

        // Generate new content
        setPageState('generating');

        const sequences = await getAggregateSlowSequences(currentUserId, 10);

        if (sequences.length === 0) {
          // Fall back to generating with generic approach — not enough typed data
          setErrorMessage('Not enough sequence data yet. Complete more tests with varied content.');
          setPageState('insufficient-data');
          return;
        }

        const response = await fetch('/api/generate-weakness', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sequences }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Generation failed' }));
          throw new Error(err.error || 'Failed to generate content');
        }

        const generated = await response.json();

        const weaknessContent: WeaknessContent = {
          text: generated.text,
          title: generated.title,
          targetSequences: sequences,
          date,
        };

        // Cache the generated content
        if (typeof window !== 'undefined') {
          localStorage.setItem(cacheKey, JSON.stringify(weaknessContent));
        }

        setContent(weaknessContent);
        setPageState('ready');
      } catch (err) {
        console.error('Failed to initialize weakness page:', err);
        setErrorMessage(err instanceof Error ? err.message : 'Failed to load challenge');
        setPageState('error');
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

      // Restore challenge mode off
      useSettingsStore.setState({ challengeMode: false });

      if (isAuthenticated && currentUserId && !isPractice) {
        // Mark as completed in localStorage
        const completionKey = getCompletionKey(currentUserId, today);
        const alreadyCompleted = typeof window !== 'undefined' &&
          localStorage.getItem(completionKey) === 'true';

        if (!alreadyCompleted) {
          if (typeof window !== 'undefined') {
            localStorage.setItem(completionKey, 'true');
          }
          // Update daily streak
          try {
            const updatedStreak = await updateDailyStreak(currentUserId);
            setStreakInfo(updatedStreak);
          } catch (err) {
            console.error('Failed to update daily streak:', err);
          }
        }
      }

      setCompletedResult({ wpm, accuracy, completionTime, testResultId });
      setPageState('complete');
    },
    [today, isAuthenticated, currentUserId, isPractice]
  );

  const startChallenge = useCallback(
    (practice: boolean = false) => {
      if (!content) return;

      setIsPractice(practice);
      handledResultId.current = null;

      // Unlock settings to change them, then lock
      useSettingsStore.setState({ challengeMode: false });
      const settingsState = useSettingsStore.getState();
      settingsState.setCorrectionMode('normal');
      useSettingsStore.setState({ challengeMode: true });

      const words = textToWords(content.text);

      resetTest();
      initializeTest(
        {
          duration: 'content-length',
          testContentId: `weakness-attack-${today}`,
          testContentTitle: content.title,
          testContentCategory: 'weakness',
        },
        words
      );

      setPageState('typing');
    },
    [content, today, resetTest, initializeTest]
  );

  const playAgain = useCallback(() => {
    startChallenge(true);
  }, [startChallenge]);

  const retryGeneration = useCallback(() => {
    // Clear cache to force regeneration
    if (currentUserId && today && typeof window !== 'undefined') {
      localStorage.removeItem(getCacheKey(currentUserId, today));
    }
    setPageState('loading');
    setErrorMessage('');
  }, [currentUserId, today]);

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
          <h1 className="text-4xl font-bold mb-2">Weakness Attack</h1>
          <p className="text-editor-muted">
            {today ? formatDate(today) : ''} &mdash; Personalized challenge targeting your weak spots.
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

        {/* Insufficient data state */}
        {pageState === 'insufficient-data' && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Not Enough Data Yet</h2>
            <p className="text-editor-muted mb-4">
              Complete at least 5 typing tests so we can identify your weak spots.
            </p>
            {errorMessage ? (
              <p className="text-editor-muted text-sm mb-6">{errorMessage}</p>
            ) : (
              <p className="text-editor-muted text-sm mb-6">
                You&apos;ve completed {testCount} of 5 required tests.
              </p>
            )}
            <Link
              href="/"
              className="px-6 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
            >
              Take a Typing Test
            </Link>
          </div>
        )}

        {/* Generating state */}
        {pageState === 'generating' && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Generating Your Challenge...</h2>
            <p className="text-editor-muted">Creating a passage that targets your weak spots</p>
            <div className="mt-4 animate-pulse text-editor-accent">Analyzing your sequences...</div>
          </div>
        )}

        {/* Error state */}
        {pageState === 'error' && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">Something Went Wrong</h2>
            <p className="text-editor-muted mb-6">{errorMessage || 'Failed to generate your challenge.'}</p>
            <button
              onClick={retryGeneration}
              className="px-6 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Ready state */}
        {pageState === 'ready' && content && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-4">Today&apos;s Weakness Attack</h2>
            <p className="text-editor-muted mb-6">
              Today we&apos;re targeting your slowest sequences:
            </p>
            <div className="flex flex-wrap gap-2 mb-6">
              {content.targetSequences.map((seq, i) => (
                <span
                  key={i}
                  className="px-3 py-1 bg-editor-accent/10 border border-editor-accent/30 rounded-full text-editor-accent font-mono text-sm"
                >
                  {seq}
                </span>
              ))}
            </div>
            <button
              onClick={() => startChallenge(false)}
              className="px-8 py-4 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-bold text-lg transition-colors"
            >
              Start Weakness Attack
            </button>
          </div>
        )}

        {/* Typing state */}
        {pageState === 'typing' && <TypingTest />}

        {/* Complete state */}
        {pageState === 'complete' && completedResult && content && (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-8">
            <h2 className="text-2xl font-bold mb-2 text-center">Practice Complete!</h2>
            <p className="text-editor-muted text-center mb-6">
              Keep working on those sequences.
            </p>
            <div className="grid grid-cols-3 gap-4 text-center mb-6">
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

            {/* Show targeted sequences */}
            <div className="mb-6">
              <p className="text-editor-muted text-sm mb-3">Sequences targeted today:</p>
              <div className="flex flex-wrap gap-2">
                {content.targetSequences.map((seq, i) => (
                  <span
                    key={i}
                    className="px-3 py-1 bg-editor-accent/10 border border-editor-accent/30 rounded-full text-editor-accent font-mono text-sm"
                  >
                    {seq}
                  </span>
                ))}
              </div>
            </div>

            <div className="text-center">
              <button
                onClick={playAgain}
                className="px-6 py-3 border border-editor-muted text-editor-fg hover:bg-editor-muted/20 rounded-lg transition-colors"
              >
                Play Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
