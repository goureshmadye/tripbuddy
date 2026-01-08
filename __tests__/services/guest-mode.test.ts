import { checkGuestMode, clearGuestMode, setGuestMode } from '@/services/guest-mode';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>;

describe('Guest Mode Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkGuestMode', () => {
    it('should return true when guest mode is enabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue('true');

      const result = await checkGuestMode();

      expect(result).toBe(true);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@tripbuddy/guest_mode');
    });

    it('should return false when guest mode is disabled', async () => {
      mockAsyncStorage.getItem.mockResolvedValue(null);

      const result = await checkGuestMode();

      expect(result).toBe(false);
      expect(mockAsyncStorage.getItem).toHaveBeenCalledWith('@tripbuddy/guest_mode');
    });

    it('should return false when AsyncStorage throws an error', async () => {
      mockAsyncStorage.getItem.mockRejectedValue(new Error('Storage error'));

      const result = await checkGuestMode();

      expect(result).toBe(false);
    });
  });

  describe('setGuestMode', () => {
    it('should set guest mode to true', async () => {
      await setGuestMode(true);

      expect(mockAsyncStorage.setItem).toHaveBeenCalledWith('@tripbuddy/guest_mode', 'true');
    });

    it('should set guest mode to false', async () => {
      await setGuestMode(false);

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@tripbuddy/guest_mode');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.setItem.mockRejectedValue(new Error('Storage error'));

      await expect(setGuestMode(true)).resolves.not.toThrow();
    });
  });

  describe('clearGuestMode', () => {
    it('should clear guest mode', async () => {
      await clearGuestMode();

      expect(mockAsyncStorage.removeItem).toHaveBeenCalledWith('@tripbuddy/guest_mode');
    });

    it('should handle AsyncStorage errors gracefully', async () => {
      mockAsyncStorage.removeItem.mockRejectedValue(new Error('Storage error'));

      await expect(clearGuestMode()).resolves.not.toThrow();
    });
  });
});