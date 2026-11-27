import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_LLM_MODEL, resolveLlmModelId } from '@/lib/llm/models';

export type TestDuration = 15 | 30 | 60 | 120 | 'content-length';
// Static content from library
export type StaticContentStyle = 'random' | 'quote' | 'prose' | 'technical' | 'common' | 'benchmark' | 'custom-text' | 'bigrams' | 'trigrams' | 'tetragrams' | 'special-chars' | 'code-typescript' | 'code-python' | 'time-trial-001' | 'time-trial-002' | 'time-trial-003' | 'time-trial-004' | 'time-trial-005' | 'time-trial-006';
// AI-generated content styles
export type AIContentStyle = 'ai-prose' | 'ai-quote' | 'ai-technical' | 'ai-common' | 'ai-sequences' | 'ai-custom' | 'ai-word-errors';
export type ContentStyle = StaticContentStyle | AIContentStyle;

export type CorrectionMode = 'normal' | 'speed' | 'strict';
export type CustomTextRepeat = 'once' | 'fill-duration' | number;

interface SettingsState {
  // Challenge mode - locks test settings when active
  challengeMode: boolean;
  setChallengeMode: (enabled: boolean) => void;

  // Test settings
  defaultDuration: TestDuration;
  correctionMode: CorrectionMode;
  mistakeThreshold: number; // Number of mistakes allowed in strict mode (Infinity for unlimited)
  showPracticeHighlights: boolean;

  // Content settings
  defaultContentStyle: ContentStyle;
  hasUserSelectedContent: boolean;
  // Transient (not persisted): set when the user explicitly picks an AI style on the content
  // picker. TypingTest only auto-generates AI content while this is true, so a persisted AI
  // style never generates on page load or when navigating back home.
  aiGenerationRequested: boolean;
  customText: string; // User-provided custom text for typing practice
  customTextRepeat: CustomTextRepeat; // How many times to repeat custom text
  llmModel: string;
  llmTemperature: number;
  customPrompt: string;
  customSequences: string[]; // User-defined character sequences for practice

  // Display settings
  showSpeedometer: boolean;
  showWPMOnSpeedometer: boolean;

  // Keyboard setting
  currentKeyboard: string | null; // Full label with "keyboard-" prefix, or null

  // Actions
  setDefaultDuration: (duration: TestDuration) => void;
  setCorrectionMode: (mode: CorrectionMode) => void;
  setMistakeThreshold: (threshold: number) => void;
  setShowPracticeHighlights: (enabled: boolean) => void;
  setDefaultContentStyle: (style: ContentStyle) => void;
  setHasUserSelectedContent: (value: boolean) => void;
  setAiGenerationRequested: (value: boolean) => void;
  // Back to the first-visit state: no content selected, default style (drops time-trial / AI modes)
  clearContentSelection: () => void;
  setCustomText: (text: string) => void;
  setCustomTextRepeat: (repeat: CustomTextRepeat) => void;
  setLlmModel: (model: string) => void;
  setLlmTemperature: (temperature: number) => void;
  setCustomPrompt: (prompt: string) => void;
  setCustomSequences: (sequences: string[]) => void;
  setShowSpeedometer: (enabled: boolean) => void;
  setShowWPMOnSpeedometer: (enabled: boolean) => void;
  setCurrentKeyboard: (keyboard: string | null) => void;
  wpmGoal: number; // 0 means no goal set
  setWpmGoal: (goal: number) => void;
  resetSettings: () => void;
}

// Helper to check if a style is AI-powered
export const isAIContentStyle = (style: ContentStyle): style is AIContentStyle => {
  return style.startsWith('ai-');
};

const defaultSettings = {
  challengeMode: false,
  defaultDuration: 30 as TestDuration,
  correctionMode: 'normal' as CorrectionMode,
  mistakeThreshold: -1, // -1 represents unlimited (instead of Infinity which doesn't serialize)
  showPracticeHighlights: true,
  defaultContentStyle: 'random' as ContentStyle,
  hasUserSelectedContent: false,
  aiGenerationRequested: false,
  customText: '',
  customTextRepeat: 'once' as CustomTextRepeat,
  llmModel: DEFAULT_LLM_MODEL,
  llmTemperature: 0.7,
  customPrompt: '',
  customSequences: [] as string[],
  showSpeedometer: true,
  showWPMOnSpeedometer: true,
  currentKeyboard: null,
  wpmGoal: 0,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      ...defaultSettings,

      setChallengeMode: (enabled) => set({ challengeMode: enabled }),

      setDefaultDuration: (duration) => {
        if (get().challengeMode) return;
        set({ defaultDuration: duration });
      },

      setCorrectionMode: (mode) => {
        if (get().challengeMode) return;
        set({ correctionMode: mode });
      },

      setMistakeThreshold: (threshold) => set({ mistakeThreshold: threshold }),

      setShowPracticeHighlights: (enabled) => set({ showPracticeHighlights: enabled }),

      setDefaultContentStyle: (style) => {
        if (get().challengeMode) return;
        set({ defaultContentStyle: style });
      },

      setHasUserSelectedContent: (value) => set({ hasUserSelectedContent: value }),

      setAiGenerationRequested: (value) => set({ aiGenerationRequested: value }),

      clearContentSelection: () =>
        set({
          defaultContentStyle: defaultSettings.defaultContentStyle,
          hasUserSelectedContent: false,
          aiGenerationRequested: false,
        }),

      setCustomText: (text) => set({ customText: text }),

      setCustomTextRepeat: (repeat) => set({ customTextRepeat: repeat }),

      setLlmModel: (model) => set({ llmModel: resolveLlmModelId(model) }),

      setLlmTemperature: (temperature) => set({ llmTemperature: temperature }),

      setCustomPrompt: (prompt) => set({ customPrompt: prompt }),

      setCustomSequences: (sequences) => set({ customSequences: sequences }),

      setShowSpeedometer: (enabled) => set({ showSpeedometer: enabled }),

      setShowWPMOnSpeedometer: (enabled) => set({ showWPMOnSpeedometer: enabled }),

      setCurrentKeyboard: (keyboard) => set({ currentKeyboard: keyboard }),

      setWpmGoal: (goal) => set({ wpmGoal: goal }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'typing-trainer-settings',
      version: 1,
      migrate: (persistedState, version) => {
        const state = (persistedState ?? {}) as SettingsState;
        if (version < 1) {
          // v0 -> v1: model catalog changed (Anthropic added, legacy GPT IDs removed)
          return { ...state, llmModel: resolveLlmModelId(state.llmModel) };
        }
        return state;
      },
      partialize: (state) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { challengeMode, setChallengeMode, aiGenerationRequested, ...rest } = state;
        return rest;
      },
    }
  )
);
