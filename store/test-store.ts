import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  TestState,
  TestConfig,
  TestResult,
  KeystrokeEvent,
} from '@/lib/types';
import {
  calculateWPM,
  calculateAccuracy,
  normalizeTypedWords,
} from '@/lib/test-engine/calculations';
import { analyzeMistakes } from '@/lib/test-engine/mistake-analysis';
import { saveTestResult, updateUserWPMScore } from '@/lib/db/firebase';
import { useSettingsStore } from './settings-store';
import { useUserStore } from './user-store';
import { BENCHMARK_CONFIG } from '@/lib/benchmark-config';

export const useTestStore = create<TestState>((set, get) => ({
  // Initial state
  testId: null,
  duration: 30,
  targetWords: [],
  testContentId: null,
  testContentTitle: null,
  testContentCategory: null,
  isPractice: false,
  practiceSequences: [], // Can include both character sequences and full words
  userLabels: [],
  status: 'idle',
  startTime: null,
  endTime: null,
  currentWordIndex: 0,
  currentInput: '',
  completedWords: [],
  keystrokes: [],
  result: null,
  // Store last test configuration for "try again" functionality
  lastTestConfig: null,

  // Initialize a new test
  initializeTest: (config: TestConfig, words: string[]) => {
    console.log('[TestStore] initializeTest called with:', {
      testContentTitle: config.testContentTitle,
      testContentCategory: config.testContentCategory,
    });
    set({
      testId: uuidv4(),
      duration: config.duration,
      targetWords: words,
      testContentId: config.testContentId,
      testContentTitle: config.testContentTitle || null,
      testContentCategory: config.testContentCategory || null,
      isPractice: config.isPractice || false,
      practiceSequences: config.practiceSequences || [],
      userLabels: config.userLabels || [],
      status: 'idle',
      startTime: null,
      endTime: null,
      currentWordIndex: 0,
      currentInput: '',
      completedWords: [],
      keystrokes: [],
      result: null,
      // Store configuration for "try again"
      lastTestConfig: {
        duration: config.duration,
        testContentId: config.testContentId,
        targetWords: words,
        isPractice: config.isPractice || false,
        practiceSequences: config.practiceSequences || [],
      },
    });
  },

  // Start the test
  startTest: () => {
    const state = get();
    if (state.status === 'idle') {
      set({
        status: 'active',
        startTime: performance.now(),
      });
    }
  },

  // Handle character input
  handleKeyPress: (key: string) => {
    const state = get();

    // Only process if test is active
    if (state.status !== 'active' || !state.startTime) return;

    const currentWord = state.targetWords[state.currentWordIndex];
    if (!currentWord) return;

    // Check if this is a space (word completion)
    if (key === ' ') {
      // Don't add space if current input is empty
      if (state.currentInput.length === 0) return;

      // Complete the current word
      const newCompletedWords = [...state.completedWords, state.currentInput];

      // Record keystroke for the space
      const keystroke: KeystrokeEvent = {
        timestamp: performance.now(),
        key: ' ',
        wordIndex: state.currentWordIndex,
        charIndex: state.currentInput.length,
        wasCorrect: true, // Space key always correct (it's a delimiter)
        isBackspace: false,
      };

      // Move to next word
      set({
        completedWords: newCompletedWords,
        currentWordIndex: state.currentWordIndex + 1,
        currentInput: '',
        keystrokes: [...state.keystrokes, keystroke],
      });

      return;
    }

    // Add character to current input
    const newInput = state.currentInput + key;

    // Determine if this keystroke is correct
    const expectedChar = currentWord[state.currentInput.length];
    const wasCorrect = key === expectedChar;

    // Record keystroke with mistake tracking
    const keystroke: KeystrokeEvent = {
      timestamp: performance.now(),
      key,
      wordIndex: state.currentWordIndex,
      charIndex: state.currentInput.length,
      expectedChar,
      wasCorrect,
      isBackspace: false,
    };

    set({
      currentInput: newInput,
      keystrokes: [...state.keystrokes, keystroke],
    });
  },

  // Handle backspace
  handleBackspace: () => {
    const state = get();

    // Check if no-backspace mode is enabled
    const noBackspaceMode = useSettingsStore.getState().noBackspaceMode;
    if (noBackspaceMode) {
      // Do nothing if no-backspace mode is enabled
      return;
    }

    if (state.status !== 'active') return;

    // If current input is empty and we're at the start of a word, go to previous word
    if (state.currentInput.length === 0) {
      // Can't go back if we're at the first word
      if (state.currentWordIndex === 0) return;

      // Move back to previous word
      const previousWordIndex = state.currentWordIndex - 1;
      const previousWord = state.completedWords[previousWordIndex];
      const newCompletedWords = state.completedWords.slice(0, previousWordIndex);

      // Record keystroke
      const keystroke: KeystrokeEvent = {
        timestamp: performance.now(),
        key: 'Backspace',
        wordIndex: state.currentWordIndex,
        charIndex: 0,
        wasCorrect: true,
        isBackspace: true,
      };

      set({
        currentWordIndex: previousWordIndex,
        currentInput: previousWord || '',
        completedWords: newCompletedWords,
        keystrokes: [...state.keystrokes, keystroke],
      });

      return;
    }

    // Remove last character
    const newInput = state.currentInput.slice(0, -1);

    // Record keystroke
    const keystroke: KeystrokeEvent = {
      timestamp: performance.now(),
      key: 'Backspace',
      wordIndex: state.currentWordIndex,
      charIndex: state.currentInput.length - 1,
      wasCorrect: true, // Backspace is a correction action, not a mistake
      isBackspace: true,
    };

    set({
      currentInput: newInput,
      keystrokes: [...state.keystrokes, keystroke],
    });
  },

  // Handle Tab key (skip to next word)
  handleTab: () => {
    const state = get();

    if (state.status !== 'active') return;

    // Add current input as-is to completed words (even if incomplete/incorrect)
    const newCompletedWords = [...state.completedWords, state.currentInput];

    // Record keystroke
    const keystroke: KeystrokeEvent = {
      timestamp: performance.now(),
      key: 'Tab',
      wordIndex: state.currentWordIndex,
      charIndex: state.currentInput.length,
      wasCorrect: false, // Tab is used to skip, considered incorrect
      isBackspace: false,
    };

    // Move to next word
    set({
      completedWords: newCompletedWords,
      currentWordIndex: state.currentWordIndex + 1,
      currentInput: '',
      keystrokes: [...state.keystrokes, keystroke],
    });
  },

  // Complete the test
  completeTest: async (shouldSave: boolean = true) => {
    const state = get();

    // Guard against invalid state - if test isn't active, reset and return
    if (state.status !== 'active' || !state.startTime || !state.testId) {
      console.warn('Cannot complete test: test not active. Resetting state.');
      const defaultDuration = useSettingsStore.getState().defaultDuration;
      set({
        testId: null,
        duration: defaultDuration,
        targetWords: [],
        testContentId: null,
        testContentTitle: null,
        testContentCategory: null,
        isPractice: false,
        practiceSequences: [],
        status: 'idle',
        startTime: null,
        endTime: null,
        currentWordIndex: 0,
        currentInput: '',
        completedWords: [],
        keystrokes: [],
        result: null,
      });
      return null;
    }

    const endTime = performance.now();

    // Calculate actual duration in seconds
    const actualDuration = state.duration === 'content-length'
      ? Math.round((endTime - state.startTime) / 1000)
      : state.duration;

    // Add current input to completed words if there's any
    let finalCompletedWords = [...state.completedWords];
    if (state.currentInput.length > 0) {
      finalCompletedWords.push(state.currentInput);
    }

    // Normalize typed words to match target length
    const normalizedTypedWords = normalizeTypedWords(
      state.targetWords,
      finalCompletedWords
    );

    // Calculate stats
    const { accuracy, correctCount, incorrectCount, totalTyped } = calculateAccuracy(
      state.targetWords,
      normalizedTypedWords
    );

    const wpm = calculateWPM(
      state.targetWords,
      normalizedTypedWords,
      actualDuration
    );

    // Analyze mistakes
    const mistakeAnalysis = analyzeMistakes(
      state.keystrokes,
      state.targetWords,
      normalizedTypedWords
    );

    // Build character substitutions map
    const characterSubstitutions: Record<string, string[]> = {};
    for (const sub of mistakeAnalysis.characterSubstitutions) {
      if (!characterSubstitutions[sub.expected]) {
        characterSubstitutions[sub.expected] = [];
      }
      characterSubstitutions[sub.expected].push(sub.actual);
    }

    // Generate auto-labels from test configuration
    const autoLabels: string[] = [];

    // Duration label
    if (state.duration === 'content-length') {
      autoLabels.push('content-length-mode');
    } else {
      autoLabels.push(`time-${state.duration}s`);
    }

    // No-corrections mode label
    const noBackspaceMode = useSettingsStore.getState().noBackspaceMode;
    autoLabels.push(noBackspaceMode ? 'no-corrections-on' : 'no-corrections-off');

    // Content category label (if available)
    if (state.testContentCategory) {
      autoLabels.push(state.testContentCategory.toLowerCase());
    }

    // Practice mode label
    if (state.isPractice) {
      autoLabels.push('practice-mode');
    }

    // Combine user labels and auto labels
    const allLabels = [...state.userLabels, ...autoLabels];

    // Create result object
    const result: TestResult = {
      id: state.testId,
      createdAt: new Date(),
      duration: actualDuration,
      testContentId: state.testContentId || '',
      targetWords: state.targetWords,
      typedWords: normalizedTypedWords,
      wpm,
      accuracy,
      correctWordCount: correctCount,
      incorrectWordCount: incorrectCount,
      totalWords: state.targetWords.length,
      totalTypedWords: totalTyped,
      keystrokeTimings: state.keystrokes,
      isPractice: state.isPractice || !shouldSave, // Mark as practice if not saving
      practiceSequences: state.practiceSequences.length > 0 ? state.practiceSequences : undefined,
      mistakeCount: mistakeAnalysis.totalMistakes,
      correctionCount: mistakeAnalysis.totalCorrections,
      characterSubstitutions: Object.keys(characterSubstitutions).length > 0 ? characterSubstitutions : undefined,
      labels: allLabels.length > 0 ? allLabels : undefined,
    };

    // Save to Firebase only if shouldSave is true
    if (shouldSave) {
      // Get current userId from user store
      const userState = useUserStore.getState();
      const currentUserId = userState.currentUserId;

      console.log('[TestStore] Attempting to save test result:', {
        userId: currentUserId,
        isAuthenticated: userState.isAuthenticated,
        email: userState.email,
        testId: result.id,
      });

      if (!currentUserId) {
        console.error('Cannot save test result: no user logged in');
        throw new Error('User not authenticated');
      }

      await saveTestResult(result, currentUserId);

      // Check if this is a benchmark test and update WPM score
      const isBenchmarkTest = allLabels.includes(BENCHMARK_CONFIG.label);
      if (isBenchmarkTest) {
        console.log('[TestStore] Benchmark test completed, updating WPM score:', wpm);
        try {
          await updateUserWPMScore(currentUserId, wpm);
          // Refresh user profile to get updated WPM score
          await userState.refreshUserProfile();
        } catch (error) {
          console.error('Failed to update WPM score:', error);
          // Don't throw - test is still saved, just WPM update failed
        }
      }
    }

    // Update state
    set({
      status: 'complete',
      endTime,
      result,
    });

    return result;
  },

  // Reset test
  resetTest: () => {
    const defaultDuration = useSettingsStore.getState().defaultDuration;
    set({
      testId: null,
      duration: defaultDuration,
      targetWords: [],
      testContentId: null,
      testContentTitle: null,
      testContentCategory: null,
      isPractice: false,
      practiceSequences: [],
      userLabels: [],
      status: 'idle',
      startTime: null,
      endTime: null,
      currentWordIndex: 0,
      currentInput: '',
      completedWords: [],
      keystrokes: [],
      result: null,
      // Preserve lastTestConfig so "try again" works
    });
  },

  // Set user labels for the current test
  setUserLabels: (labels: string[]) => {
    set({ userLabels: labels });
  },

  // Retry the last test with the same configuration
  retryLastTest: () => {
    const state = get();
    if (!state.lastTestConfig) {
      console.warn('No previous test configuration found');
      return;
    }

    const { duration, testContentId, targetWords, isPractice, practiceSequences } = state.lastTestConfig;

    set({
      testId: uuidv4(),
      duration,
      targetWords,
      testContentId,
      testContentTitle: state.testContentTitle, // Preserve title
      testContentCategory: state.testContentCategory, // Preserve category
      isPractice,
      practiceSequences,
      status: 'idle',
      startTime: null,
      endTime: null,
      currentWordIndex: 0,
      currentInput: '',
      completedWords: [],
      keystrokes: [],
      result: null,
      // Keep the same lastTestConfig
      lastTestConfig: state.lastTestConfig,
    });
  },
}));
