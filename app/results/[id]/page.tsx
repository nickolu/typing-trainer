'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { ResultsView } from '@/components/results/ResultsView';
import { getTestResult } from '@/lib/db';
import { useUserStore } from '@/store/user-store';
import { TestResult } from '@/lib/types';

export default function ResultsPage() {
  const params = useParams();
  const { currentUserId } = useUserStore();
  const [result, setResult] = useState<TestResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadResult() {
      if (!currentUserId) {
        setError('User not authenticated');
        setLoading(false);
        return;
      }

      try {
        const id = params.id as string;
        const testResult = await getTestResult(id);

        if (!testResult) {
          setError('Test result not found');
          return;
        }

        // Verify ownership
        if (testResult.userId !== currentUserId) {
          setError('You do not have permission to view this result');
          return;
        }

        setResult(testResult);
      } catch (err) {
        console.error('Failed to load test result:', err);
        setError('Failed to load test result');
      } finally {
        setLoading(false);
      }
    }

    loadResult();
  }, [params.id, currentUserId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-muted">Loading results...</p>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-editor-error">{error || 'Result not found'}</p>
      </div>
    );
  }

  return <ResultsView result={result} />;
}
