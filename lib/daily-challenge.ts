import { TestContent } from './types';
import { staticTests } from './test-content';

// FNV-1a hash for deterministic seeding from a date string
function fnv1aHash(str: string): number {
  let hash = 0x811c9dc5; // FNV offset basis
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193); // FNV prime
  }
  return hash >>> 0; // Ensure unsigned
}

// Seeded PRNG (mulberry32-style)
function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = Math.imul(s ^ (s >>> 16), 0x45d9f3b);
    s = Math.imul(s ^ (s >>> 13), 0x45d9f3b);
    s = (s ^ (s >>> 16)) >>> 0;
    return s / 0x100000000;
  };
}

// Uses FNV-1a hash for deterministic seeding from a date string
export function getDailySeed(date: string): number {
  return fnv1aHash(date);
}

// Returns today's date in PST timezone as 'YYYY-MM-DD'
export function getTodayPST(): string {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Los_Angeles',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find(p => p.type === 'year')!.value;
  const month = parts.find(p => p.type === 'month')!.value;
  const day = parts.find(p => p.type === 'day')!.value;
  return `${year}-${month}-${day}`;
}

// Returns all static tests excluding time-trials
export function getDailySelectableTests(): TestContent[] {
  return staticTests.filter(test => test.category !== 'time-trial');
}

// Fixed epoch for day number calculation
const EPOCH = '2024-01-01';

function getDayNumber(date: string): number {
  const epochDate = new Date(EPOCH + 'T00:00:00Z');
  const targetDate = new Date(date + 'T00:00:00Z');
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((targetDate.getTime() - epochDate.getTime()) / msPerDay);
}

// Main function: returns the daily passage for a given date (or today)
// Uses a shuffled index to avoid repeats within one cycle of available tests.
// The shuffle is seeded per cycle (not per day), so each cycle of N days
// covers all N tests exactly once before repeating.
// Caches in localStorage with date-based key
export function getDailyPassage(date?: string): TestContent {
  const targetDate = date ?? getTodayPST();
  const cacheKey = `cunningtype-daily-passage-${targetDate}`;

  const tests = getDailySelectableTests();

  // Check localStorage cache
  if (typeof window !== 'undefined') {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const found = tests.find(t => t.id === cached);
      if (found) {
        return found;
      }
    }
  }

  const dayNumber = getDayNumber(targetDate);
  const cycleLength = tests.length;
  const cycleNumber = Math.floor(dayNumber / cycleLength);
  const positionInCycle = ((dayNumber % cycleLength) + cycleLength) % cycleLength;

  // Seed the shuffle based on cycle number so all days in the same cycle
  // share the same shuffled order, ensuring no repeats within a cycle.
  const cycleSeed = fnv1aHash(`cycle-${cycleNumber}`);
  const prng = seededRandom(cycleSeed);

  // Fisher-Yates shuffle with seeded PRNG
  const shuffled = [...tests];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  const passage = shuffled[positionInCycle];

  // Cache result in localStorage
  if (typeof window !== 'undefined') {
    localStorage.setItem(cacheKey, passage.id);
  }

  return passage;
}
