import { anthropic } from '@ai-sdk/anthropic';
import { openai } from '@ai-sdk/openai';
import type { generateText, LanguageModel } from 'ai';
import type { LlmModel, LlmProvider } from './models';

const PROVIDER_ENV_KEYS: Record<LlmProvider, string> = {
  anthropic: 'ANTHROPIC_API_KEY',
  openai: 'OPENAI_API_KEY',
};

/** Returns true when the API key for the given provider is configured. */
export function isProviderConfigured(provider: LlmProvider): boolean {
  return Boolean(process.env[PROVIDER_ENV_KEYS[provider]]);
}

/**
 * Returns an error message if the provider needed for `model` has no API key
 * configured on the server, or null if everything is in place.
 */
export function getProviderConfigError(model: LlmModel): string | null {
  if (isProviderConfigured(model.provider)) return null;
  return `${PROVIDER_ENV_KEYS[model.provider]} is not configured on the server`;
}

/** Build a Vercel AI SDK language model for a catalog entry. */
export function getLanguageModel(model: LlmModel): LanguageModel {
  switch (model.provider) {
    case 'anthropic':
      return anthropic(model.id);
    case 'openai':
      return openai(model.id);
  }
}

/**
 * Provider-specific request options tuned for short creative generation.
 * Typing passages don't benefit from deep reasoning, so effort is kept low to
 * minimise latency and cost.
 */
type ProviderOptions = NonNullable<Parameters<typeof generateText>[0]['providerOptions']>;

export function getProviderOptions(model: LlmModel): ProviderOptions {
  switch (model.provider) {
    case 'anthropic':
      return { anthropic: { effort: 'low' } };
    case 'openai':
      return {
        openai: {
          // Temperature-capable GPT-6 models only honour it with reasoning off.
          reasoningEffort: model.supportsTemperature ? 'none' : 'low',
        },
      };
  }
}
