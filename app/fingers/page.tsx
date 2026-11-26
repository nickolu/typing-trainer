'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Hand, Keyboard } from 'lucide-react';
import { TestResult } from '@/lib/types';
import { getTestResultsByUser } from '@/lib/db';
import { useUserStore } from '@/store/user-store';
import { analyzeFingers, rankStrongestFingers, rankWeakestFingers } from '@/lib/test-engine/finger-analysis';
import { HandMap } from '@/components/fingers/HandMap';
import { KeyboardHeatmap } from '@/components/fingers/KeyboardHeatmap';
import { FingerTable } from '@/components/fingers/FingerTable';
import { DataProgress } from '@/components/fingers/DataProgress';
import { DrillLauncher } from '@/components/fingers/DrillLauncher';
import { describeRelativeSpeed } from '@/components/fingers/finger-colors';

type TimeFilter = 'all' | '30days' | '90days';
const ALL_KEYBOARDS = '__all__';

export default function FingersPage() {
  const { currentUserId } = useUserStore();
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [keyboard, setKeyboard] = useState<string>(ALL_KEYBOARDS);

  useEffect(() => {
    if (!currentUserId) return;
    let cancelled = false;
    setLoading(true);
    getTestResultsByUser(currentUserId)
      .then((r) => {
        if (!cancelled) setResults(r);
      })
      .catch((e) => {
        console.error('Failed to load results for finger analysis:', e);
        if (!cancelled) setError('Could not load your test history.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [currentUserId]);

  const keyboards = useMemo(() => {
    const set = new Set<string>();
    for (const r of results) {
      for (const label of r.labels ?? []) {
        if (label.startsWith('keyboard-')) set.add(label);
      }
    }
    return Array.from(set).sort();
  }, [results]);

  const filtered = useMemo(() => {
    let list = results;
    if (timeFilter !== 'all') {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - (timeFilter === '30days' ? 30 : 90));
      list = list.filter((r) => new Date(r.createdAt) >= cutoff);
    }
    if (keyboard !== ALL_KEYBOARDS) {
      list = list.filter((r) => r.labels?.includes(keyboard));
    }
    return list;
  }, [results, timeFilter, keyboard]);

  const report = useMemo(
    () => analyzeFingers(filtered.map((r) => r.keystrokeTimings ?? [])),
    [filtered]
  );

  const strongest = rankStrongestFingers(report, 1)[0];
  const weakest = rankWeakestFingers(report, 1)[0];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading...</div>
          <div className="text-editor-muted">Analyzing your keystrokes</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Hand className="w-8 h-8 text-editor-accent" />
            <h1 className="text-4xl font-bold">Finger Analysis</h1>
          </div>
          <p className="text-editor-muted">
            Every keystroke you type is timed. This page attributes each one to the finger that typed it
            under standard touch typing and shows which fingers are fast, which are slow, and where the errors come from.
          </p>
        </div>

        {error && (
          <div className="bg-editor-error/10 border border-editor-error/40 rounded-lg p-4 text-editor-error">{error}</div>
        )}

        {results.length === 0 ? (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-12 text-center">
            <p className="text-xl text-editor-muted mb-4">No keystroke data yet</p>
            <p className="text-editor-muted mb-6">Complete a typing test or a drill and come back.</p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
            >
              Take a test
            </Link>
          </div>
        ) : (
          <>
            {/* Filters */}
            <div className="bg-editor-bg border border-editor-muted rounded-lg p-3 flex flex-wrap items-center gap-4">
              <span className="text-editor-muted font-medium">Time Range:</span>
              <div className="flex gap-2">
                {([
                  { value: 'all', label: 'All Time' },
                  { value: '90days', label: 'Last 90 Days' },
                  { value: '30days', label: 'Last 30 Days' },
                ] as Array<{ value: TimeFilter; label: string }>).map((f) => (
                  <button
                    key={f.value}
                    onClick={() => setTimeFilter(f.value)}
                    className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                      timeFilter === f.value
                        ? 'bg-editor-accent text-white'
                        : 'bg-editor-muted/30 text-editor-muted hover:bg-editor-muted/50'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              {keyboards.length > 0 && (
                <div className="flex items-center gap-2">
                  <Keyboard className="w-4 h-4 text-editor-muted" />
                  <select
                    value={keyboard}
                    onChange={(e) => setKeyboard(e.target.value)}
                    className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-sm"
                  >
                    <option value={ALL_KEYBOARDS}>All keyboards</option>
                    {keyboards.map((k) => (
                      <option key={k} value={k}>
                        {k.replace(/^keyboard-/, '')}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="ml-auto text-editor-muted text-sm">
                {filtered.length} {filtered.length === 1 ? 'test' : 'tests'}
              </div>
            </div>

            <DataProgress report={report} />

            {/* Headline */}
            {(strongest || weakest) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {strongest && (
                  <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-editor-muted mb-1">Strongest finger</div>
                    <div className="text-2xl font-bold text-[#8fc0f5]">{strongest.name}</div>
                    <div className="text-sm text-editor-muted mt-1">
                      {strongest.medianMs} ms median · {describeRelativeSpeed(strongest.relativeSpeed)} · {strongest.accuracy}% accurate
                    </div>
                  </div>
                )}
                {weakest && weakest.id !== strongest?.id && (
                  <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-editor-muted mb-1">Weakest finger</div>
                    <div className="text-2xl font-bold text-[#f0a0a0]">{weakest.name}</div>
                    <div className="text-sm text-editor-muted mt-1">
                      {weakest.medianMs} ms median · {describeRelativeSpeed(weakest.relativeSpeed)} · {weakest.accuracy}% accurate
                      {weakest.slowestKeys.length > 0 && (
                        <>
                          {' '}· slowest keys{' '}
                          <span className="font-mono text-editor-fg">
                            {weakest.slowestKeys.map((k) => k.char).join(' ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <HandMap report={report} />
            <KeyboardHeatmap report={report} />
            <FingerTable report={report} />
            <DrillLauncher report={report} />
          </>
        )}
      </div>
    </div>
  );
}
