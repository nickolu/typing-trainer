import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createUserProfile, getUserProfile } from './users';

// Mock Firebase
vi.mock('@/lib/firebase-config', () => ({
  getFirebaseDb: vi.fn(() => ({})),
  getFirebaseAuth: vi.fn(() => ({})),
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  Timestamp: {
    now: vi.fn(() => ({ seconds: Date.now() / 1000 })),
    fromDate: vi.fn((date) => ({ seconds: date.getTime() / 1000 })),
  },
}));

describe('users module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserProfile', () => {
    it('should create a user profile with correct data', async () => {
      const { setDoc } = await import('firebase/firestore');
      
      const userId = 'test-user-123';
      const email = 'test@example.com';
      const displayName = 'Test User';

      const result = await createUserProfile(userId, email, displayName);

      expect(result).toMatchObject({
        id: userId,
        email,
        displayName,
      });
      expect(result.createdAt).toBeInstanceOf(Date);
      expect(setDoc).toHaveBeenCalled();
    });
  });

  describe('getUserProfile', () => {
    it('should return null if user does not exist', async () => {
      const { getDoc } = await import('firebase/firestore');
      vi.mocked(getDoc).mockResolvedValue({
        exists: () => false,
      } as any);

      const result = await getUserProfile('non-existent-user');
      expect(result).toBeNull();
    });

    it('should return user profile if it exists', async () => {
      const { getDoc } = await import('firebase/firestore');
      const mockData = {
        email: 'test@example.com',
        displayName: 'Test User',
        createdAt: { seconds: Date.now() / 1000 },
        wpmScore: 75,
      };

      vi.mocked(getDoc).mockResolvedValue({
        exists: () => true,
        id: 'test-user-123',
        data: () => mockData,
      } as any);

      const result = await getUserProfile('test-user-123');
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-user-123');
      expect(result?.email).toBe('test@example.com');
      expect(result?.wpmScore).toBe(75);
    });
  });
});

