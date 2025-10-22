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
import { ProblematicWords } from '@/components/charts/ProblematicWords';
import { LogoutButton } from '@/components/auth/LogoutButton';
import { Tag, X } from 'lucide-react';

type TimeFilter = 'all' | '7days' | '30days' | '90days';

export default function StatsPage() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('7days');
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
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

  // Get all unique labels from results
  const availableLabels = useMemo(() => {
    const labelSet = new Set<string>();
    results.forEach((result) => {
      if (result.labels && Array.isArray(result.labels)) {
        result.labels.forEach((label) => labelSet.add(label));
      }
    });
    return Array.from(labelSet).sort();
  }, [results]);

  // Filter results by time range and labels
  const filteredResults = useMemo(() => {
    let filtered = results;

    // Apply time filter
    if (timeFilter !== 'all') {
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

      filtered = filtered.filter((result) => {
        const resultDate = new Date(result.createdAt);
        return resultDate >= cutoffDate;
      });
    }

    // Apply label filter - only if labels are selected
    if (selectedLabels.length > 0) {
      filtered = filtered.filter((result) => {
        // If result has no labels, it doesn't match
        if (!result.labels || result.labels.length === 0) return false;

        // Check if result has at least one of the selected labels
        return result.labels.some((label) => selectedLabels.includes(label));
      });
    }

    return filtered;
  }, [results, timeFilter, selectedLabels]);

  const toggleLabel = (label: string) => {
    setSelectedLabels((prev) =>
      prev.includes(label)
        ? prev.filter((l) => l !== label)
        : [...prev, label]
    );
  };

  const clearAllLabels = () => {
    setSelectedLabels([]);
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
            <div className="flex items-center gap-4">
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
          <div className="space-y-6">
            {/* Filters */}
            <div className="bg-editor-bg border border-editor-muted rounded-lg p-3 space-y-3">
              {/* Date Range Filter */}
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

              {/* Label Filter */}
              {availableLabels.length > 0 && (
                <div className="border-t border-editor-muted/30 pt-3">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center gap-2 text-editor-muted font-medium pt-0.5">
                      <Tag className="w-4 h-4" />
                      <span>Labels:</span>
                    </div>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-2">
                        {availableLabels.map((label) => (
                          <button
                            key={label}
                            onClick={() => toggleLabel(label)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-2 ${
                              selectedLabels.includes(label)
                                ? 'bg-editor-accent text-white'
                                : 'bg-editor-muted/30 text-editor-fg hover:bg-editor-muted/50'
                            }`}
                          >
                            <Tag className="w-3 h-3" />
                            {label}
                          </button>
                        ))}
                      </div>
                      {selectedLabels.length > 0 && (
                        <button
                          onClick={clearAllLabels}
                          className="mt-2 text-sm text-editor-muted hover:text-editor-fg transition-colors flex items-center gap-1"
                        >
                          <X className="w-3 h-3" />
                          Clear all labels
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <WPMChart results={filteredResults} />
              <AccuracyChart results={filteredResults} />
            </div>

            {/* Results Table */}
            <StatsTable results={filteredResults} onDeleteTest={handleDeleteTest} onRestoreTest={handleRestoreTest} />

            {/* Aggregate Analytics */}
            <AggregateAnalytics results={filteredResults} />

            {/* Problematic Words */}
            <ProblematicWords results={filteredResults} />
          </div>
        )}
      </div>
    </div>
  );
}
