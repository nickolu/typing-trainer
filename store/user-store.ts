import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User
} from 'firebase/auth';
import { getFirebaseAuth } from '@/lib/firebase-config';
import { createUserProfile, getUserProfile } from '@/lib/db/firebase';

interface UserState {
  // Current user
  currentUserId: string | null;
  email: string | null;
  displayName: string | null;
  isAuthenticated: boolean;

  // WPM Score
  wpmScore: number | null;
  wpmLastUpdated: Date | null;
  wpmScoreResetDate: Date | null;

  // Migration flags
  timeTrialContentMigrated: boolean;
  hasSeenTimeTrialResetNotice: boolean;

  // Loading states
  isLoading: boolean;
  error: string | null;

  // Actions
  signup: (email: string, password: string, displayName: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  refreshUserProfile: () => Promise<void>;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      // Initial state
      currentUserId: null,
      email: null,
      displayName: null,
      isAuthenticated: false,
      wpmScore: null,
      wpmLastUpdated: null,
      wpmScoreResetDate: null,
      timeTrialContentMigrated: false,
      hasSeenTimeTrialResetNotice: false,
      isLoading: false,
      error: null,

      /**
       * Sign up with email and password
       */
      signup: async (email: string, password: string, displayName: string) => {
        set({ isLoading: true, error: null });

        try {
          // Validate inputs
          if (!email || !password || !displayName) {
            set({ error: 'All fields are required', isLoading: false });
            return false;
          }

          if (password.length < 6) {
            set({ error: 'Password must be at least 6 characters', isLoading: false });
            return false;
          }

          const auth = getFirebaseAuth();

          // Create Firebase Auth user
          const userCredential = await createUserWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // Create user profile in Firestore
          await createUserProfile(user.uid, email, displayName);

          set({
            currentUserId: user.uid,
            email: user.email,
            displayName,
            isAuthenticated: true,
            wpmScore: null,
            wpmLastUpdated: null,
            wpmScoreResetDate: null,
            timeTrialContentMigrated: false,
            hasSeenTimeTrialResetNotice: false,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error: any) {
          console.error('Signup failed:', error);

          let errorMessage = 'Failed to sign up. Please try again.';
          if (error.code === 'auth/email-already-in-use') {
            errorMessage = 'This email is already in use.';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
          } else if (error.code === 'auth/weak-password') {
            errorMessage = 'Password is too weak.';
          }

          set({ error: errorMessage, isLoading: false });
          return false;
        }
      },

      /**
       * Login with email and password
       */
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });

        try {
          // Validate inputs
          if (!email || !password) {
            set({ error: 'Email and password are required', isLoading: false });
            return false;
          }

          const auth = getFirebaseAuth();

          // Sign in with Firebase Auth
          const userCredential = await signInWithEmailAndPassword(auth, email, password);
          const user = userCredential.user;

          // Get user profile from Firestore
          const profile = await getUserProfile(user.uid);

          set({
            currentUserId: user.uid,
            email: user.email,
            displayName: profile?.displayName || null,
            wpmScore: profile?.wpmScore ?? null,
            wpmLastUpdated: profile?.wpmLastUpdated ?? null,
            wpmScoreResetDate: profile?.wpmScoreResetDate ?? null,
            timeTrialContentMigrated: profile?.timeTrialContentMigrated ?? false,
            hasSeenTimeTrialResetNotice: profile?.hasSeenTimeTrialResetNotice ?? false,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });

          return true;
        } catch (error: any) {
          console.error('Login failed:', error);

          let errorMessage = 'Failed to log in. Please try again.';
          if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password') {
            errorMessage = 'Invalid email or password.';
          } else if (error.code === 'auth/invalid-email') {
            errorMessage = 'Invalid email address.';
          } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Too many failed attempts. Please try again later.';
          }

          set({ error: errorMessage, isLoading: false });
          return false;
        }
      },

      /**
       * Logout current user
       */
      logout: async () => {
        try {
          const auth = getFirebaseAuth();
          await signOut(auth);

          set({
            currentUserId: null,
            email: null,
            displayName: null,
            isAuthenticated: false,
            wpmScore: null,
            wpmLastUpdated: null,
            wpmScoreResetDate: null,
            timeTrialContentMigrated: false,
            hasSeenTimeTrialResetNotice: false,
            error: null,
          });
        } catch (error) {
          console.error('Logout failed:', error);
          set({ error: 'Failed to log out' });
        }
      },

      /**
       * Check authentication state using Firebase Auth listener
       */
      checkAuth: async () => {
        return new Promise((resolve) => {
          const auth = getFirebaseAuth();

          // Listen for auth state changes
          const unsubscribe = onAuthStateChanged(auth, async (user: User | null) => {
            if (user) {
              // User is signed in
              try {
                const profile = await getUserProfile(user.uid);

                set({
                  currentUserId: user.uid,
                  email: user.email,
                  displayName: profile?.displayName || null,
                  wpmScore: profile?.wpmScore ?? null,
                  wpmLastUpdated: profile?.wpmLastUpdated ?? null,
                  wpmScoreResetDate: profile?.wpmScoreResetDate ?? null,
                  timeTrialContentMigrated: profile?.timeTrialContentMigrated ?? false,
                  hasSeenTimeTrialResetNotice: profile?.hasSeenTimeTrialResetNotice ?? false,
                  isAuthenticated: true,
                  isLoading: false,
                });
              } catch (error) {
                console.error('Failed to load user profile:', error);
                set({
                  currentUserId: user.uid,
                  email: user.email,
                  displayName: null,
                  wpmScore: null,
                  wpmLastUpdated: null,
                  wpmScoreResetDate: null,
                  timeTrialContentMigrated: false,
                  hasSeenTimeTrialResetNotice: false,
                  isAuthenticated: true,
                  isLoading: false,
                });
              }
            } else {
              // User is signed out
              set({
                currentUserId: null,
                email: null,
                displayName: null,
                wpmScore: null,
                wpmLastUpdated: null,
                wpmScoreResetDate: null,
                timeTrialContentMigrated: false,
                hasSeenTimeTrialResetNotice: false,
                isAuthenticated: false,
                isLoading: false,
              });
            }

            resolve();
          });

          // Note: In a real app, you'd want to store and call unsubscribe on cleanup
          // For this use case, the listener will remain active throughout the app lifecycle
        });
      },

      /**
       * Refresh user profile from Firestore
       * Used to update WPM score after benchmark tests
       */
      refreshUserProfile: async () => {
        const userId = get().currentUserId;
        if (!userId) return;

        try {
          const profile = await getUserProfile(userId);
          if (profile) {
            set({
              displayName: profile.displayName,
              wpmScore: profile.wpmScore ?? null,
              wpmLastUpdated: profile.wpmLastUpdated ?? null,
              wpmScoreResetDate: profile.wpmScoreResetDate ?? null,
              timeTrialContentMigrated: profile.timeTrialContentMigrated ?? false,
              hasSeenTimeTrialResetNotice: profile.hasSeenTimeTrialResetNotice ?? false,
            });
          }
        } catch (error) {
          console.error('Failed to refresh user profile:', error);
        }
      },

      /**
       * Clear error message
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'typing-trainer-user',
      // Only persist minimal user data - auth state will be checked via Firebase Auth
      partialize: (state) => ({
        currentUserId: state.currentUserId,
        email: state.email,
        displayName: state.displayName,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
