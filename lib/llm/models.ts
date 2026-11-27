/**
 * Catalog of LLM models available for AI content generation.
 *
 * This file is imported by both client components (model picker) and server
 * code (provider resolution), so it must stay free of server-only imports.
 */

export type LlmProvider = 'anthropic' | 'openai';

export interface LlmModel {
  /** Provider-specific model ID sent to the API */
  id: string;
  provider: LlmProvider;
  /** Human-readable name shown in the UI */
  label: string;
  /** Short hint shown next to the label */
  description: string;
  /**
   * Whether the temperature setting is honoured by this model. Newer Claude
   * models and OpenAI reasoning models reject or ignore sampling parameters.
   */
  supportsTemperature: boolean;
}

export const PROVIDER_LABELS: Record<LlmProvider, string> = {
  anthropic: 'Anthropic',
  openai: 'OpenAI',
};

export const DEFAULT_LLM_MODEL = 'claude-haiku-5-5';

export const LLM_MODELS: readonly LlmModel[] = [
  {
    id: 'claude-haiku-5-5',
    provider: 'anthropic',
    label: 'Claude Haiku 5.5',
    description: 'Fast & cheap (Recommended)',
    supportsTemperature: false,
  },
  {
    id: 'claude-sonnet-5-5',
    provider: 'anthropic',
    label: 'Claude Sonnet 5.5',
    description: 'Best quality',
    supportsTemperature: false,
  },
  {
    id: 'gpt-6-luna',
    provider: 'openai',
    label: 'GPT-6 Luna',
    description: 'Fast & cheap',
    supportsTemperature: true,
  },
  {
    id: 'gpt-6.1-terra',
    provider: 'openai',
    label: 'GPT-6.1 Terra',
    description: 'Balanced',
    supportsTemperature: true,
  },
  {
    id: 'gpt-6.1-sol',
    provider: 'openai',
    label: 'GPT-6.1 Sol',
    description: 'Best quality (reasoning)',
    supportsTemperature: false,
  },
];

/**
 * Model IDs that used to be offered in the UI, mapped to their closest
 * current equivalent. Used to migrate persisted user settings.
 */
const LEGACY_MODEL_MAP: Record<string, string> = {
  'gpt-4o-mini': DEFAULT_LLM_MODEL,
  'gpt-4o': 'gpt-6.1-terra',
  'gpt-4-turbo': 'gpt-6.1-sol',
};

export function getLlmModel(id: string | undefined | null): LlmModel | undefined {
  if (!id) return undefined;
  return LLM_MODELS.find((m) => m.id === id);
}

/**
 * Resolve any stored/requested model ID to a model from the current catalog.
 * Unknown or legacy IDs fall back to the default model.
 */
export function resolveLlmModel(id: string | undefined | null): LlmModel {
  const direct = getLlmModel(id);
  if (direct) return direct;

  const migrated = id ? LEGACY_MODEL_MAP[id] : undefined;
  const migratedModel = getLlmModel(migrated);
  if (migratedModel) return migratedModel;

  return getLlmModel(DEFAULT_LLM_MODEL)!;
}

/** Resolve a model ID string, returning a valid catalog ID. */
export function resolveLlmModelId(id: string | undefined | null): string {
  return resolveLlmModel(id).id;
}

export function getModelsByProvider(): { provider: LlmProvider; label: string; models: LlmModel[] }[] {
  return (Object.keys(PROVIDER_LABELS) as LlmProvider[]).map((provider) => ({
    provider,
    label: PROVIDER_LABELS[provider],
    models: LLM_MODELS.filter((m) => m.provider === provider),
  }));
}
