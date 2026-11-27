'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target, BrainCircuit } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import { TestResult } from '@/lib/types';
import { problemWordsFromResults } from '@/lib/test-engine/word-errors';
import { textToWords, calculateRequiredWords } from '@/lib/test-content';
import { saveTestContent } from '@/lib/db';
import { useSettingsStore } from '@/store/settings-store';
import { useTestStore } from '@/store/test-store';
import { useUserStore } from '@/store/user-store';

interface ProblemWordsProps {
  /** Results to analyze — the stats page passes its time- and label-filtered set. */
  results: TestResult[];
  /** True while the results' word lists are still being resolved. */
  isLoading?: boolean;
}

const MAX_WORDS = 20;

export function formatRelativeTime(timestamp: number, now: number = Date.now()): string {
  const seconds = Math.max(0, Math.floor((now - timestamp) / 1000));
  if (seconds < 60) return 'just now';
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function ProblemWords({ results, isLoading = false }: ProblemWordsProps) {
  const router = useRouter();
  const { currentUserId } = useUserStore();
  const { defaultDuration, llmModel, llmTemperature } = useSettingsStore();
  const { initializeTest, resetTest } = useTestStore();
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const words = useMemo(() => problemWordsFromResults(results).slice(0, MAX_WORDS), [results]);

  // Explicit user action: generate an AI practice passage from the words shown here and
  // open it on the home page. Mirrors the aggregate analytics' targeted practice flow.
  const handlePractice = async () => {
    setError(null);
    setIsGenerating(true);
    try {
      const practiceWords = words.map((w) => w.word);
      const requiredWords =
        defaultDuration === 'content-length' ? 100 : calculateRequiredWords(defaultDuration);

      const response = await fetch('/api/generate-practice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: practiceWords,
          options: { model: llmModel, temperature: llmTemperature, minWords: requiredWords },
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to generate practice content');
      }
      const practice = await response.json();
      const testWords = textToWords(practice.text, requiredWords);

      // Save the content so the result can be retried and its words analyzed later.
      let testContentId = 'ai-problem-words-practice';
      if (currentUserId) {
        try {
          testContentId = await saveTestContent(
            { id: uuidv4(), userId: currentUserId, text: practice.text, words: testWords },
            currentUserId
          );
        } catch (err) {
          console.error('Failed to save practice content:', err);
        }
      }

      resetTest();
      initializeTest(
        {
          duration: defaultDuration,
          testContentId,
          testContentTitle: practice.title || 'Problem Words Practice',
          testContentCategory: 'AI Problem Words',
          isPractice: true,
          practiceSequences: practiceWords,
        },
        testWords
      );
      router.push('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate practice content');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-orange-500" />
            <h2 className="text-lg font-bold">Problem Words</h2>
          </div>
          <p className="text-editor-muted text-xs mt-1">
            Words you mistyped in the selected tests, including typos you corrected.
          </p>
        </div>
        {words.length > 0 && (
          <button
            onClick={handlePractice}
            disabled={isGenerating}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 disabled:cursor-not-allowed text-white rounded text-sm font-medium transition-colors flex items-center gap-2 whitespace-nowrap"
          >
            {isGenerating ? (
              <>
                <BrainCircuit className="w-4 h-4 animate-spin" />
                Generating...
              </>
            ) : (
              'Practice these'
            )}
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 mb-3">
          <p className="text-sm text-red-400">{error}</p>
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-6">
          <p className="text-editor-muted text-sm">Loading...</p>
        </div>
      ) : words.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-editor-muted text-sm">No mistyped words in this range.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {words.map(({ word, count, lastSeenAt }) => (
            <div
              key={word}
              className="flex items-center justify-between p-2 bg-editor-muted/20 rounded hover:bg-editor-muted/30 transition-colors"
            >
              <span className="font-mono text-sm">{word}</span>
              <div className="flex items-center gap-2">
                <span className="text-editor-muted text-xs">{formatRelativeTime(lastSeenAt)}</span>
                <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold text-xs">
                  {count}x
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
