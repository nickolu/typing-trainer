import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import {
  WordErrorCount,
  WordErrorEntry,
  evictWordErrors,
  mergeWordErrors,
  rankWordErrors,
} from '@/lib/test-engine/word-errors';

export type { WordErrorEntry };

const WORD_ERRORS_COLLECTION = 'wordErrors';
const MAX_WORDS = 500;

export interface WordErrorStats {
  userId: string;
  updatedAt: number;
  words: Record<string, WordErrorEntry>;  // key is the target word
}

export async function updateWordErrorStats(userId: string, errors: WordErrorCount[]): Promise<void> {
  if (errors.length === 0) return;
  try {
    const db = getFirebaseDb();
    const ref = doc(db, WORD_ERRORS_COLLECTION, userId);

    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      const existing: WordErrorStats = snap.exists()
        ? (snap.data() as WordErrorStats)
        : { userId, updatedAt: 0, words: {} };

      const now = Date.now();
      const words = evictWordErrors(mergeWordErrors(existing.words ?? {}, errors, now), MAX_WORDS);
      const updated: WordErrorStats = { userId, updatedAt: now, words };
      tx.set(ref, updated);
    });
  } catch (error) {
    console.error('Failed to update word error stats:', error);
    throw error;
  }
}

export async function getWordErrorStats(userId: string): Promise<WordErrorStats | null> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, WORD_ERRORS_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as WordErrorStats;
  } catch (error) {
    console.error('Failed to get word error stats:', error);
    return null;
  }
}

export async function getTopProblemWordEntries(
  userId: string,
  topN: number = 20
): Promise<Array<{ word: string; entry: WordErrorEntry }>> {
  const stats = await getWordErrorStats(userId);
  if (!stats) return [];
  return rankWordErrors(stats.words ?? {}, topN);
}

export async function getTopProblemWords(userId: string, topN: number = 20): Promise<string[]> {
  const entries = await getTopProblemWordEntries(userId, topN);
  return entries.map(({ word }) => word);
}
