'use client';

import { useState } from 'react';
import { useUserStore } from '@/store/user-store';
import { AuthGuard } from '@/components/auth/AuthGuard';
import { saveTestResult } from '@/lib/db';
import { TestResult, KeystrokeEvent } from '@/lib/types';
import { v4 as uuidv4 } from 'uuid';

const WORD_POOL = [
  'the', 'be', 'to', 'of', 'and', 'a', 'in', 'that', 'have', 'it',
  'for', 'not', 'on', 'with', 'he', 'as', 'you', 'do', 'at', 'this',
  'but', 'his', 'by', 'from', 'they', 'we', 'say', 'her', 'she', 'or',
  'an', 'will', 'my', 'one', 'all', 'would', 'there', 'their', 'what', 'so',
  'up', 'out', 'if', 'about', 'who', 'get', 'which', 'go', 'me', 'when',
  'make', 'can', 'like', 'time', 'no', 'just', 'him', 'know', 'take', 'people',
];

const COMMON_MISTAKES: Record<string, string[]> = {
  'a': ['s', 'q'], 's': ['a', 'd'], 'd': ['s', 'f'], 'f': ['d', 'g'],
  'e': ['w', 'r'], 'r': ['e', 't'], 't': ['r', 'y'], 'i': ['u', 'o'],
};

function generateWords(count: number): string[] {
  return Array.from({ length: count }, () => 
    WORD_POOL[Math.floor(Math.random() * WORD_POOL.length)]
  );
}

function randomDateInLastNDays(days: number): Date {
  const now = new Date();
  const randomMs = Math.random() * days * 24 * 60 * 60 * 1000;
  return new Date(now.getTime() - randomMs);
}

function generateTypedWords(targetWords: string[], accuracy: number): string[] {
  return targetWords.map(word => {
    let typedWord = '';
    for (let i = 0; i < word.length; i++) {
      const char = word[i];
      if (Math.random() * 100 < accuracy) {
        typedWord += char;
      } else {
        const mistakes = COMMON_MISTAKES[char] || ['a', 'e'];
        typedWord += mistakes[Math.floor(Math.random() * mistakes.length)];
      }
    }
    return typedWord;
  });
}

function generateMinimalKeystrokeEvents(
  targetWords: string[],
  typedWords: string[],
  baseWPM: number
): KeystrokeEvent[] {
  const events: KeystrokeEvent[] = [];
  let timestamp = 0;
  const avgTimePerChar = (60000 / baseWPM) / 5;
  
  // Only first 3 words to keep it tiny
  const maxWords = Math.min(3, targetWords.length);
  
  for (let wordIndex = 0; wordIndex < maxWords; wordIndex++) {
    const targetWord = targetWords[wordIndex];
    const typedWord = typedWords[wordIndex] || '';
    
    for (let charIndex = 0; charIndex < Math.min(typedWord.length, 4); charIndex++) {
      timestamp += avgTimePerChar * (1 + (Math.random() - 0.5) * 0.3);
      events.push({
        timestamp,
        key: typedWord[charIndex],
        wordIndex,
        charIndex,
        expectedChar: targetWord[charIndex],
        wasCorrect: typedWord[charIndex] === targetWord[charIndex],
        isBackspace: false,
      });
    }
  }
  
  return events;
}

function generateFakeTestResult(userId: string, createdAt: Date): TestResult {
  const baseWPM = 40 + Math.random() * 60;
  const accuracy = 85 + Math.random() * 14;
  const duration = 30;
  
  const wordsPerTest = 15 + Math.floor(Math.random() * 10);
  const targetWords = generateWords(wordsPerTest);
  const typedWords = generateTypedWords(targetWords, accuracy);
  
  const correctWordCount = targetWords.filter((word, i) => word === typedWords[i]).length;
  const keystrokeTimings = generateMinimalKeystrokeEvents(targetWords, typedWords, baseWPM);
  
  // Calculate per-character accuracy (usually higher than per-word accuracy)
  const perCharacterAccuracy = Math.min(100, accuracy + (Math.random() * 3 + 2));
  
  return {
    id: uuidv4(),
    userId,
    createdAt,
    duration,
    status: 'COMPLETE',
    testContentId: `content-${Math.floor(Math.random() * 10)}`,
    targetWords,
    typedWords,
    wpm: Math.round(baseWPM),
    accuracy: Math.round(accuracy * 10) / 10,
    perCharacterAccuracy: Math.round(perCharacterAccuracy * 10) / 10,
    correctWordCount,
    incorrectWordCount: targetWords.length - correctWordCount,
    totalWords: targetWords.length,
    totalTypedWords: typedWords.length,
    keystrokeTimings,
    mistakeCount: keystrokeTimings.filter(e => !e.wasCorrect).length,
    correctionCount: 0,
    characterSubstitutions: {},
  };
}

