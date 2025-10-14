import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TestDuration = 15 | 30 | 60 | 120;
// Static content from library
export type StaticContentStyle = 'random' | 'quote' | 'prose' | 'technical' | 'common';
// AI-generated content styles
export type AIContentStyle = 'ai-prose' | 'ai-quote' | 'ai-technical' | 'ai-common' | 'ai-sequences' | 'ai-custom';
export type ContentStyle = StaticContentStyle | AIContentStyle;

interface SettingsState {
  // Test settings
  defaultDuration: TestDuration;
  autoSave: boolean;
  noBackspaceMode: boolean;
  showPracticeHighlights: boolean;

  // Content settings
  defaultContentStyle: ContentStyle;
  llmModel: string;
  llmTemperature: number;
  customPrompt: string;
  customSequences: string[]; // User-defined character sequences for practice

  // Actions
  setDefaultDuration: (duration: TestDuration) => void;
  setAutoSave: (autoSave: boolean) => void;
  setNoBackspaceMode: (enabled: boolean) => void;
  setShowPracticeHighlights: (enabled: boolean) => void;
  setDefaultContentStyle: (style: ContentStyle) => void;
  setLlmModel: (model: string) => void;
  setLlmTemperature: (temperature: number) => void;
  setCustomPrompt: (prompt: string) => void;
  setCustomSequences: (sequences: string[]) => void;
  resetSettings: () => void;
}

// Helper to check if a style is AI-powered
export const isAIContentStyle = (style: ContentStyle): style is AIContentStyle => {
  return style.startsWith('ai-');
};

const defaultSettings = {
  defaultDuration: 30 as TestDuration,
  autoSave: true,
  noBackspaceMode: false,
  showPracticeHighlights: true,
  defaultContentStyle: 'random' as ContentStyle,
  llmModel: 'gpt-4o-mini',
  llmTemperature: 0.7,
  customPrompt: '',
  customSequences: [] as string[],
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setDefaultDuration: (duration) => set({ defaultDuration: duration }),

      setAutoSave: (autoSave) => set({ autoSave }),

      setNoBackspaceMode: (enabled) => set({ noBackspaceMode: enabled }),

      setShowPracticeHighlights: (enabled) => set({ showPracticeHighlights: enabled }),

      setDefaultContentStyle: (style) => set({ defaultContentStyle: style }),

      setLlmModel: (model) => set({ llmModel: model }),

      setLlmTemperature: (temperature) => set({ llmTemperature: temperature }),

      setCustomPrompt: (prompt) => set({ customPrompt: prompt }),

      setCustomSequences: (sequences) => set({ customSequences: sequences }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'typing-trainer-settings',
    }
  )
);
