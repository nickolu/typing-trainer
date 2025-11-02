import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useUserStore } from './user-store';

export type TestDuration = 15 | 30 | 60 | 120 | 'content-length';
// Static content from library
export type StaticContentStyle = 'random' | 'quote' | 'prose' | 'technical' | 'common' | 'benchmark' | 'custom-text' | 'time-trial-001' | 'time-trial-002' | 'time-trial-003' | 'time-trial-004' | 'time-trial-005' | 'time-trial-006';
// AI-generated content styles
export type AIContentStyle = 'ai-prose' | 'ai-quote' | 'ai-technical' | 'ai-common' | 'ai-sequences' | 'ai-custom';
export type ContentStyle = StaticContentStyle | AIContentStyle;

export type CorrectionMode = 'normal' | 'speed' | 'strict';

interface SettingsState {
  // Test settings
  defaultDuration: TestDuration;
  autoSave: boolean;
  correctionMode: CorrectionMode;
  mistakeThreshold: number; // Number of mistakes allowed in strict mode (Infinity for unlimited)
  showPracticeHighlights: boolean;

  // Content settings
  defaultContentStyle: ContentStyle;
  customText: string; // User-provided custom text for typing practice
  llmModel: string;
  llmTemperature: number;
  customPrompt: string;
  customSequences: string[]; // User-defined character sequences for practice

  // Display settings
  showSpeedometer: boolean;
  showWPMOnSpeedometer: boolean;

  // Actions
  setDefaultDuration: (duration: TestDuration) => void;
  setAutoSave: (autoSave: boolean) => void;
  setCorrectionMode: (mode: CorrectionMode) => void;
  setMistakeThreshold: (threshold: number) => void;
  setShowPracticeHighlights: (enabled: boolean) => void;
  setDefaultContentStyle: (style: ContentStyle) => void;
  setCustomText: (text: string) => void;
  setLlmModel: (model: string) => void;
  setLlmTemperature: (temperature: number) => void;
  setCustomPrompt: (prompt: string) => void;
  setCustomSequences: (sequences: string[]) => void;
  setShowSpeedometer: (enabled: boolean) => void;
  setShowWPMOnSpeedometer: (enabled: boolean) => void;
  resetSettings: () => void;
}

// Helper to check if a style is AI-powered
export const isAIContentStyle = (style: ContentStyle): style is AIContentStyle => {
  return style.startsWith('ai-');
};

const defaultSettings = {
  defaultDuration: 30 as TestDuration,
  autoSave: true,
  correctionMode: 'normal' as CorrectionMode,
  mistakeThreshold: -1, // -1 represents unlimited (instead of Infinity which doesn't serialize)
  showPracticeHighlights: true,
  defaultContentStyle: 'random' as ContentStyle,
  customText: '',
  llmModel: 'gpt-4o-mini',
  llmTemperature: 0.7,
  customPrompt: '',
  customSequences: [] as string[],
  showSpeedometer: true,
  showWPMOnSpeedometer: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setDefaultDuration: (duration) => set({ defaultDuration: duration }),

      setAutoSave: (autoSave) => {
        // Only allow enabling autoSave if user is authenticated
        const { isAuthenticated } = useUserStore.getState();
        if (autoSave && !isAuthenticated) {
          return; // Silently ignore attempts to enable autoSave when not authenticated
        }
        set({ autoSave });
      },

      setCorrectionMode: (mode) => set({ correctionMode: mode }),

      setMistakeThreshold: (threshold) => set({ mistakeThreshold: threshold }),

      setShowPracticeHighlights: (enabled) => set({ showPracticeHighlights: enabled }),

      setDefaultContentStyle: (style) => set({ defaultContentStyle: style }),

      setCustomText: (text) => set({ customText: text }),

      setLlmModel: (model) => set({ llmModel: model }),

      setLlmTemperature: (temperature) => set({ llmTemperature: temperature }),

      setCustomPrompt: (prompt) => set({ customPrompt: prompt }),

      setCustomSequences: (sequences) => set({ customSequences: sequences }),

      setShowSpeedometer: (enabled) => set({ showSpeedometer: enabled }),

      setShowWPMOnSpeedometer: (enabled) => set({ showWPMOnSpeedometer: enabled }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'typing-trainer-settings',
    }
  )
);
