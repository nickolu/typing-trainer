'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Target } from 'lucide-react';
import { getTopProblemWordEntries, WordErrorEntry } from '@/lib/db/word-errors';
import { useSettingsStore } from '@/store/settings-store';
import { useTestStore } from '@/store/test-store';

interface ProblemWordsProps {
  userId: string;
}

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

export function ProblemWords({ userId }: ProblemWordsProps) {
  const router = useRouter();
  const { setDefaultContentStyle } = useSettingsStore();
  const resetTest = useTestStore((state) => state.resetTest);
  const [entries, setEntries] = useState<Array<{ word: string; entry: WordErrorEntry }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getTopProblemWordEntries(userId, 20)
      .then((result) => {
        if (!cancelled) setEntries(result);
      })
      .catch(console.error)
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Same pattern as other practice entry points: set the content style, reset any
  // in-progress test, and go home where TypingTest loads content for that style.
  const handlePractice = () => {
    setDefaultContentStyle('ai-word-errors');
    resetTest();
    router.push('/');
  };

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
      <div className="flex items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <Target className="w-4 h-4 text-orange-500" />
          <h2 className="text-lg font-bold">Problem words</h2>
        </div>
        {entries.length > 0 && (
          <button
            onClick={handlePractice}
            className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded text-sm font-medium transition-colors"
          >
            Practice these
          </button>
        )}
      </div>

      {loading ? (
        <div className="text-center py-6">
          <p className="text-editor-muted text-sm">Loading...</p>
        </div>
      ) : entries.length === 0 ? (
        <div className="text-center py-6">
          <p className="text-editor-muted text-sm">No problem words yet.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
          {entries.map(({ word, entry }) => (
            <div
              key={word}
              className="flex items-center justify-between p-2 bg-editor-muted/20 rounded hover:bg-editor-muted/30 transition-colors"
            >
              <span className="font-mono text-sm">{word}</span>
              <div className="flex items-center gap-2">
                <span className="text-editor-muted text-xs">{formatRelativeTime(entry.lastSeenAt)}</span>
                <span className="bg-orange-500/20 text-orange-400 px-2 py-0.5 rounded-full font-semibold text-xs">
                  {entry.errorCount}x
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
