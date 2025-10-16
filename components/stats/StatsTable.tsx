'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { TestResult } from '@/lib/types';
import { format } from 'date-fns';
import { Calendar, Zap, Target, Clock, ArrowUpDown, Trash2, Undo2 } from 'lucide-react';

interface StatsTableProps {
  results: TestResult[];
  onDeleteTest?: (testId: string) => void;
  onRestoreTest?: (testId: string) => void;
}

type SortField = 'date' | 'wpm' | 'accuracy' | 'duration';
type SortDirection = 'asc' | 'desc';

export function StatsTable({ results, onDeleteTest, onRestoreTest }: StatsTableProps) {
  const router = useRouter();
  const [sortField, setSortField] = useState<SortField>('date');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');
  const [deletedTests, setDeletedTests] = useState<Set<string>>(new Set());

  // Sort results
  const sortedResults = useMemo(() => {
    const sorted = [...results];

    sorted.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'date':
          comparison =
            new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
        case 'wpm':
          comparison = a.wpm - b.wpm;
          break;
        case 'accuracy':
          comparison = a.accuracy - b.accuracy;
          break;
        case 'duration':
          comparison = a.duration - b.duration;
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [results, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      // Toggle direction if clicking same field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      // New field, default to descending (best first)
      setSortField(field);
      setSortDirection(field === 'date' ? 'desc' : 'desc');
    }
  };

  const handleRowClick = (resultId: string) => {
    router.push(`/results/${resultId}`);
  };

  const handleDeleteClick = async (e: React.MouseEvent, testId: string) => {
    e.stopPropagation();

    // Mark as deleted in UI immediately
    setDeletedTests((prev) => new Set(prev).add(testId));

    // Call the delete API
    await onDeleteTest?.(testId);
  };

  const handleUndoClick = async (e: React.MouseEvent, testId: string) => {
    e.stopPropagation();

    // Remove from deleted set
    setDeletedTests((prev) => {
      const newSet = new Set(prev);
      newSet.delete(testId);
      return newSet;
    });

    // Call the restore API
    await onRestoreTest?.(testId);
  };

  const SortButton = ({
    field,
    label,
  }: {
    field: SortField;
    label: string;
  }) => {
    const isActive = sortField === field;
    return (
      <button
        onClick={() => handleSort(field)}
        className={`flex items-center gap-2 font-semibold transition-colors ${
          isActive ? 'text-editor-accent' : 'text-editor-fg hover:text-editor-accent'
        }`}
      >
        {label}
        <ArrowUpDown
          className={`w-4 h-4 ${isActive ? 'opacity-100' : 'opacity-40'}`}
        />
      </button>
    );
  };

  return (
    <div className="bg-editor-bg border border-editor-muted rounded-lg overflow-hidden">
      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-editor-bg/80">
            <tr className="border-b border-editor-muted">
              <th className="text-left p-4">
                <SortButton field="date" label="Date" />
              </th>
              <th className="text-left p-4">
                <SortButton field="wpm" label="WPM" />
              </th>
              <th className="text-left p-4">
                <SortButton field="accuracy" label="Accuracy" />
              </th>
              <th className="text-left p-4">
                <SortButton field="duration" label="Duration" />
              </th>
              <th className="text-left p-4">Words</th>
              <th className="text-left p-4 w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {sortedResults.map((result) => (
              <tr
                key={result.id}
                onClick={() => handleRowClick(result.id)}
                className="border-b border-editor-muted/30 hover:bg-editor-muted/10 cursor-pointer transition-colors"
              >
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-editor-muted" />
                    <div>
                      <div className="font-medium">
                        {format(new Date(result.createdAt), 'MMM d, yyyy')}
                      </div>
                      <div className="text-sm text-editor-muted">
                        {format(new Date(result.createdAt), 'h:mm a')}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Zap className="w-4 h-4 text-editor-accent" />
                    <span className="font-mono font-bold text-lg">
                      {result.wpm}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Target
                      className={`w-4 h-4 ${
                        result.accuracy >= 95
                          ? 'text-editor-success'
                          : result.accuracy >= 80
                          ? 'text-yellow-500'
                          : 'text-editor-error'
                      }`}
                    />
                    <span className="font-mono font-bold">
                      {result.accuracy}%
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-editor-muted" />
                    <span className="font-mono">{result.duration}s</span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="text-sm">
                    <div className="text-editor-success">
                      {result.correctWordCount} correct
                    </div>
                    <div className="text-editor-error">
                      {result.incorrectWordCount} incorrect
                    </div>
                  </div>
                </td>
                <td className="p-4">
                  {deletedTests.has(result.id) ? (
                    <button
                      onClick={(e) => handleUndoClick(e, result.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-editor-muted hover:bg-editor-muted/80 text-editor-fg rounded transition-colors text-sm font-medium"
                      title="Undo delete"
                    >
                      <Undo2 className="w-4 h-4" />
                      Undo
                    </button>
                  ) : (
                    <button
                      onClick={(e) => handleDeleteClick(e, result.id)}
                      className="flex items-center gap-1 px-3 py-1 bg-editor-error/10 hover:bg-editor-error/20 text-editor-error rounded transition-colors text-sm font-medium"
                      title="Delete test"
                    >
                      <Trash2 className="w-4 h-4" />
                      Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sortedResults.length === 0 && (
        <div className="p-12 text-center text-editor-muted">
          No tests found for the selected time range.
        </div>
      )}
    </div>
  );
}
