import { useTrips } from '@/hooks/use-trips';
import { renderHook } from '@testing-library/react-native';
import { act } from 'react-test-renderer';

// Mock dependencies
jest.mock('@/services/offline', () => ({
  getCachedTrips: jest.fn(),
  cacheTripsData: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()), // Return a mock unsubscribe function
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
}));

jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

const mockUseAuth = require('@/hooks/use-auth').useAuth;
const mockGetCachedTrips = require('@/services/offline').getCachedTrips;
const mockOnSnapshot = require('firebase/firestore').onSnapshot;

describe('useTrips Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return empty trips for guest users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });
    mockGetCachedTrips.mockResolvedValue(null);

    const { result } = renderHook(() => useTrips());

    expect(result.current.trips).toEqual([]);
    expect(result.current.loading).toBe(false);
  });

  it('should load cached trips for authenticated users', async () => {
    const mockUser = { id: 'user-1', name: 'Test User' };
    const mockTrips = [
      { id: 'trip-1', title: 'Test Trip', creatorId: 'user-1' }
    ];

    mockUseAuth.mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
    });
    mockGetCachedTrips.mockResolvedValue(mockTrips);

    // Mock onSnapshot to not trigger any updates
    mockOnSnapshot.mockReturnValue(jest.fn());

    const { result } = renderHook(() => useTrips());

    // Wait for async operations
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Should initially show cached trips
    expect(result.current.trips).toEqual(mockTrips);
    expect(result.current.loading).toBe(true); // Loading Firestore data
  });

  it('should handle authentication state changes', async () => {
    // Start as guest
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });

    const { result, rerender } = renderHook(() => useTrips());

    expect(result.current.trips).toEqual([]);

    // Change to authenticated
    mockUseAuth.mockReturnValue({
      user: { id: 'user-1', name: 'Test User' },
      isAuthenticated: true,
    });
    mockGetCachedTrips.mockResolvedValue([]);

    // Mock onSnapshot to not trigger any updates
    mockOnSnapshot.mockReturnValue(jest.fn());

    await act(async () => {
      rerender();
    });

    // Should now attempt to load data (though mocked)
    expect(mockGetCachedTrips).toHaveBeenCalled();
    await act(async () => {
      rerender();
    });

    // Should now attempt to load data (though mocked)
    expect(mockGetCachedTrips).toHaveBeenCalled();
  });
});