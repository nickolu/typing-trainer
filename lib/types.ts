// Keystroke event tracking
export interface KeystrokeEvent {
  timestamp: number; // performance.now()
  key: string; // Character typed
  wordIndex: number; // Which word
  charIndex: number; // Position in word
  expectedChar?: string; // What character should have been typed
  wasCorrect: boolean; // Was this keystroke correct
  isBackspace: boolean; // Was this a correction
}

// Test result status
export type TestResultStatus = 'COMPLETE' | 'DELETED';

// Test result stored in IndexedDB
export interface TestResult {
  id: string; // UUID
  userId?: string; // Future: for multi-user
  createdAt: Date;
  duration: number; // Test duration in seconds (30)
  status?: TestResultStatus; // Status of the test (defaults to COMPLETE if not set)

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

  // Practice metadata
  isPractice?: boolean; // Is this a targeted practice session
  practiceSequences?: string[]; // Character sequences and/or full words being practiced

  // Mistake data
  mistakeCount?: number; // Total incorrect keystrokes
  correctionCount?: number; // Total backspaces used
  characterSubstitutions?: Record<string, string[]>; // Map of expected → actual chars

  // Labels
  labels?: string[]; // User-selected and auto-generated labels for filtering
}

// Static test content
export interface TestContent {
  id: string;
  category: 'quote' | 'prose' | 'technical' | 'common';
  title: string; // Display name for the test content
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
  duration: number | 'content-length'; // seconds or 'content-length' mode
  testContentId: string;
  testContentTitle?: string; // Title of the test content
  testContentCategory?: string; // Category of the test content
  isPractice?: boolean; // Is this a targeted practice session
  practiceSequences?: string[]; // Character sequences and/or full words being practiced
  userLabels?: string[]; // User-selected labels for this test
}

// Stored test configuration for "try again"
export interface StoredTestConfig {
  duration: number | 'content-length';
  testContentId: string;
  targetWords: string[];
  isPractice: boolean;
  practiceSequences: string[];
}

// In-memory test state (used by Zustand)
export interface TestState {
  // Config
  testId: string | null;
  duration: number | 'content-length';
  targetWords: string[];
  testContentId: string | null;
  testContentTitle: string | null; // Title of the current test content
  testContentCategory: string | null; // Category of the current test content
  isPractice: boolean; // Is this a targeted practice session
  practiceSequences: string[]; // Character sequences and/or full words being practiced
  userLabels: string[]; // User-selected labels for this test

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

  // Strict mode mistake tracking
  strictModeErrors: number;

  // Computed result (set when test completes)
  result: TestResult | null;

  // Store last test configuration for "try again" functionality
  lastTestConfig: StoredTestConfig | null;

  // Actions
  initializeTest: (config: TestConfig, words: string[]) => void;
  startTest: () => void;
  handleKeyPress: (key: string) => void;
  handleBackspace: () => void;
  handleTab: () => void;
  completeTest: (shouldSave?: boolean) => Promise<TestResult | null>;
  resetTest: () => void;
  retryLastTest: () => void;
  setUserLabels: (labels: string[]) => void;
}
