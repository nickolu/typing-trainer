import { describe, it, expect } from 'vitest';
import {
  DEFAULT_LLM_MODEL,
  LLM_MODELS,
  getLlmModel,
  getModelsByProvider,
  resolveLlmModel,
  resolveLlmModelId,
} from '../llm/models';

describe('LLM model catalog', () => {
  it('defaults to Claude Haiku', () => {
    expect(DEFAULT_LLM_MODEL).toBe('claude-haiku-5-5');
    expect(getLlmModel(DEFAULT_LLM_MODEL)?.provider).toBe('anthropic');
  });

  it('has unique model IDs', () => {
    const ids = LLM_MODELS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('includes both Anthropic and OpenAI models', () => {
    const groups = getModelsByProvider();
    const byProvider = Object.fromEntries(groups.map((g) => [g.provider, g.models.length]));
    expect(byProvider.anthropic).toBeGreaterThan(0);
    expect(byProvider.openai).toBeGreaterThan(0);
  });

  it('resolves current IDs to themselves', () => {
    for (const model of LLM_MODELS) {
      expect(resolveLlmModel(model.id)).toBe(model);
    }
  });

  it('migrates legacy OpenAI IDs', () => {
    expect(resolveLlmModelId('gpt-4o-mini')).toBe(DEFAULT_LLM_MODEL);
    expect(resolveLlmModelId('gpt-4o')).toBe('gpt-6.1-terra');
    expect(resolveLlmModelId('gpt-4-turbo')).toBe('gpt-6.1-sol');
  });

  it('falls back to the default for unknown or empty IDs', () => {
    expect(resolveLlmModelId('not-a-model')).toBe(DEFAULT_LLM_MODEL);
    expect(resolveLlmModelId(undefined)).toBe(DEFAULT_LLM_MODEL);
    expect(resolveLlmModelId('')).toBe(DEFAULT_LLM_MODEL);
  });
});
