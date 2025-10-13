import Dexie, { Table } from 'dexie';
import { TestResult } from '@/lib/types';

export class TypingDatabase extends Dexie {
  // Declare tables
  testResults!: Table<TestResult>;

  constructor() {
    super('TypingTrainerDB');

    // Define schema
    this.version(1).stores({
      // Indexed fields: id (primary), createdAt, userId (for future multi-user)
      testResults: 'id, createdAt, userId',
    });
  }
}

// Create singleton instance
export const db = new TypingDatabase();
