import { logSecurityEvent } from '@/services/security';

// Mock dependencies
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc: jest.fn(),
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
}));

jest.mock('@/services/guest-mode', () => ({
  checkGuestMode: jest.fn(),
}));

const mockGetAuth = require('firebase/auth').getAuth;
const mockAddDoc = require('firebase/firestore').addDoc;
const mockCheckGuestMode = require('@/services/guest-mode').checkGuestMode;

describe('Security Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Mock console methods
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('logSecurityEvent', () => {
    it('should not log events for unauthenticated users', async () => {
      mockGetAuth.mockReturnValue({ currentUser: null });

      await logSecurityEvent('test_event', { test: 'data' });

      expect(mockAddDoc).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        'Security Event (not logged - unauthenticated): test_event',
        { test: 'data' }
      );
    });

    it('should not log events for guest users', async () => {
      mockGetAuth.mockReturnValue({
        currentUser: { uid: 'guest-user-id' }
      });
      mockCheckGuestMode.mockResolvedValue(true);

      await logSecurityEvent('test_event', { test: 'data' });

      expect(mockAddDoc).not.toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith(
        'Security Event (not logged - guest mode): test_event',
        { test: 'data' }
      );
    });

    it('should log events for authenticated users', async () => {
      mockGetAuth.mockReturnValue({
        currentUser: { uid: 'auth-user-id' }
      });
      mockCheckGuestMode.mockResolvedValue(false);
      mockAddDoc.mockResolvedValue(undefined);

      await logSecurityEvent('login_success', { userId: 'auth-user-id' });

      expect(mockAddDoc).toHaveBeenCalled();
      expect(console.warn).toHaveBeenCalledWith('Security Event: login_success', { userId: 'auth-user-id' });
    });

    it('should handle Firestore permission errors gracefully', async () => {
      mockGetAuth.mockReturnValue({
        currentUser: { uid: 'auth-user-id' }
      });
      mockCheckGuestMode.mockResolvedValue(false);

      const permissionError = new Error('Permission denied');
      (permissionError as any).code = 'permission-denied';
      mockAddDoc.mockRejectedValue(permissionError);

      await logSecurityEvent('test_event', { test: 'data' });

      expect(console.warn).toHaveBeenCalledWith(
        'Security Event (permissions denied - logged locally only): test_event',
        { test: 'data' }
      );
    });

    it('should re-throw non-permission Firestore errors', async () => {
      mockGetAuth.mockReturnValue({
        currentUser: { uid: 'auth-user-id' }
      });
      mockCheckGuestMode.mockResolvedValue(false);

      const otherError = new Error('Network error');
      (otherError as any).code = 'unavailable';
      mockAddDoc.mockRejectedValue(otherError);

      await expect(logSecurityEvent('test_event', { test: 'data' })).rejects.toThrow('Network error');
    });
  });
});