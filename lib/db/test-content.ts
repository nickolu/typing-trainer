/**
 * Test content CRUD operations
 */

import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  where,
  orderBy,
  Timestamp,
} from 'firebase/firestore';
import { getFirebaseDb } from '@/lib/firebase-config';
import { StoredTestContent } from '@/lib/types';
import {
  TEST_CONTENTS_COLLECTION,
  convertTimestampToDate,
  generateContentHash,
} from './shared';

/**
 * Save test content to Firestore
 */
export async function saveTestContent(
  content: Omit<StoredTestContent, 'id' | 'createdAt' | 'contentHash'> & { id: string },
  userId: string
): Promise<string> {
  try {
    const { getFirebaseAuth } = await import('@/lib/firebase-config');
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser || currentUser.uid !== userId) {
      throw new Error('Not authenticated - please log in again');
    }

    const db = getFirebaseDb();
    const contentRef = doc(db, TEST_CONTENTS_COLLECTION, content.id);

    const contentHash = generateContentHash(content.text);

    const firestoreData = {
      id: content.id,
      userId,
      text: content.text,
      words: content.words,
      sourceId: content.sourceId || null,
      contentHash,
      createdAt: Timestamp.now(),
    };

    await setDoc(contentRef, firestoreData);

    console.log('[Firebase] Successfully saved test content:', content.id);
    return content.id;
  } catch (error) {
    console.error('[Firebase] Failed to save test content:', error);
    throw error;
  }
}

/**
 * Get test content by ID
 */
export async function getTestContent(id: string): Promise<StoredTestContent | null> {
  try {
    const db = getFirebaseDb();
    const contentRef = doc(db, TEST_CONTENTS_COLLECTION, id);
    const contentDoc = await getDoc(contentRef);

    if (!contentDoc.exists()) {
      return null;
    }

    const data = contentDoc.data();
    return {
      id: data.id,
      userId: data.userId,
      text: data.text,
      words: data.words,
      sourceId: data.sourceId || undefined,
      contentHash: data.contentHash,
      createdAt: convertTimestampToDate(data.createdAt),
    };
  } catch (error) {
    console.error('[Firebase] Failed to get test content:', error);
    return null;
  }
}

/**
 * Find existing test content by sourceId and userId
 * Used to avoid duplicating static test content
 */
export async function findTestContentBySource(
  userId: string,
  sourceId: string
): Promise<StoredTestContent | null> {
  try {
    const db = getFirebaseDb();
    const contentsRef = collection(db, TEST_CONTENTS_COLLECTION);

    const q = query(
      contentsRef,
      where('userId', '==', userId),
      where('sourceId', '==', sourceId),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Return the most recent one
    const data = snapshot.docs[0].data();
    return {
      id: data.id,
      userId: data.userId,
      text: data.text,
      words: data.words,
      sourceId: data.sourceId || undefined,
      contentHash: data.contentHash,
      createdAt: convertTimestampToDate(data.createdAt),
    };
  } catch (error) {
    console.error('[Firebase] Failed to find test content by source:', error);
    return null;
  }
}

/**
 * Find existing test content by contentHash and userId
 * Used to detect duplicate AI-generated content and maintain trial history
 */
export async function findTestContentByHash(
  userId: string,
  contentHash: string
): Promise<StoredTestContent | null> {
  try {
    const db = getFirebaseDb();
    const contentsRef = collection(db, TEST_CONTENTS_COLLECTION);

    const q = query(
      contentsRef,
      where('userId', '==', userId),
      where('contentHash', '==', contentHash),
      orderBy('createdAt', 'desc')
    );

    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      return null;
    }

    // Return the most recent one
    const data = snapshot.docs[0].data();
    return {
      id: data.id,
      userId: data.userId,
      text: data.text,
      words: data.words,
      sourceId: data.sourceId || undefined,
      contentHash: data.contentHash,
      createdAt: convertTimestampToDate(data.createdAt),
    };
  } catch (error) {
    console.error('[Firebase] Failed to find test content by hash:', error);
    return null;
  }
}
