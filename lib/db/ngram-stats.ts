import { doc, getDoc, setDoc } from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { KeystrokeEvent } from '@/lib/types';
import { calculateSequenceTimings } from '@/lib/test-engine/calculations';

const NGRAM_STATS_COLLECTION = 'ngramStats';

export interface NgramEntry {
  avgTime: number;
  count: number;
  lastSeen: number;
}

export interface NgramStats {
  userId: string;
  updatedAt: number;
  bigrams: Record<string, NgramEntry>;
  trigrams: Record<string, NgramEntry>;
  tetragrams: Record<string, NgramEntry>;
}

export async function getNgramStats(userId: string): Promise<NgramStats | null> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, NGRAM_STATS_COLLECTION, userId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as NgramStats;
  } catch (error) {
    console.error('Failed to get ngram stats:', error);
    return null;
  }
}

export async function updateNgramStats(
  userId: string,
  keystrokes: KeystrokeEvent[]
): Promise<void> {
  try {
    const db = getFirebaseDb();
    const ref = doc(db, NGRAM_STATS_COLLECTION, userId);

    // Compute ngrams from this test (no targetWords needed — pass empty array)
    // Filter out any sequence containing a space — we only want pure character ngrams
    const noSpace = (t: { sequence: string }) => !t.sequence.includes(' ');
    const bigramTimings = calculateSequenceTimings(keystrokes, [], 2, 200).filter(noSpace);
    const trigramTimings = calculateSequenceTimings(keystrokes, [], 3, 300).filter(noSpace);
    const tetragramTimings = calculateSequenceTimings(keystrokes, [], 4, 400).filter(noSpace);

    // Fetch existing stats
    const snap = await getDoc(ref);
    const existing: NgramStats = snap.exists()
      ? (snap.data() as NgramStats)
      : { userId, updatedAt: 0, bigrams: {}, trigrams: {}, tetragrams: {} };

    const now = Date.now();

    function mergeNgrams(
      existing: Record<string, NgramEntry>,
      timings: ReturnType<typeof calculateSequenceTimings>
    ): Record<string, NgramEntry> {
      const merged = { ...existing };
      for (const t of timings) {
        const seq = t.sequence;
        const newCount = t.occurrences;
        const newAvg = t.averageTime;
        if (merged[seq]) {
          const old = merged[seq];
          const totalCount = old.count + newCount;
          merged[seq] = {
            avgTime: (old.avgTime * old.count + newAvg * newCount) / totalCount,
            count: totalCount,
            lastSeen: now,
          };
        } else {
          merged[seq] = { avgTime: newAvg, count: newCount, lastSeen: now };
        }
      }
      return merged;
    }

    const updated: NgramStats = {
      userId,
      updatedAt: now,
      bigrams: mergeNgrams(existing.bigrams, bigramTimings),
      trigrams: mergeNgrams(existing.trigrams, trigramTimings),
      tetragrams: mergeNgrams(existing.tetragrams, tetragramTimings),
    };

    await setDoc(ref, updated);
  } catch (error) {
    console.error('Failed to update ngram stats:', error);
    throw error;
  }
}

export function getTopSlowNgrams(
  stats: NgramStats,
  type: 'bigrams' | 'trigrams' | 'tetragrams',
  topN: number,
  minCount: number = 3
): Array<{ sequence: string; avgTime: number; count: number }> {
  const entries = stats[type];
  return Object.entries(entries)
    .filter(([, entry]) => entry.count >= minCount)
    .sort(([, a], [, b]) => b.avgTime - a.avgTime)
    .slice(0, topN)
    .map(([seq, entry]) => ({
      sequence: seq,
      avgTime: Math.round(entry.avgTime),
      count: entry.count,
    }));
}
