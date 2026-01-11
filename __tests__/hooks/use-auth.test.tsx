import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { act, renderHook } from '@testing-library/react-native';

// Mock Firebase Auth
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
  })),
  onAuthStateChanged: jest.fn(() => jest.fn()), // Return unsubscribe function
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
}));

// Mock Firebase Firestore
jest.mock('firebase/firestore', () => ({
  doc: jest.fn(() => ({
    onSnapshot: jest.fn(),
    setDoc: jest.fn(),
  })),
  onSnapshot: jest.fn(),
  setDoc: jest.fn(),
  collection: jest.fn(() => ({
    doc: jest.fn(() => ({
      get: jest.fn(),
      set: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      onSnapshot: jest.fn(),
    })),
    onSnapshot: jest.fn(),
    add: jest.fn(),
    get: jest.fn(),
    where: jest.fn(),
    orderBy: jest.fn(),
    limit: jest.fn(),
  })),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  Timestamp: {
    now: jest.fn(() => ({ seconds: Date.now() / 1000, nanoseconds: 0 })),
    fromDate: jest.fn(),
  },
}));

// Mock AsyncStorage
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock guest mode
jest.mock('@/services/guest-mode', () => ({
  checkGuestMode: jest.fn(() => Promise.resolve(false)),
  setGuestMode: jest.fn(),
}));

// Mock offline service
jest.mock('@/services/offline', () => ({
  getCachedUser: jest.fn(() => Promise.resolve(null)),
  cacheUserSession: jest.fn(),
  clearCachedSession: jest.fn(),
}));

describe('useAuth Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize with loading state', () => {
    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    expect(result.current.loading).toBe(true);
  });

  it('should handle guest mode correctly', async () => {
    const mockCheckGuestMode = require('@/services/guest-mode').checkGuestMode;
    mockCheckGuestMode.mockResolvedValue(true);

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Wait for initialization
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isGuestMode).toBe(true);
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should handle authenticated user correctly', async () => {
    const mockCheckGuestMode = require('@/services/guest-mode').checkGuestMode;
    const mockOnAuthStateChanged = require('firebase/auth').onAuthStateChanged;
    
    mockCheckGuestMode.mockResolvedValue(false);
    
    // Mock auth state change with authenticated user
    const mockUser = { uid: 'test-user-id', email: 'test@example.com' };
    mockOnAuthStateChanged.mockImplementation((auth: any, callback: any) => {
      callback(mockUser); // Call the callback with the user
      return jest.fn(); // Return unsubscribe function
    });

    const { result } = renderHook(() => useAuth(), {
      wrapper: AuthProvider,
    });

    // Wait for auth state change
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.firebaseUser?.uid).toBe('test-user-id');
  });
});