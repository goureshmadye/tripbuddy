import '@testing-library/jest-native/extend-expect';

// Mock Firebase
const mockFirestore = {
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
    where: jest.fn(() => mockFirestore.collection()),
    orderBy: jest.fn(() => mockFirestore.collection()),
    limit: jest.fn(() => mockFirestore.collection()),
  })),
  doc: jest.fn(() => ({
    get: jest.fn(),
    set: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    onSnapshot: jest.fn(),
  })),
  getDoc: jest.fn(),
  onSnapshot: jest.fn(),
  query: jest.fn(() => mockFirestore.collection()),
  where: jest.fn(() => mockFirestore.collection()),
  orderBy: jest.fn(() => mockFirestore.collection()),
  limit: jest.fn(() => mockFirestore.collection()),
  addDoc: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  setDoc: jest.fn(),
};

const mockAuth = {
  currentUser: null,
  onAuthStateChanged: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  getAuth: jest.fn(() => mockAuth),
};

jest.mock('@/config/firebase', () => ({
  firestore: mockFirestore,
  auth: mockAuth,
}));

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  multiRemove: jest.fn(),
  multiSet: jest.fn(),
  multiGet: jest.fn(),
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useSegments: () => [],
  Link: 'Link',
}));

// Mock Expo modules
jest.mock('expo-constants', () => ({
  default: {
    manifest: {},
  },
}));

jest.mock('expo-linking', () => ({
  createURL: jest.fn(),
}));

jest.mock('expo-file-system/legacy', () => ({
  documentDirectory: 'file:///test/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(),
  deleteAsync: jest.fn(),
  getInfoAsync: jest.fn(),
}));

// Mock React Native Safe Area Context
jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => children,
  SafeAreaView: ({ children }) => children,
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

// Mock NetInfo
jest.mock('@react-native-community/netinfo', () => ({
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  fetch: jest.fn(() => Promise.resolve({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
  useNetInfo: jest.fn(() => ({
    isConnected: true,
    type: 'wifi',
    isInternetReachable: true,
  })),
}));

// Mock other native modules
jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

// Global test setup
beforeEach(() => {
  jest.clearAllMocks();
});