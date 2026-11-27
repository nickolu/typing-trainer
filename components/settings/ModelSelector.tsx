'use client';

import { getModelsByProvider, resolveLlmModelId } from '@/lib/llm/models';

interface ModelSelectorProps {
  value: string;
  onChange: (modelId: string) => void;
  className?: string;
  id?: string;
}

/**
 * Dropdown of available AI models, grouped by provider.
 * Legacy/unknown stored IDs are resolved to a current model so the select
 * always shows a valid option.
 */
export function ModelSelector({ value, onChange, className, id }: ModelSelectorProps) {
  const groups = getModelsByProvider();
  const resolvedValue = resolveLlmModelId(value);

  return (
    <select
      id={id}
      value={resolvedValue}
      onChange={(e) => onChange(e.target.value)}
      className={
        className ??
        'w-full px-3 py-2 bg-editor-bg border border-editor-muted rounded-lg focus:outline-none focus:ring-2 focus:ring-editor-accent'
      }
    >
      {groups.map((group) => (
        <optgroup key={group.provider} label={group.label}>
          {group.models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.label} — {model.description}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}
