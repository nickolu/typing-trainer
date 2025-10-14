import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type TestDuration = 15 | 30 | 60 | 120;

interface SettingsState {
  // Test settings
  defaultDuration: TestDuration;
  autoSave: boolean;

  // Actions
  setDefaultDuration: (duration: TestDuration) => void;
  setAutoSave: (autoSave: boolean) => void;
  resetSettings: () => void;
}

const defaultSettings = {
  defaultDuration: 30 as TestDuration,
  autoSave: true,
};

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      ...defaultSettings,

      setDefaultDuration: (duration) => set({ defaultDuration: duration }),

      setAutoSave: (autoSave) => set({ autoSave }),

      resetSettings: () => set(defaultSettings),
    }),
    {
      name: 'typing-trainer-settings',
    }
  )
);
