'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { TestResult } from '@/lib/types';
import { getTestResultsByUser, deleteTestResult, restoreTestResult } from '@/lib/db/firebase';
import { useUserStore } from '@/store/user-store';
import { StatsTable } from '@/components/stats/StatsTable';
import { WPMChart } from '@/components/charts/WPMChart';
import { AccuracyChart } from '@/components/charts/AccuracyChart';
import { AggregateAnalytics } from '@/components/charts/AggregateAnalytics';
import { LogoutButton } from '@/components/auth/LogoutButton';

type TimeFilter = 'all' | '7days' | '30days' | '90days';

export default function StatsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const { currentUserId } = useUserStore();

  useEffect(() => {
    if (currentUserId) {
      loadResults();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  const loadResults = async () => {
    if (!currentUserId) return;

    try {
      const allResults = await getTestResultsByUser(currentUserId);
      setResults(allResults);
    } catch (error) {
      console.error('Failed to load test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (!currentUserId) return;

    try {
      // Call Firebase directly from client - Firestore security rules protect the data
      await deleteTestResult(testId, currentUserId);
      // Don't remove from UI - StatsTable handles the UI state
    } catch (error) {
      console.error('Failed to delete test:', error);
      alert('Failed to delete test. Please try again.');
    }
  };

  const handleRestoreTest = async (testId: string) => {
    if (!currentUserId) return;

    try {
      // Call Firebase directly from client - Firestore security rules protect the data
      await restoreTestResult(testId, currentUserId);
      // Test is restored, no need to update UI
    } catch (error) {
      console.error('Failed to restore test:', error);
      alert('Failed to restore test. Please try again.');
    }
  };

  // Filter results by time range
  const filteredResults = useMemo(() => {
    if (timeFilter === 'all') return results;

    const now = new Date();
    const cutoffDate = new Date();

    switch (timeFilter) {
      case '7days':
        cutoffDate.setDate(now.getDate() - 7);
        break;
      case '30days':
        cutoffDate.setDate(now.getDate() - 30);
        break;
      case '90days':
        cutoffDate.setDate(now.getDate() - 90);
        break;
    }

    return results.filter((result) => {
      const resultDate = new Date(result.createdAt);
      return resultDate >= cutoffDate;
    });
  }, [results, timeFilter]);

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
            <div className="flex items-center gap-4">
              <Link
                href="/"
                className="px-4 py-2 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded-lg font-medium transition-colors"
              >
                Back to Home
              </Link>
              <LogoutButton />
            </div>
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
            {/* Date Range Filter */}
            <div className="bg-editor-bg border border-editor-muted rounded-lg p-4">
              <div className="flex items-center gap-4">
                <span className="text-editor-muted font-medium">Time Range:</span>
                <div className="flex gap-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: '7days', label: 'Last 7 Days' },
                    { value: '30days', label: 'Last 30 Days' },
                    { value: '90days', label: 'Last 90 Days' },
                  ].map((filter) => (
                    <button
                      key={filter.value}
                      onClick={() => setTimeFilter(filter.value as TimeFilter)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                        timeFilter === filter.value
                          ? 'bg-editor-accent text-white'
                          : 'bg-editor-muted/30 text-editor-muted hover:bg-editor-muted/50'
                      }`}
                    >
                      {filter.label}
                    </button>
                  ))}
                </div>
                <div className="ml-auto text-editor-muted">
                  {filteredResults.length} {filteredResults.length === 1 ? 'test' : 'tests'}
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <WPMChart results={filteredResults} />
              <AccuracyChart results={filteredResults} />
            </div>

            {/* Results Table */}
            <StatsTable results={filteredResults} onDeleteTest={handleDeleteTest} onRestoreTest={handleRestoreTest} />

            {/* Aggregate Analytics */}
            <AggregateAnalytics results={filteredResults} />
          </div>
        )}
      </div>
    </div>
  );
}
