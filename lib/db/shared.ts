/**
 * Shared utilities and constants for Firebase database operations
 */

// Collection names
export const USERS_COLLECTION = 'users';
export const TEST_RESULTS_COLLECTION = 'testResults';
export const TEST_CONTENTS_COLLECTION = 'testContents';
export const USER_LABELS_COLLECTION = 'userLabels';
export const TIME_TRIAL_BEST_TIMES_COLLECTION = 'timeTrialBestTimes';

/**
 * Helper function to safely convert Firestore Timestamp to Date
 * Handles different formats: Timestamp object, plain object with seconds/nanoseconds, Date, or string
 */
export function convertTimestampToDate(timestamp: any): Date {
  if (!timestamp) {
    return new Date();
  }

  // Already a Date object
  if (timestamp instanceof Date) {
    return timestamp;
  }

  // Firestore Timestamp object with toDate() method
  if (timestamp.toDate && typeof timestamp.toDate === 'function') {
    return timestamp.toDate();
  }

  // Plain object with seconds (Firestore Timestamp serialized)
  if (timestamp.seconds !== undefined) {
    return new Date(timestamp.seconds * 1000);
  }

  // String timestamp
  if (typeof timestamp === 'string') {
    return new Date(timestamp);
  }

  // Number timestamp (milliseconds)
  if (typeof timestamp === 'number') {
    return new Date(timestamp);
  }

  // Fallback
  console.warn('Unknown timestamp format:', timestamp);
  return new Date();
}

/**
 * Generate a hash from text content for deduplication
 * Simple hash function for content comparison
 */
export function generateContentHash(text: string): string {
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(36);
}

/**
 * Helper function to recursively remove undefined values from an object
 * Firestore doesn't accept undefined values, even in nested objects/arrays
 */
export function removeUndefinedFields(obj: any): any {
  if (obj === null || obj === undefined) {
    return null;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map(item => removeUndefinedFields(item));
  }

  // Handle objects (including Date, Timestamp, etc.)
  if (typeof obj === 'object') {
    // Don't process Date or Timestamp objects
    if (obj instanceof Date || obj.constructor?.name === 'Timestamp') {
      return obj;
    }

    const cleaned: any = {};
    for (const key in obj) {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = removeUndefinedFields(value);
      }
    }
    return cleaned;
  }

  // Return primitives as-is
  return obj;
}
