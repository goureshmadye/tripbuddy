import * as SecureStore from "expo-secure-store";

/**
 * Adapter to use Expo SecureStore as a persistence layer for Firebase Auth.
 * This ensures that auth tokens are stored encrypted on the device.
 */
// The generic type for persistence storage in Firebase expects synchronous-like behavior
// broadly but handles promises. However, for getReactNativePersistence, we need a specific shape.
export const SecureStoreAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    return SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    return SecureStore.deleteItemAsync(key);
  },
};
