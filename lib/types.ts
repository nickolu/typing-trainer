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

// Stored test content (in Firestore testContents collection)
export interface StoredTestContent {
  id: string; // UUID
  userId: string; // Owner of this content
  text: string; // Original text
  words: string[]; // Parsed words array
  createdAt: Date;
  sourceId?: string; // Optional reference to static test ID (e.g., 'quote-001')
  contentHash: string; // Hash of text for deduplication
}

// Test result stored in IndexedDB
export interface TestResult {
  id: string; // UUID
  userId?: string; // Future: for multi-user
  createdAt: Date;
  duration: number; // Test duration in seconds (30)
  status?: TestResultStatus; // Status of the test (defaults to COMPLETE if not set)

  // Content
  testContentId: string; // Reference to testContents collection
  targetWords?: string[]; // DEPRECATED: Words to type (kept for backward compatibility, no longer saved in new tests)
  iteration?: number; // Which iteration/attempt this is for this content (1-based)

  // Typing data
  typedWords: string[]; // What user actually typed

  // Calculated stats
  wpm: number; // Words per minute
  accuracy: number; // Per-word accuracy: 0-100%
  perCharacterAccuracy?: number; // Per-character accuracy: 0-100% (null for historical data)
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

  // Time trial metadata
  isTimeTrial?: boolean; // Is this a time trial test
  timeTrialId?: string; // ID of the time trial
  completionTime?: number; // Actual completion time in seconds (for content-length tests)
  previousBestTime?: number; // Previous best time before this attempt (for comparison)
}

// Static test content
export interface TestContent {
  id: string;
  category: 'quote' | 'prose' | 'technical' | 'common' | 'time-trial';
  title: string; // Display name for the test content
  text: string;
  source?: string; // Attribution
}

// Test status
export type TestStatus = 'idle' | 'active' | 'complete' | 'failed';

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
  isTimeTrial?: boolean; // Is this a time trial test
  timeTrialId?: string; // ID of the time trial (e.g., 'time-trial-001')
}

// Stored test configuration for "try again"
export interface StoredTestConfig {
  duration: number | 'content-length';
  testContentId: string;
  // targetWords removed - fetched from testContents collection instead
  isPractice: boolean;
  practiceSequences: string[];
  testContentTitle: string | null;
  testContentCategory: string | null;
  isTimeTrial: boolean;
  timeTrialId: string | null;
}

// Completed word metadata
export interface CompletedWord {
  text: string; // What the user typed
  wasSkipped: boolean; // True if skipped in speed mode
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
  isTimeTrial: boolean; // Is this a time trial test
  timeTrialId: string | null; // ID of the time trial (e.g., 'time-trial-001')

  // Runtime state
  status: TestStatus;
  startTime: number | null; // performance.now()
  endTime: number | null;
  currentWordIndex: number;

  // User input
  currentInput: string; // Current word being typed
  completedWords: CompletedWord[]; // Finalized words with metadata

  // Keystroke tracking
  keystrokes: KeystrokeEvent[];

  // Strict mode mistake tracking
  strictModeErrors: number;
  inputBlocked: boolean; // Temporarily blocks input after a mistake in strict mode

  // Failure tracking
  failedReason: string | null; // Reason for test failure (e.g., "Too many mistakes")

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
  retryLastTest: () => Promise<string[] | null>;
  setUserLabels: (labels: string[]) => void;
}
