import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getFirestore, Firestore, enableIndexedDbPersistence } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';

// TODO: Replace with your Firebase config from Firebase Console
// Project Settings → Your Apps → Web app → Firebase SDK snippet
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || '',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

// Initialize Firebase (singleton pattern)
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;
let persistenceEnabled = false;

export const initializeFirebase = () => {
  // Check if Firebase is already initialized
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }

  // Initialize Firestore
  if (!db) {
    db = getFirestore(app);
  }

  // Initialize Auth
  if (!auth) {
    auth = getAuth(app);
  }

  // Enable offline persistence (uses IndexedDB under the hood)
  // Only try once per session and only in browser environment
  if (typeof window !== 'undefined' && !persistenceEnabled) {
    persistenceEnabled = true; // Mark as attempted to prevent retries
    enableIndexedDbPersistence(db).catch((err) => {
      if (err.code === 'failed-precondition') {
        console.warn('Multiple tabs open, persistence can only be enabled in one tab at a time.');
      } else if (err.code === 'unimplemented') {
        console.warn('Browser does not support offline persistence.');
      } else {
        // This can happen if Firestore was already initialized (e.g., during hot reload or API calls)
        // It's safe to ignore as persistence may already be enabled from a previous initialization
        console.warn('Persistence could not be enabled:', err.code);
      }
    });
  }

  return { app, db, auth };
};

// Export getters for app, db, and auth
export const getFirebaseApp = () => {
  if (!app) {
    initializeFirebase();
  }
  return app;
};

export const getFirebaseDb = () => {
  if (!db) {
    initializeFirebase();
  }
  return db;
};

export const getFirebaseAuth = () => {
  if (!auth) {
    initializeFirebase();
  }
  return auth;
};