export default function SeedDataPage() {
  const { currentUserId } = useUserStore();
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [count, setCount] = useState(200);
  const [progress, setProgress] = useState(0);

  const handleSeedData = async () => {
    if (!currentUserId) {
      setError('You must be logged in to seed data');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);
    setProgress(0);

    try {
      const daysToGenerate = 90;
      const results: TestResult[] = [];
      
      // Generate all test data
      for (let i = 0; i < count; i++) {
        const createdAt = randomDateInLastNDays(daysToGenerate);
        const testResult = generateFakeTestResult(currentUserId, createdAt);
        results.push(testResult);
      }
      
      // Sort by date
      results.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      
      // Save to Firebase
      let savedCount = 0;
      for (const testResult of results) {
        await saveTestResult(testResult, currentUserId);
        savedCount++;
        setProgress(Math.round((savedCount / count) * 100));
      }
      
      setResult({
        success: true,
        summary: {
          totalTests: count,
          dateRange: {
            from: results[0].createdAt.toLocaleDateString(),
            to: results[results.length - 1].createdAt.toLocaleDateString(),
          },
          averageWPM: Math.round(results.reduce((sum, r) => sum + r.wpm, 0) / results.length),
          averageAccuracy: Math.round(results.reduce((sum, r) => sum + r.accuracy, 0) / results.length),
        },
      });
    } catch (err: any) {
      console.error('Seed error:', err);
      setError(err.message || 'Failed to seed data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white p-8">
        <div className="max-w-2xl mx-auto">
          <h1 className="text-4xl font-bold mb-8">Seed Fake Data</h1>
          
          <div className="bg-gray-800 rounded-lg p-6 shadow-xl">
            <p className="text-gray-300 mb-6">
              This tool will generate and insert fake typing test results into your Firebase database
              for testing purposes. The data will span the last 90 days with realistic WPM, accuracy,
              and keystroke timing data.
            </p>

            <div className="mb-6">
              <label htmlFor="count" className="block text-sm font-medium mb-2">
                Number of test results to generate:
              </label>
              <input
                id="count"
                type="number"
                value={count}
                onChange={(e) => setCount(Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
                max="1000"
                className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-sm text-gray-400 mt-1">
                Recommended: 100-300 for testing historical data filters
              </p>
            </div>

            <button
              onClick={handleSeedData}
              disabled={loading}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
            >
              {loading ? 'Generating and Saving Data...' : 'Seed Data'}
            </button>

            {loading && (
              <div className="mt-4">
                <div className="text-center mb-2">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-4 mb-2">
                  <div
                    className="bg-blue-600 h-4 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <p className="text-center text-gray-400">
                  Saving test {Math.ceil((progress / 100) * count)} of {count}... ({progress}%)
                </p>
              </div>
            )}

            {error && (
              <div className="mt-6 p-4 bg-red-900/30 border border-red-500 rounded-lg">
                <h3 className="font-semibold text-red-400 mb-1">Error</h3>
                <p className="text-red-300">{error}</p>
              </div>
            )}

            {result && (
              <div className="mt-6 p-4 bg-green-900/30 border border-green-500 rounded-lg">
                <h3 className="font-semibold text-green-400 mb-3">Success!</h3>
                <div className="space-y-2 text-gray-300">
                  <p><strong>Total Tests:</strong> {result.summary.totalTests}</p>
                  <p><strong>Date Range:</strong> {result.summary.dateRange.from} to {result.summary.dateRange.to}</p>
                  <p><strong>Average WPM:</strong> {result.summary.averageWPM}</p>
                  <p><strong>Average Accuracy:</strong> {result.summary.averageAccuracy}%</p>
                </div>
                <p className="mt-4 text-green-300">
                  You can now test your historical data filter with this fake data!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

