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
import { saveTestResult } from '@/lib/db';
import { useSettingsStore } from './settings-store';

export const useTestStore = create<TestState>((set, get) => ({
  // Initial state
  testId: null,
  duration: 30,
  targetWords: [],
  testContentId: null,
  isPractice: false,
  practiceSequences: [], // Can include both character sequences and full words
  status: 'idle',
  startTime: null,
  endTime: null,
  currentWordIndex: 0,
  currentInput: '',
  completedWords: [],
  keystrokes: [],
  result: null,

  // Initialize a new test
  initializeTest: (config: TestConfig, words: string[]) => {
    set({
      testId: uuidv4(),
      duration: config.duration,
      targetWords: words,
      testContentId: config.testContentId,
      isPractice: config.isPractice || false,
      practiceSequences: config.practiceSequences || [],
      status: 'idle',
      startTime: null,
      endTime: null,
      currentWordIndex: 0,
      currentInput: '',
      completedWords: [],
      keystrokes: [],
      result: null,
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

    if (state.status !== 'active' || state.currentInput.length === 0) return;

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
      set({
        testId: null,
        duration: 30,
        targetWords: [],
        testContentId: null,
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
      state.duration
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

    // Create result object
    const result: TestResult = {
      id: state.testId,
      createdAt: new Date(),
      duration: state.duration,
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
    };

    // Save to IndexedDB only if shouldSave is true
    if (shouldSave) {
      await saveTestResult(result);
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
    set({
      testId: null,
      duration: 30,
      targetWords: [],
      testContentId: null,
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
  },
}));
