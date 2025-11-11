/**
 * User label management
 */

import {
  doc,
  getDoc,
  setDoc,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { USER_LABELS_COLLECTION } from './shared';

/**
 * User labels type
 */
export interface UserLabels {
  userId: string;
  labels: string[]; // Array of user-created labels (max 20)
  updatedAt: Date;
}

/**
 * Get all labels for a user
 */
export async function getUserLabels(userId: string): Promise<string[]> {
  try {
    const db = getFirebaseDb();
    const labelsRef = doc(db, USER_LABELS_COLLECTION, userId);
    const labelsDoc = await getDoc(labelsRef);

    if (!labelsDoc.exists()) {
      return [];
    }

    const data = labelsDoc.data();
    return data.labels || [];
  } catch (error) {
    console.error('Failed to get user labels:', error);
    return [];
  }
}

/**
 * Add a new label for a user (max 20 labels)
 */
export async function addUserLabel(userId: string, label: string): Promise<boolean> {
  try {
    const db = getFirebaseDb();
    const labelsRef = doc(db, USER_LABELS_COLLECTION, userId);
    const labelsDoc = await getDoc(labelsRef);

    let labels: string[] = [];
    if (labelsDoc.exists()) {
      labels = labelsDoc.data().labels || [];
    }

    // Check if label already exists
    if (labels.includes(label)) {
      return false; // Label already exists
    }

    // Check if user has reached the limit
    if (labels.length >= 20) {
      throw new Error('Maximum of 20 labels allowed. Please delete some labels to add new ones.');
    }

    // Add the new label
    labels.push(label);

    await setDoc(labelsRef, {
      userId,
      labels,
      updatedAt: Timestamp.now(),
    });

    return true;
  } catch (error) {
    console.error('Failed to add user label:', error);
    throw error;
  }
}

/**
 * Delete a label for a user
 */
export async function deleteUserLabel(userId: string, label: string): Promise<void> {
  try {
    const db = getFirebaseDb();
    const labelsRef = doc(db, USER_LABELS_COLLECTION, userId);
    const labelsDoc = await getDoc(labelsRef);

    if (!labelsDoc.exists()) {
      return;
    }

    let labels: string[] = labelsDoc.data().labels || [];
    labels = labels.filter(l => l !== label);

    await setDoc(labelsRef, {
      userId,
      labels,
      updatedAt: Timestamp.now(),
    });
  } catch (error) {
    console.error('Failed to delete user label:', error);
    throw error;
  }
}
