import { describe, it, expect, vi } from 'vitest';
import type { TestResult } from '@/lib/types';

vi.mock('./test-content', () => ({ getTestContent: vi.fn() }));
vi.mock('@/lib/firebase-config', () => ({ getFirebaseDb: vi.fn() }));

import { getTestContent } from './test-content';
import { hydrateTargetWords } from './test-results';

const mockedGetTestContent = vi.mocked(getTestContent);

function content(words: string[]) {
  return { id: 'c', userId: 'u', text: words.join(' '), words, contentHash: 'h', createdAt: new Date() };
}

function result(over: Partial<TestResult>): TestResult {
  return { id: 'r', createdAt: new Date(), typedWords: [], keystrokeTimings: [], ...over } as TestResult;
}

describe('hydrateTargetWords', () => {
  it('fills targetWords from the content doc, normalized like the test engine', async () => {
    mockedGetTestContent.mockResolvedValueOnce(content(['It’s', 'fine']));
    const [r] = await hydrateTargetWords([result({ testContentId: 'hydrate-1', totalWords: 2 })]);
    expect(r.targetWords).toEqual(["It's", 'fine']);
  });

  it('fetches each content id once and leaves results that already have words alone', async () => {
    mockedGetTestContent.mockResolvedValueOnce(content(['a', 'b']));
    const results = await hydrateTargetWords([
      result({ testContentId: 'hydrate-2' }),
      result({ testContentId: 'hydrate-2' }),
      result({ testContentId: 'hydrate-other', targetWords: ['keep'] }),
    ]);
    expect(mockedGetTestContent).toHaveBeenCalledWith('hydrate-2');
    expect(mockedGetTestContent).not.toHaveBeenCalledWith('hydrate-other');
    expect(results.map((r) => r.targetWords)).toEqual([['a', 'b'], ['a', 'b'], ['keep']]);
  });

  it('leaves a result unchanged when its content is missing or no longer the same length', async () => {
    mockedGetTestContent.mockResolvedValueOnce(null);
    mockedGetTestContent.mockResolvedValueOnce(content(['one', 'two', 'three']));
    const results = await hydrateTargetWords([
      result({ testContentId: 'hydrate-missing' }),
      result({ testContentId: 'hydrate-resized', totalWords: 2 }),
    ]);
    expect(results.every((r) => r.targetWords === undefined)).toBe(true);
  });
});
