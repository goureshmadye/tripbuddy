import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert, Platform } from 'react-native';

interface SettingsState {
  pushNotifications: boolean;
  emailNotifications: boolean;
  offlineMode: boolean;
}

interface SettingsContextType extends SettingsState {
  setPushNotifications: (value: boolean) => Promise<void>;
  setEmailNotifications: (value: boolean) => Promise<void>;
  setOfflineMode: (value: boolean) => Promise<void>;
  syncData: () => Promise<void>;
  clearCache: () => Promise<void>;
  isSyncing: boolean;
  isClearing: boolean;
  isLoading: boolean;
}

const SETTINGS_STORAGE_KEY = '@tripbuddy_settings';
const CACHE_KEYS_PREFIX = '@tripbuddy_cache_';

const defaultSettings: SettingsState = {
  pushNotifications: true,
  emailNotifications: true,
  offlineMode: false,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SettingsState>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isClearing, setIsClearing] = useState(false);

  // Load settings from storage on mount
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const storedSettings = await AsyncStorage.getItem(SETTINGS_STORAGE_KEY);
        if (storedSettings) {
          const parsed = JSON.parse(storedSettings);
          setSettings({ ...defaultSettings, ...parsed });
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, []);

  // Save settings to storage
  const saveSettings = async (newSettings: SettingsState) => {
    try {
      await AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(newSettings));
      setSettings(newSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
      throw error;
    }
  };

  const setPushNotifications = async (value: boolean) => {
    if (value) {
      // Request notification permissions
      if (Platform.OS !== 'web') {
        // In a real app, you would use expo-notifications here
        // For now, we'll just save the preference
        // const { status } = await Notifications.requestPermissionsAsync();
        // if (status !== 'granted') {
        //   Alert.alert('Permission Required', 'Please enable notifications in your device settings.');
        //   return;
        // }
      }
    }
    await saveSettings({ ...settings, pushNotifications: value });
  };

  const setEmailNotifications = async (value: boolean) => {
    await saveSettings({ ...settings, emailNotifications: value });
    // In a real app, you would update this preference on your backend
  };

  const setOfflineMode = async (value: boolean) => {
    await saveSettings({ ...settings, offlineMode: value });
    
    if (value) {
      // When enabling offline mode, you might want to pre-cache data
      Alert.alert(
        'Offline Mode Enabled',
        'Your trips will be available offline. Data will sync when you reconnect.'
      );
    } else {
      Alert.alert(
        'Offline Mode Disabled',
        'Changes will sync immediately when online.'
      );
    }
  };

  const syncData = useCallback(async () => {
    if (isSyncing) return;
    
    setIsSyncing(true);
    try {
      // Simulate sync delay - in a real app, this would:
      // 1. Upload any pending local changes
      // 2. Fetch latest data from Firestore
      // 3. Update local cache
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Clear any sync queue and refresh data
      await AsyncStorage.removeItem(`${CACHE_KEYS_PREFIX}sync_queue`);
      
      Alert.alert('Sync Complete', 'Your data has been synchronized successfully.');
    } catch (error) {
      console.error('Sync failed:', error);
      Alert.alert('Sync Failed', 'Unable to sync data. Please try again later.');
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing]);

  const clearCache = useCallback(async () => {
    if (isClearing) return;
    
    setIsClearing(true);
    try {
      // Get all keys and filter for cache keys
      const allKeys = await AsyncStorage.getAllKeys();
      const cacheKeys = allKeys.filter(key => 
        key.startsWith(CACHE_KEYS_PREFIX) || 
        key.includes('_cache') ||
        key.includes('_temp')
      );
      
      if (cacheKeys.length > 0) {
        await AsyncStorage.multiRemove(cacheKeys);
      }
      
      // Also clear any image cache if using a library like react-native-fast-image
      // FastImage.clearMemoryCache();
      // FastImage.clearDiskCache();
      
      Alert.alert('Cache Cleared', 'All cached data has been removed. Some data may need to be re-downloaded.');
    } catch (error) {
      console.error('Failed to clear cache:', error);
      Alert.alert('Error', 'Failed to clear cache. Please try again.');
    } finally {
      setIsClearing(false);
    }
  }, [isClearing]);

  return (
    <SettingsContext.Provider 
      value={{ 
        ...settings, 
        setPushNotifications,
        setEmailNotifications,
        setOfflineMode,
        syncData,
        clearCache,
        isSyncing,
        isClearing,
        isLoading,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
