import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import {
  TestState,
  TestConfig,
  TestResult,
  KeystrokeEvent,
  CompletedWord,
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
import { STRICT_MODE_CONFIG } from '@/lib/strict-mode-config';

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
  isTimeTrial: false,
  timeTrialId: null,
  status: 'idle',
  startTime: null,
  endTime: null,
  currentWordIndex: 0,
  currentInput: '',
  completedWords: [],
  keystrokes: [],
  result: null,
  strictModeErrors: 0, // Track mistakes in strict mode
  inputBlocked: false, // Track if input is temporarily blocked
  failedReason: null, // Reason for test failure
  // Store last test configuration for "try again" functionality
  lastTestConfig: null,

  // Initialize a new test
  initializeTest: (config: TestConfig, words: string[]) => {
    console.log('[TestStore] initializeTest called with:', {
      testContentTitle: config.testContentTitle,
      testContentCategory: config.testContentCategory,
      isTimeTrial: config.isTimeTrial,
      timeTrialId: config.timeTrialId,
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
      isTimeTrial: config.isTimeTrial || false,
      timeTrialId: config.timeTrialId || null,
      status: 'idle',
      startTime: null,
      endTime: null,
      currentWordIndex: 0,
      currentInput: '',
      completedWords: [],
      keystrokes: [],
      strictModeErrors: 0,
      inputBlocked: false,
      failedReason: null,
      result: null,
      // Store configuration for "try again"
      lastTestConfig: {
        duration: config.duration,
        testContentId: config.testContentId,
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

    // Only process if test is active (not failed, complete, or idle)
    if (state.status !== 'active' || !state.startTime) return;

    // Block input if currently in delay penalty period
    if (state.inputBlocked) return;

    const currentWord = state.targetWords[state.currentWordIndex];
    if (!currentWord) return;

    // Force strict mode for time trials, otherwise use user's setting
    const correctionMode = state.isTimeTrial ? 'strict' : useSettingsStore.getState().correctionMode;
    // Time trials always allow unlimited mistakes (threshold = -1), otherwise use user's setting
    const mistakeThreshold = state.isTimeTrial ? -1 : useSettingsStore.getState().mistakeThreshold;

    // Check if this is a space (word completion)
    if (key === ' ') {
      const isWordComplete = state.currentInput.length === currentWord.length;
      const isWordCorrect = state.currentInput === currentWord;
      const isAtStart = state.currentInput.length === 0;
      const isAtEnd = state.currentInput.length >= currentWord.length; // Allow moving forward even if typed past the end

      // Handle space based on correction mode
      if (correctionMode === 'strict') {
        // Strict mode: only allow space at end of perfectly typed word
        if (!isWordComplete || !isWordCorrect) {
          console.log('[TestStore] Strict mode: blocking space - word not complete or incorrect');
          
          // Increment error count
          const newErrorCount = state.strictModeErrors + 1;

          // Record the failed keystroke (but don't add to input)
          const keystroke: KeystrokeEvent = {
            timestamp: performance.now(),
            key: ' ',
            wordIndex: state.currentWordIndex,
            charIndex: state.currentInput.length,
            expectedChar: currentWord[state.currentInput.length],
            wasCorrect: false,
            isBackspace: false,
          };

          // Block input temporarily
          set({
            strictModeErrors: newErrorCount,
            keystrokes: [...state.keystrokes, keystroke],
            inputBlocked: true,
          });

          // Unblock input after delay
          setTimeout(() => {
            const currentState = get();
            if (currentState.status === 'active') {
              set({ inputBlocked: false });
            }
          }, STRICT_MODE_CONFIG.MISTAKE_DELAY_MS);

          console.log('[TestStore] Strict mode error count:', newErrorCount, 'threshold:', mistakeThreshold);

          // Check if we've reached the mistake threshold (-1 means unlimited)
          if (mistakeThreshold > 0 && newErrorCount >= mistakeThreshold) {
            console.log('[TestStore] Mistake threshold reached, failing test');
            // Fail the test due to too many mistakes
            setTimeout(() => {
              const currentState = get();
              if (currentState.status === 'active') {
                set({
                  status: 'failed',
                  endTime: performance.now(),
                  failedReason: `You reached the mistake limit of ${mistakeThreshold}. ${mistakeThreshold === 1 ? '1 mistake' : mistakeThreshold + ' mistakes'} allowed.`,
                });
              }
            }, 500);
          }

          return;
        }
        
        // Complete the word (not skipped)
        const completedWord: CompletedWord = {
          text: state.currentInput,
          wasSkipped: false,
        };
        const newCompletedWords = [...state.completedWords, completedWord];

        const keystroke: KeystrokeEvent = {
          timestamp: performance.now(),
          key: ' ',
          wordIndex: state.currentWordIndex,
          charIndex: state.currentInput.length,
          wasCorrect: true,
          isBackspace: false,
        };

        set({
          completedWords: newCompletedWords,
          currentWordIndex: state.currentWordIndex + 1,
          currentInput: '',
          keystrokes: [...state.keystrokes, keystroke],
        });
        
        return;
      } else if (correctionMode === 'speed') {
        // Speed mode: space at start does nothing, space in middle/end moves to next word
        if (isAtStart) {
          return; // Do nothing at start of word
        }

        // Mark as skipped if not complete or incorrect
        const wasSkipped = !isWordCorrect || !isWordComplete;
        const completedWord: CompletedWord = {
          text: state.currentInput,
          wasSkipped,
        };
        const newCompletedWords = [...state.completedWords, completedWord];

        const keystroke: KeystrokeEvent = {
          timestamp: performance.now(),
          key: ' ',
          wordIndex: state.currentWordIndex,
          charIndex: state.currentInput.length,
          wasCorrect: isWordCorrect && isWordComplete,
          isBackspace: false,
        };

        set({
          completedWords: newCompletedWords,
          currentWordIndex: state.currentWordIndex + 1,
          currentInput: '',
          keystrokes: [...state.keystrokes, keystroke],
        });

        return;
      } else {
        // Normal mode: space at end moves to next word, space in middle adds space to input
        if (isAtEnd) {
          // At end of word (correct or incorrect), move to next word
          const completedWord: CompletedWord = {
            text: state.currentInput,
            wasSkipped: false,
          };
          const newCompletedWords = [...state.completedWords, completedWord];

          const keystroke: KeystrokeEvent = {
            timestamp: performance.now(),
            key: ' ',
            wordIndex: state.currentWordIndex,
            charIndex: state.currentInput.length,
            wasCorrect: isWordCorrect,
            isBackspace: false,
          };

          set({
            completedWords: newCompletedWords,
            currentWordIndex: state.currentWordIndex + 1,
            currentInput: '',
            keystrokes: [...state.keystrokes, keystroke],
          });

          return;
        } else {
          // At start or middle of word, add space to input
          const newInput = state.currentInput + ' ';
          const expectedChar = currentWord[state.currentInput.length];
          const wasCorrect = ' ' === expectedChar;

          const keystroke: KeystrokeEvent = {
            timestamp: performance.now(),
            key: ' ',
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

          return;
        }
      }
    }

    // Determine if this keystroke is correct
    const expectedChar = currentWord[state.currentInput.length];
    const wasCorrect = key === expectedChar;

    // In Strict mode, block incorrect characters
    if (correctionMode === 'strict' && !wasCorrect) {
      console.log('[TestStore] Strict mode: blocking incorrect character', { key, expectedChar });

      // Increment error count
      const newErrorCount = state.strictModeErrors + 1;

      // Record the failed keystroke (but don't add to input)
      const keystroke: KeystrokeEvent = {
        timestamp: performance.now(),
        key,
        wordIndex: state.currentWordIndex,
        charIndex: state.currentInput.length,
        expectedChar,
        wasCorrect: false,
        isBackspace: false,
      };

      // Block input temporarily
      set({
        strictModeErrors: newErrorCount,
        keystrokes: [...state.keystrokes, keystroke],
        inputBlocked: true,
      });

      // Unblock input after delay
      setTimeout(() => {
        const currentState = get();
        if (currentState.status === 'active') {
          set({ inputBlocked: false });
        }
      }, STRICT_MODE_CONFIG.MISTAKE_DELAY_MS);

      console.log('[TestStore] Strict mode error count:', newErrorCount, 'threshold:', mistakeThreshold);

      // Check if we've reached the mistake threshold (-1 means unlimited)
      if (mistakeThreshold > 0 && newErrorCount >= mistakeThreshold) {
        console.log('[TestStore] Mistake threshold reached, failing test');
        // Fail the test due to too many mistakes
        // Use setTimeout to allow the UI to update first
        setTimeout(() => {
          const currentState = get();
          if (currentState.status === 'active') {
            set({
              status: 'failed',
              endTime: performance.now(),
              failedReason: `You reached the mistake limit of ${mistakeThreshold}. ${mistakeThreshold === 1 ? '1 mistake' : mistakeThreshold + ' mistakes'} allowed.`,
            });
          }
        }, 500);
      }

      return; // Don't add the character to input
    }

    // Normal and Speed modes: allow incorrect input
    const newInput = state.currentInput + key;

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

    // Force strict mode for time trials, otherwise use user's setting
    const correctionMode = state.isTimeTrial ? 'strict' : useSettingsStore.getState().correctionMode;

    // Check correction mode - backspace disabled in Speed and Strict modes
    if (correctionMode === 'speed' || correctionMode === 'strict') {
      // Do nothing if Speed or Strict mode is enabled
      return;
    }

    if (state.status !== 'active') return;

    // If current input is empty and we're at the start of a word, go to previous word
    if (state.currentInput.length === 0) {
      // Can't go back if we're at the first word
      if (state.currentWordIndex === 0) return;

      // Move back to previous word
      const previousWordIndex = state.currentWordIndex - 1;
      const previousCompletedWord = state.completedWords[previousWordIndex];
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
        currentInput: previousCompletedWord?.text || '',
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
    // Tab always marks word as skipped
    const completedWord: CompletedWord = {
      text: state.currentInput,
      wasSkipped: true,
    };
    const newCompletedWords = [...state.completedWords, completedWord];

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

    // Calculate completion time (elapsed time from start to finish)
    const completionTime = (endTime - state.startTime) / 1000; // in seconds

    // Add current input to completed words if there's any
    let finalCompletedWords = [...state.completedWords];
    if (state.currentInput.length > 0) {
      finalCompletedWords.push({
        text: state.currentInput,
        wasSkipped: false,
      });
    }

    // Extract just the text from completed words for calculations
    const typedWordsText = finalCompletedWords.map(cw => cw.text);

    // Normalize typed words to match target length
    const normalizedTypedWords = normalizeTypedWords(
      state.targetWords,
      typedWordsText
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

    // Correction mode label
    const correctionMode = useSettingsStore.getState().correctionMode;
    autoLabels.push(`correction-mode-${correctionMode}`);

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

    // Get iteration number for this content if saving and not a practice test
    let iteration: number | undefined;
    if (shouldSave && !state.isPractice && state.testContentId) {
      const userState = useUserStore.getState();
      const currentUserId = userState.currentUserId;

      if (currentUserId) {
        try {
          const { getNextIterationNumber } = await import('@/lib/db/firebase');
          iteration = await getNextIterationNumber(currentUserId, state.testContentId);
          console.log('[TestStore] Iteration number:', iteration);
        } catch (error) {
          console.error('Failed to get iteration number:', error);
          // Continue without iteration number
        }
      }
    }

    // Create result object
    const result: TestResult = {
      id: state.testId,
      createdAt: new Date(),
      duration: actualDuration,
      testContentId: state.testContentId || '',
      // targetWords no longer saved - fetched from testContents collection instead
      iteration,
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
      isTimeTrial: state.isTimeTrial,
      timeTrialId: state.timeTrialId || undefined,
      completionTime: state.duration === 'content-length' ? completionTime : undefined,
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

      // Check if this is a time trial and update best time
      if (state.isTimeTrial && state.timeTrialId && result.completionTime) {
        console.log('[TestStore] Time trial completed, updating best time:', result.completionTime);
        try {
          const { updateTimeTrialBestTime } = await import('@/lib/db/firebase');
          const { isNewBest, previousBest } = await updateTimeTrialBestTime(
            currentUserId,
            state.timeTrialId,
            result.completionTime,
            result.id
          );
          console.log('[TestStore] Is new best time:', isNewBest, 'Previous best:', previousBest);

          // Store the previous best time in the result for display
          result.previousBestTime = previousBest || undefined;
        } catch (error) {
          console.error('Failed to update time trial best time:', error);
          // Don't throw - test is still saved, just best time update failed
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
      isTimeTrial: false,
      timeTrialId: null,
      status: 'idle',
      startTime: null,
      endTime: null,
      currentWordIndex: 0,
      currentInput: '',
      completedWords: [],
      keystrokes: [],
      strictModeErrors: 0,
      inputBlocked: false,
      failedReason: null,
      result: null,
      // Preserve lastTestConfig so "try again" works
    });
  },

  // Set user labels for the current test
  setUserLabels: (labels: string[]) => {
    set({ userLabels: labels });
  },

  // Retry the last test with the same configuration
  retryLastTest: async () => {
    const state = get();
    if (!state.lastTestConfig) {
      console.warn('No previous test configuration found');
      return null;
    }

    const { duration, testContentId, isPractice, practiceSequences } = state.lastTestConfig;

    // Fetch test content from Firestore
    try {
      const { getTestContent } = await import('@/lib/db/firebase');
      const testContent = await getTestContent(testContentId);

      if (!testContent) {
        console.error('Test content not found:', testContentId);
        throw new Error('Test content not found. Cannot retry this test.');
      }

      // Initialize test with fetched content
      set({
        testId: uuidv4(),
        duration,
        targetWords: testContent.words,
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
        strictModeErrors: 0,
        inputBlocked: false,
        failedReason: null,
        result: null,
        // Keep the same lastTestConfig
        lastTestConfig: state.lastTestConfig,
      });

      return testContent.words;
    } catch (error) {
      console.error('Failed to retry test:', error);
      throw error;
    }
  },
}));
