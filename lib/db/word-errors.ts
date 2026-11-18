import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { MistypedWord } from '@/lib/test-engine/mistake-analysis';

const WORD_ERRORS_COLLECTION = 'wordErrors';
const MAX_WORDS = 500;

export interface WordErrorEntry {
  errorCount: number;    // total times mistyped across all tests
  lastSeenAt: number;    // unix timestamp ms of most recent mistake
}

export interface WordErrorStats {
  userId: string;
  updatedAt: number;
  words: Record<string, WordErrorEntry>;  // key is the target word
}

export async function updateWordErrorStats(userId: string, mistypedWords: MistypedWord[]): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, WORD_ERRORS_COLLECTION, userId);

    // Fetch existing stats
    const snap = await getDoc(ref);
    const existing: WordErrorStats = snap.exists()
      ? (snap.data() as WordErrorStats)
      : { userId, updatedAt: 0, words: {} };

    const now = Date.now();
    const merged = { ...existing.words };

    for (const { target, count } of mistypedWords) {
      if (!target) continue;
      if (merged[target]) {
        merged[target] = {
          errorCount: merged[target].errorCount + count,
          lastSeenAt: now,
        };
      } else {
        merged[target] = { errorCount: count, lastSeenAt: now };
      }
    }

    // Evict if over cap: sort by errorCount ASC, then lastSeenAt ASC, drop excess
    const wordEntries = Object.entries(merged);
    if (wordEntries.length > MAX_WORDS) {
      wordEntries.sort(([, a], [, b]) => {
        if (a.errorCount !== b.errorCount) return a.errorCount - b.errorCount;
        return a.lastSeenAt - b.lastSeenAt;
      });
      const kept = wordEntries.slice(wordEntries.length - MAX_WORDS);
      const trimmed: Record<string, WordErrorEntry> = {};
      for (const [word, entry] of kept) {
        trimmed[word] = entry;
      }
      const updated: WordErrorStats = { userId, updatedAt: now, words: trimmed };
      await setDoc(ref, updated);
    } else {
      const updated: WordErrorStats = { userId, updatedAt: now, words: merged };
      await setDoc(ref, updated);
    }
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

export async function getTopProblemWords(userId: string, topN: number = 20): Promise<string[]> {
  const stats = await getWordErrorStats(userId);
  if (!stats) return [];

  return Object.entries(stats.words)
    .sort(([, a], [, b]) => {
      if (b.errorCount !== a.errorCount) return b.errorCount - a.errorCount;
      return b.lastSeenAt - a.lastSeenAt;
    })
    .slice(0, topN)
    .map(([word]) => word);
}
