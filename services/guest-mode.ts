import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================
// Guest Mode Utilities
// ============================================

export const GUEST_MODE_KEY = "@tripbuddy/guest_mode";

export const setGuestMode = async (enabled: boolean): Promise<void> => {
  try {
    if (enabled) {
      await AsyncStorage.setItem(GUEST_MODE_KEY, "true");
    } else {
      await AsyncStorage.removeItem(GUEST_MODE_KEY);
    }
  } catch (error) {
    console.error('Failed to set guest mode:', error);
  }
};

export const checkGuestMode = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return value === "true";
  } catch {
    return false;
  }
};

export const clearGuestMode = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
  } catch (error) {
    console.error('Failed to clear guest mode:', error);
  }
};