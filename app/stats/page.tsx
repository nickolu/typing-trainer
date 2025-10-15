'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { TestResult } from '@/lib/types';
import { getAllTestResults } from '@/lib/db';
import { StatsTable } from '@/components/stats/StatsTable';
import { WPMChart } from '@/components/charts/WPMChart';
import { AccuracyChart } from '@/components/charts/AccuracyChart';
import { AggregateAnalytics } from '@/components/charts/AggregateAnalytics';

export default function StatsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadResults();
  }, []);

  const loadResults = async () => {
    try {
      const allResults = await getAllTestResults();
      setResults(allResults);
    } catch (error) {
      console.error('Failed to load test results:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-2xl font-bold mb-2">Loading...</div>
          <div className="text-editor-muted">Fetching your stats</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-4xl font-bold">Your Stats</h1>
            <Link
              href="/"
              className="px-4 py-2 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
            >
              Back to Home
            </Link>
          </div>
          <p className="text-editor-muted">
            View all your past typing tests and track your progress over time.
          </p>
        </div>

        {/* Content */}
        {results.length === 0 ? (
          <div className="bg-editor-bg border border-editor-muted rounded-lg p-12 text-center">
            <p className="text-xl text-editor-muted mb-4">
              No stats yet!
            </p>
            <p className="text-editor-muted mb-6">
              Complete your first typing test to see your results here.
            </p>
            <Link
              href="/"
              className="inline-block px-6 py-3 bg-editor-accent hover:bg-editor-accent/80 text-white rounded-lg font-medium transition-colors"
            >
              Start Your First Test
            </Link>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Aggregate Analytics */}
            <AggregateAnalytics results={results} />

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WPMChart results={results} />
              <AccuracyChart results={results} />
            </div>

            {/* Results Table */}
            <StatsTable results={results} />
          </div>
        )}
      </div>
    </div>
  );
}
