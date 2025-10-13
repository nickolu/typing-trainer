import { db } from './schema';
import { TestResult } from '@/lib/types';

// Save a test result
export async function saveTestResult(result: TestResult): Promise<string> {
  try {
    await db.testResults.add(result);
    return result.id;
  } catch (error) {
    console.error('Failed to save test result:', error);
    throw error;
  }
}

// Get a test result by ID
export async function getTestResult(id: string): Promise<TestResult | undefined> {
  try {
    return await db.testResults.get(id);
  } catch (error) {
    console.error('Failed to get test result:', error);
    throw error;
  }
}

// Get all test results, sorted by date (newest first)
export async function getAllTestResults(): Promise<TestResult[]> {
  try {
    return await db.testResults.orderBy('createdAt').reverse().toArray();
  } catch (error) {
    console.error('Failed to get all test results:', error);
    throw error;
  }
}

// Get test results for a specific user (for future multi-user support)
export async function getTestResultsByUser(userId: string): Promise<TestResult[]> {
  try {
    return await db.testResults
      .where('userId')
      .equals(userId)
      .reverse()
      .sortBy('createdAt');
  } catch (error) {
    console.error('Failed to get test results by user:', error);
    throw error;
  }
}

// Delete a test result
export async function deleteTestResult(id: string): Promise<void> {
  try {
    await db.testResults.delete(id);
  } catch (error) {
    console.error('Failed to delete test result:', error);
    throw error;
  }
}

// Clear all test results
export async function clearAllTestResults(): Promise<void> {
  try {
    await db.testResults.clear();
  } catch (error) {
    console.error('Failed to clear test results:', error);
    throw error;
  }
}

// Export the db instance
export { db };
