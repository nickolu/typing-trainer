'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { TypingTest } from '@/components/typing-test/TypingTest';
import { getTestResult } from '@/lib/db';
import { useTestStore } from '@/store/test-store';
import { useSettingsStore, CorrectionMode, TestDuration } from '@/store/settings-store';
import { TestResult } from '@/lib/types';
import { Zap, Target } from 'lucide-react';

function applyChallengSettings(result: TestResult) {
  const store = useSettingsStore;
  // Ensure challengeMode is off so setters aren't blocked
  store.setState({ challengeMode: false });
  const state = store.getState();
  const challengeCorr = (result.challengeCorrectionMode || 'normal') as CorrectionMode;
  state.setCorrectionMode(challengeCorr);
  state.setDefaultDuration(result.duration as TestDuration);
  // Now lock
  store.setState({ challengeMode: true });
}

export default function ChallengePage() {
  const params = useParams();
  const { initializeTest, resetTest, status, targetWords } = useTestStore();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [ready, setReady] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [challengeInfo, setChallengeInfo] = useState<{
    wpm: number;
    accuracy: number;
    duration: number;
    correctionMode: string;
  } | null>(null);
  const challengeResult = useRef<TestResult | null>(null);

  useEffect(() => {
    async function loadChallenge() {
      try {
        const id = params.id as string;
        const result = await getTestResult(id);

        if (!result) {
          setError('Challenge not found');
          return;
        }

        if (!result.isPublic || !result.challengeWords || result.challengeWords.length === 0) {
          setError('This challenge is no longer available');
          return;
        }

        challengeResult.current = result;

        setChallengeInfo({
          wpm: result.wpm,
          accuracy: result.accuracy,
          duration: result.duration,
          correctionMode: result.challengeCorrectionMode || 'normal',
        });

        // Apply settings after persist rehydration
        // onFinishHydration fires immediately if already hydrated, or after hydration completes
        const unsub = useSettingsStore.persist.onFinishHydration(() => {
          applyChallengSettings(result);
        });

        // Also apply now in case hydration already finished
        if (useSettingsStore.persist.hasHydrated()) {
          applyChallengSettings(result);
        }

        resetTest();
        initializeTest(
          {
            duration: result.duration,
            testContentId: result.testContentId,
          },
          result.challengeWords
        );

        setReady(true);
        setShowDialog(true);

        return unsub;
      } catch (err) {
        console.error('Failed to load challenge:', err);
        setError('Failed to load challenge');
      } finally {
        setLoading(false);
      }
    }

    if (!ready) {
      loadChallenge();
    } else {
      setLoading(false);
    }
  }, [params.id, ready, initializeTest, resetTest]);

  // Restore settings when leaving the page
  useEffect(() => {
    return () => {
      useSettingsStore.setState({ challengeMode: false });
    };
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-muted">Loading challenge...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-error">{error}</p>
      </div>
    );
  }

  const correctionModeLabel = {
    normal: 'Normal',
    speed: 'Speed (no backspace)',
    strict: 'Strict (wrong keys blocked)',
  }[challengeInfo?.correctionMode || 'normal'];

  return (
    <>
      {/* Challenge dialog overlay */}
      {showDialog && challengeInfo && (
        <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
          <div className="bg-editor-bg border border-editor-muted rounded-xl p-8 max-w-md w-full text-center">
            <h2 className="text-3xl font-bold mb-2">You&apos;ve Been Challenged!</h2>
            <p className="text-editor-muted mb-6">Can you beat this score?</p>

            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="bg-editor-bg/50 border border-editor-muted rounded-lg p-4">
                <Zap className="w-6 h-6 mx-auto mb-2 text-editor-accent" />
                <div className="text-3xl font-bold">{challengeInfo.wpm}</div>
                <div className="text-sm text-editor-muted">WPM</div>
              </div>
              <div className="bg-editor-bg/50 border border-editor-muted rounded-lg p-4">
                <Target className="w-6 h-6 mx-auto mb-2 text-editor-accent" />
                <div className="text-3xl font-bold">{challengeInfo.accuracy}%</div>
                <div className="text-sm text-editor-muted">Accuracy</div>
              </div>
            </div>

            <div className="text-sm text-editor-muted mb-6 space-y-1">
              <p>{challengeInfo.duration}s test &middot; {correctionModeLabel}</p>
            </div>

            <button
              onClick={() => setShowDialog(false)}
              className="w-full px-6 py-4 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-bold text-lg transition-colors"
            >
              Start Typing
            </button>
          </div>
        </div>
      )}

      {ready && <TypingTest />}
    </>
  );
}
