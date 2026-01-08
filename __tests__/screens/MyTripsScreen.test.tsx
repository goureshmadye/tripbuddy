import MyTripsScreen from '@/app/(tabs)/index';
import { render } from '@testing-library/react-native';
import React from 'react';

// Mock dependencies
jest.mock('@/hooks/use-auth', () => ({
  useAuth: jest.fn(),
}));

jest.mock('@/hooks/use-trips', () => ({
  useTrips: jest.fn(),
}));

jest.mock('@/hooks/use-color-scheme', () => ({
  useColorScheme: jest.fn(() => 'light'),
}));

jest.mock('@/services/firestore', () => ({
  acceptInvitation: jest.fn(),
  getInvitationByCode: jest.fn(),
}));

jest.mock('expo-router', () => ({
  useRouter: jest.fn(() => ({ push: jest.fn() })),
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: jest.fn(() => ({ top: 0, bottom: 0, left: 0, right: 0 })),
}));

const mockUseAuth = require('@/hooks/use-auth').useAuth;
const mockUseTrips = require('@/hooks/use-trips').useTrips;

describe('MyTripsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state correctly', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: true,
      isGuestMode: false,
    });

    mockUseTrips.mockReturnValue({
      trips: [],
      loading: true,
      error: null,
      refresh: jest.fn(),
    });

    const { toJSON } = render(<MyTripsScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders empty state for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User' },
      isAuthenticated: true,
      loading: false,
      isGuestMode: false,
    });

    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { toJSON } = render(<MyTripsScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders trips list for authenticated user', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User' },
      isAuthenticated: true,
      loading: false,
      isGuestMode: false,
    });

    mockUseTrips.mockReturnValue({
      trips: [
        {
          id: '1',
          title: 'Test Trip',
          description: 'A test trip',
          startDate: '2024-01-01',
          endDate: '2024-01-05',
          createdBy: '1',
          collaborators: [],
        },
      ],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { toJSON } = render(<MyTripsScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders guest mode state', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
      loading: false,
      isGuestMode: true,
    });

    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { toJSON } = render(<MyTripsScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders error state', () => {
    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User' },
      isAuthenticated: true,
      loading: false,
      isGuestMode: false,
    });

    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: 'Failed to load trips',
      refresh: jest.fn(),
    });

    const { toJSON } = render(<MyTripsScreen />);
    expect(toJSON()).toMatchSnapshot();
  });

  it('renders with dark theme', () => {
    const mockUseColorScheme = require('@/hooks/use-color-scheme').useColorScheme;
    mockUseColorScheme.mockReturnValue('dark');

    mockUseAuth.mockReturnValue({
      user: { id: '1', name: 'Test User' },
      isAuthenticated: true,
      loading: false,
      isGuestMode: false,
    });

    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { toJSON } = render(<MyTripsScreen />);
    expect(toJSON()).toMatchSnapshot();
  });
});
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should show guest greeting for unauthenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });
    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<MyTripsScreen />);

    expect(getByText('Welcome,')).toBeTruthy();
    expect(getByText('Guest! 👋')).toBeTruthy();
  });

  it('should show personalized greeting for authenticated users', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'John Doe' },
      isAuthenticated: true,
    });
    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<MyTripsScreen />);

    expect(getByText('Welcome back,')).toBeTruthy();
    expect(getByText('John Doe! 👋')).toBeTruthy();
  });

  it('should show empty state for guest users', () => {
    mockUseAuth.mockReturnValue({
      user: null,
      isAuthenticated: false,
    });
    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<MyTripsScreen />);

    expect(getByText('Sign in to access your trips')).toBeTruthy();
    expect(getByText('Sign In')).toBeTruthy();
  });

  it('should show create trip prompt for authenticated users with no trips', () => {
    mockUseAuth.mockReturnValue({
      user: { name: 'John Doe' },
      isAuthenticated: true,
    });
    mockUseTrips.mockReturnValue({
      trips: [],
      loading: false,
      error: null,
      refresh: jest.fn(),
    });

    const { getByText } = render(<MyTripsScreen />);

    expect(getByText('Ready to plan your first adventure?')).toBeTruthy();
    expect(getByText('Create Trip')).toBeTruthy();
  });
});