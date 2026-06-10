import { TestContent } from './types';
import { staticTests } from './test-content';

export type DailyContentType = 'prose' | 'technical' | 'code' | 'common';
export type DailyDurationType = 'timed' | 'content-length';
export type DailyCorrectionMode = 'normal' | 'speed' | 'strict';

export interface DailyChallengeConfig {
  date: string;
  contentType: DailyContentType;
  durationMode: DailyDurationType;
  durationSeconds: number;      // 60 when timed
  correctionMode: DailyCorrectionMode;
  errorLimit: number | null;    // null unless correctionMode === 'strict'
  displayLabel: string;         // e.g. "60-second timed test, strict mode (5 errors max)"
}

const DAILY_CONTENT_TYPES: DailyContentType[] = ['prose', 'technical', 'code', 'common'];
const DAILY_CORRECTION_MODES: DailyCorrectionMode[] = ['normal', 'speed', 'strict'];
const DAILY_DURATION_MODES: DailyDurationType[] = ['timed', 'content-length'];
const STRICT_ERROR_LIMITS = [3, 4, 5, 6, 7, 8, 9, 10];

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

export function getDailyConfig(date?: string): DailyChallengeConfig {
  const targetDate = date ?? getTodayPST();
  const seed = getDailySeed('daily-config-' + targetDate);
  const prng = seededRandom(seed);

  const contentType = DAILY_CONTENT_TYPES[Math.floor(prng() * DAILY_CONTENT_TYPES.length)];
  const durationMode = DAILY_DURATION_MODES[Math.floor(prng() * DAILY_DURATION_MODES.length)];
  const correctionMode = DAILY_CORRECTION_MODES[Math.floor(prng() * DAILY_CORRECTION_MODES.length)];
  const durationSeconds = 60;

  let errorLimit: number | null = null;
  if (correctionMode === 'strict') {
    errorLimit = STRICT_ERROR_LIMITS[Math.floor(prng() * STRICT_ERROR_LIMITS.length)];
  }

  const durationLabel = durationMode === 'timed'
    ? `${durationSeconds}-second timed test`
    : 'Content-length test';

  let correctionLabel: string;
  if (correctionMode === 'strict' && errorLimit !== null) {
    correctionLabel = `strict mode (${errorLimit} errors max)`;
  } else if (correctionMode === 'speed') {
    correctionLabel = 'speed mode';
  } else {
    correctionLabel = 'normal mode';
  }

  const displayLabel = `${durationLabel}, ${correctionLabel}`;

  return {
    date: targetDate,
    contentType,
    durationMode,
    durationSeconds,
    correctionMode,
    errorLimit,
    displayLabel,
  };
}

export function getDailyContent(config: DailyChallengeConfig): TestContent {
  const allTests = getDailySelectableTests();

  let filtered: TestContent[];
  switch (config.contentType) {
    case 'prose':
      filtered = allTests.filter(t => t.category === 'prose');
      break;
    case 'technical':
      filtered = allTests.filter(t => t.category === 'technical');
      break;
    case 'code':
      filtered = allTests.filter(t => t.category === 'code-typescript' || t.category === 'code-python');
      break;
    case 'common':
      filtered = allTests.filter(t => t.category === 'common');
      break;
    default:
      filtered = [];
  }

  const tests = filtered.length > 0 ? filtered : allTests;

  const targetDate = config.date;
  const epochDate = new Date(EPOCH + 'T00:00:00Z');
  const dateObj = new Date(targetDate + 'T00:00:00Z');
  const msPerDay = 24 * 60 * 60 * 1000;
  const dayNumber = Math.floor((dateObj.getTime() - epochDate.getTime()) / msPerDay);

  const cycleLength = tests.length;
  const cycleNumber = Math.floor(dayNumber / cycleLength);
  const positionInCycle = ((dayNumber % cycleLength) + cycleLength) % cycleLength;

  const cycleSeed = fnv1aHash('daily-content-' + config.date + '-' + config.contentType + '-cycle-' + cycleNumber);
  const prng = seededRandom(cycleSeed);

  const shuffled = [...tests];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(prng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled[positionInCycle];
}
