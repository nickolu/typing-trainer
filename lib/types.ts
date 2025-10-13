// Keystroke event tracking
export interface KeystrokeEvent {
  timestamp: number; // performance.now()
  key: string; // Character typed
  wordIndex: number; // Which word
  charIndex: number; // Position in word
}

// Test result stored in IndexedDB
export interface TestResult {
  id: string; // UUID
  userId?: string; // Future: for multi-user
  createdAt: Date;
  duration: number; // Test duration in seconds (30)

  // Content
  testContentId: string; // Reference to static test
  targetWords: string[]; // Words to type

  // Typing data
  typedWords: string[]; // What user actually typed

  // Calculated stats
  wpm: number; // Words per minute
  accuracy: number; // 0-100%
  correctWordCount: number;
  incorrectWordCount: number;
  totalWords: number;
  totalTypedWords: number; // Total words actually typed

  // Keystroke timing (for future features)
  keystrokeTimings: KeystrokeEvent[]; // Raw data for analysis
}

// Static test content
export interface TestContent {
  id: string;
  category: 'quote' | 'prose' | 'technical' | 'common';
  text: string;
  source?: string; // Attribution
}

// Test status
export type TestStatus = 'idle' | 'active' | 'complete';

// Word state for display
export type WordState =
  | 'pending'
  | 'current'
  | 'completed-correct'
  | 'completed-incorrect';

// Character comparison result
export interface CharacterMatch {
  char: string;
  isCorrect: boolean;
  isTyped: boolean;
}

// Test configuration
export interface TestConfig {
  duration: number; // seconds
  testContentId: string;
}

// In-memory test state (used by Zustand)
export interface TestState {
  // Config
  testId: string | null;
  duration: number;
  targetWords: string[];
  testContentId: string | null;

  // Runtime state
  status: TestStatus;
  startTime: number | null; // performance.now()
  endTime: number | null;
  currentWordIndex: number;

  // User input
  currentInput: string; // Current word being typed
  completedWords: string[]; // Finalized words

  // Keystroke tracking
  keystrokes: KeystrokeEvent[];

  // Computed result (set when test completes)
  result: TestResult | null;

  // Actions
  initializeTest: (config: TestConfig, words: string[]) => void;
  startTest: () => void;
  handleKeyPress: (key: string) => void;
  handleBackspace: () => void;
  handleTab: () => void;
  completeTest: () => Promise<TestResult>;
  resetTest: () => void;
}
