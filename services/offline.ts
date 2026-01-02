/**
 * Offline Mode Service
 * Handles caching of user data, documents, and map regions for offline access
 */

import { User } from '@/types/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';
import * as FileSystem from 'expo-file-system/legacy';

// Storage Keys
const STORAGE_KEYS = {
  CACHED_USER: '@tripbuddy/cached_user',
  CACHED_SESSION: '@tripbuddy/cached_session',
  CACHED_TRIPS: '@tripbuddy/cached_trips',
  CACHED_DOCUMENTS: '@tripbuddy/cached_documents',
  OFFLINE_MAP_REGIONS: '@tripbuddy/offline_map_regions',
  LAST_SYNC: '@tripbuddy/last_sync',
  OFFLINE_QUEUE: '@tripbuddy/offline_queue',
};

// Directory for cached files
const CACHE_DIRECTORY = `${FileSystem.documentDirectory}tripbuddy_cache/`;
const DOCUMENTS_CACHE_DIR = `${CACHE_DIRECTORY}documents/`;
const MAPS_CACHE_DIR = `${CACHE_DIRECTORY}maps/`;

// Types
export interface CachedSession {
  userId: string;
  email: string;
  name: string;
  profilePhoto?: string | null;
  cachedAt: number;
  expiresAt: number;
}

export interface CachedDocument {
  id: string;
  tripId: string;
  fileName: string;
  localPath: string;
  originalUrl: string;
  type: string;
  cachedAt: number;
  fileSize: number;
}

export interface OfflineMapRegion {
  id: string;
  tripId: string;
  name: string;
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
  zoomLevel: number;
  cachedAt: number;
  tileCount: number;
  sizeInMB: number;
}

export interface OfflineQueueItem {
  id: string;
  type: 'create' | 'update' | 'delete';
  collection: string;
  data: any;
  timestamp: number;
}

// Initialize cache directories
export const initializeOfflineStorage = async (): Promise<void> => {
  try {
    const dirs = [CACHE_DIRECTORY, DOCUMENTS_CACHE_DIR, MAPS_CACHE_DIR];
    for (const dir of dirs) {
      const dirInfo = await FileSystem.getInfoAsync(dir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
      }
    }
  } catch (error) {
    console.error('Failed to initialize offline storage:', error);
  }
};

// Network Status
export const checkNetworkStatus = async (): Promise<boolean> => {
  try {
    const state = await NetInfo.fetch();
    return state.isConnected ?? false;
  } catch {
    return false;
  }
};

export const subscribeToNetworkChanges = (
  callback: (isConnected: boolean) => void
): (() => void) => {
  return NetInfo.addEventListener((state: NetInfoState) => {
    callback(state.isConnected ?? false);
  });
};

// Session Caching
export const cacheUserSession = async (user: User): Promise<void> => {
  try {
    const session: CachedSession = {
      userId: user.id,
      email: user.email,
      name: user.name,
      profilePhoto: user.profilePhoto,
      cachedAt: Date.now(),
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
    };
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_SESSION, JSON.stringify(session));
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_USER, JSON.stringify(user));
  } catch (error) {
    console.error('Failed to cache user session:', error);
  }
};

export const getCachedSession = async (): Promise<CachedSession | null> => {
  try {
    const sessionStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_SESSION);
    if (!sessionStr) return null;
    
    const session: CachedSession = JSON.parse(sessionStr);
    
    // Check if session has expired
    if (session.expiresAt < Date.now()) {
      await clearCachedSession();
      return null;
    }
    
    return session;
  } catch (error) {
    console.error('Failed to get cached session:', error);
    return null;
  }
};

export const getCachedUser = async (): Promise<User | null> => {
  try {
    const userStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_USER);
    if (!userStr) return null;
    return JSON.parse(userStr);
  } catch (error) {
    console.error('Failed to get cached user:', error);
    return null;
  }
};

export const clearCachedSession = async (): Promise<void> => {
  try {
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CACHED_SESSION,
      STORAGE_KEYS.CACHED_USER,
    ]);
  } catch (error) {
    console.error('Failed to clear cached session:', error);
  }
};

// Trip Data Caching
export const cacheTrips = async (trips: any[]): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_TRIPS, JSON.stringify({
      trips,
      cachedAt: Date.now(),
    }));
  } catch (error) {
    console.error('Failed to cache trips:', error);
  }
};

export const getCachedTrips = async (): Promise<any[] | null> => {
  try {
    const dataStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_TRIPS);
    if (!dataStr) return null;
    
    const data = JSON.parse(dataStr);
    return data.trips;
  } catch (error) {
    console.error('Failed to get cached trips:', error);
    return null;
  }
};

// Alias for cacheTrips for use in hooks
export const cacheTripsData = cacheTrips;

// Document Caching
export const cacheDocument = async (
  document: { id: string; tripId: string; fileName: string; url: string; type?: string }
): Promise<CachedDocument | null> => {
  try {
    const fileName = `${document.id}_${document.fileName}`;
    const localPath = `${DOCUMENTS_CACHE_DIR}${fileName}`;
    
    // Download the file
    const downloadResult = await FileSystem.downloadAsync(document.url, localPath);
    
    if (downloadResult.status !== 200) {
      throw new Error('Failed to download document');
    }
    
    // Get file info for size
    const fileInfo = await FileSystem.getInfoAsync(localPath);
    const fileSize = fileInfo.exists && 'size' in fileInfo ? fileInfo.size : 0;
    
    const cachedDoc: CachedDocument = {
      id: document.id,
      tripId: document.tripId,
      fileName: document.fileName,
      localPath,
      originalUrl: document.url,
      type: document.type || 'other',
      cachedAt: Date.now(),
      fileSize,
    };
    
    // Store in index
    const index = await getCachedDocumentsIndex();
    index[document.id] = cachedDoc;
    await AsyncStorage.setItem(STORAGE_KEYS.CACHED_DOCUMENTS, JSON.stringify(index));
    
    return cachedDoc;
  } catch (error) {
    console.error('Failed to cache document:', error);
    return null;
  }
};

export const getCachedDocument = async (documentId: string): Promise<CachedDocument | null> => {
  try {
    const index = await getCachedDocumentsIndex();
    const cached = index[documentId];
    
    if (!cached) return null;
    
    // Verify file still exists
    const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
    if (!fileInfo.exists) {
      // Remove from index if file is missing
      delete index[documentId];
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_DOCUMENTS, JSON.stringify(index));
      return null;
    }
    
    return cached;
  } catch (error) {
    console.error('Failed to get cached document:', error);
    return null;
  }
};

export const getCachedDocumentsIndex = async (): Promise<Record<string, CachedDocument>> => {
  try {
    const indexStr = await AsyncStorage.getItem(STORAGE_KEYS.CACHED_DOCUMENTS);
    if (!indexStr) return {};
    return JSON.parse(indexStr);
  } catch (error) {
    console.error('Failed to get cached documents index:', error);
    return {};
  }
};

export const getCachedDocumentsForTrip = async (tripId: string): Promise<CachedDocument[]> => {
  try {
    const index = await getCachedDocumentsIndex();
    return Object.values(index).filter(doc => doc.tripId === tripId);
  } catch (error) {
    console.error('Failed to get cached documents for trip:', error);
    return [];
  }
};

export const deleteCachedDocument = async (documentId: string): Promise<void> => {
  try {
    const index = await getCachedDocumentsIndex();
    const cached = index[documentId];
    
    if (cached) {
      // Delete the file
      const fileInfo = await FileSystem.getInfoAsync(cached.localPath);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(cached.localPath);
      }
      
      // Remove from index
      delete index[documentId];
      await AsyncStorage.setItem(STORAGE_KEYS.CACHED_DOCUMENTS, JSON.stringify(index));
    }
  } catch (error) {
    console.error('Failed to delete cached document:', error);
  }
};

// Offline Map Regions
export const saveOfflineMapRegion = async (region: Omit<OfflineMapRegion, 'cachedAt'>): Promise<void> => {
  try {
    const regions = await getOfflineMapRegions();
    const fullRegion: OfflineMapRegion = {
      ...region,
      cachedAt: Date.now(),
    };
    regions[region.id] = fullRegion;
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MAP_REGIONS, JSON.stringify(regions));
  } catch (error) {
    console.error('Failed to save offline map region:', error);
  }
};

export const getOfflineMapRegions = async (): Promise<Record<string, OfflineMapRegion>> => {
  try {
    const regionsStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_MAP_REGIONS);
    if (!regionsStr) return {};
    return JSON.parse(regionsStr);
  } catch (error) {
    console.error('Failed to get offline map regions:', error);
    return {};
  }
};

export const getOfflineMapRegionsForTrip = async (tripId: string): Promise<OfflineMapRegion[]> => {
  try {
    const regions = await getOfflineMapRegions();
    return Object.values(regions).filter(region => region.tripId === tripId);
  } catch (error) {
    console.error('Failed to get offline map regions for trip:', error);
    return [];
  }
};

export const deleteOfflineMapRegion = async (regionId: string): Promise<void> => {
  try {
    const regions = await getOfflineMapRegions();
    delete regions[regionId];
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_MAP_REGIONS, JSON.stringify(regions));
  } catch (error) {
    console.error('Failed to delete offline map region:', error);
  }
};

// Offline Queue for pending actions
export const addToOfflineQueue = async (item: Omit<OfflineQueueItem, 'id' | 'timestamp'>): Promise<void> => {
  try {
    const queue = await getOfflineQueue();
    const newItem: OfflineQueueItem = {
      ...item,
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    queue.push(newItem);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
  } catch (error) {
    console.error('Failed to add to offline queue:', error);
  }
};

export const getOfflineQueue = async (): Promise<OfflineQueueItem[]> => {
  try {
    const queueStr = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    if (!queueStr) return [];
    return JSON.parse(queueStr);
  } catch (error) {
    console.error('Failed to get offline queue:', error);
    return [];
  }
};

export const clearOfflineQueue = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
  } catch (error) {
    console.error('Failed to clear offline queue:', error);
  }
};

export const removeFromOfflineQueue = async (itemId: string): Promise<void> => {
  try {
    const queue = await getOfflineQueue();
    const filtered = queue.filter(item => item.id !== itemId);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(filtered));
  } catch (error) {
    console.error('Failed to remove from offline queue:', error);
  }
};

// Process offline queue: attempt to sync queued actions when online
export const processOfflineQueue = async (): Promise<void> => {
  try {
    const queue = await getOfflineQueue();
    if (!queue || queue.length === 0) return;

    // Import firestore service dynamically to avoid circular imports
    const firestoreSvc = await import('@/services/firestore');

    for (const item of queue) {
      try {
        if (item.collection === 'trips') {
          if (item.type === 'create') {
            // item.data expected to have { tempId, tripData }
            const { tempId, tripData } = item.data as any;
            const realId = await firestoreSvc.createTrip(tripData);

            // Replace tempId in cached trips with real trip
            try {
              const { getCachedTrips, cacheTrips } = await import('@/services/offline');
              const cached = (await getCachedTrips()) || [];
              const updated = cached.map((t: any) => (t.id === tempId ? { ...t, id: realId } : t));
              await cacheTrips(updated);
            } catch (err) {
              console.warn('Failed to update cached trips after create sync:', err);
            }
          } else if (item.type === 'update') {
            const { tripId, updateData } = item.data as any;
            await firestoreSvc.updateTrip(tripId, updateData);
          } else if (item.type === 'delete') {
            const { tripId } = item.data as any;
            await firestoreSvc.deleteTrip(tripId);
          }
        } else {
          // For other collections, attempt to call a generic handler if available
          // e.g., documents, expenses - try to call a sync handler on firestoreSvc
          const handlerName = `${item.collection}Sync`;
          if ((firestoreSvc as any)[handlerName]) {
            await (firestoreSvc as any)[handlerName](item);
          }
        }

        // If successful, remove from queue
        await removeFromOfflineQueue(item.id);
      } catch (err) {
        console.warn('Failed to process offline queue item, keeping it for retry:', item.id, err);
        // keep item in queue for retry
      }
    }
  } catch (error) {
    console.error('Failed to process offline queue:', error);
  }
};

// Cache Size Management
export const getCacheSize = async (): Promise<{ documents: number; maps: number; total: number }> => {
  try {
    let documentsSize = 0;
    let mapsSize = 0;
    
    // Get documents cache size
    const docsInfo = await FileSystem.getInfoAsync(DOCUMENTS_CACHE_DIR);
    if (docsInfo.exists) {
      const docFiles = await FileSystem.readDirectoryAsync(DOCUMENTS_CACHE_DIR);
      for (const file of docFiles) {
        const fileInfo = await FileSystem.getInfoAsync(`${DOCUMENTS_CACHE_DIR}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          documentsSize += fileInfo.size;
        }
      }
    }
    
    // Get maps cache size
    const mapsInfo = await FileSystem.getInfoAsync(MAPS_CACHE_DIR);
    if (mapsInfo.exists) {
      const mapFiles = await FileSystem.readDirectoryAsync(MAPS_CACHE_DIR);
      for (const file of mapFiles) {
        const fileInfo = await FileSystem.getInfoAsync(`${MAPS_CACHE_DIR}${file}`);
        if (fileInfo.exists && 'size' in fileInfo) {
          mapsSize += fileInfo.size;
        }
      }
    }
    
    return {
      documents: documentsSize,
      maps: mapsSize,
      total: documentsSize + mapsSize,
    };
  } catch (error) {
    console.error('Failed to get cache size:', error);
    return { documents: 0, maps: 0, total: 0 };
  }
};

export const clearAllCache = async (): Promise<void> => {
  try {
    // Clear file cache
    const cacheInfo = await FileSystem.getInfoAsync(CACHE_DIRECTORY);
    if (cacheInfo.exists) {
      await FileSystem.deleteAsync(CACHE_DIRECTORY, { idempotent: true });
    }
    
    // Clear AsyncStorage cache items
    await AsyncStorage.multiRemove([
      STORAGE_KEYS.CACHED_DOCUMENTS,
      STORAGE_KEYS.OFFLINE_MAP_REGIONS,
      STORAGE_KEYS.CACHED_TRIPS,
    ]);
    
    // Reinitialize directories
    await initializeOfflineStorage();
  } catch (error) {
    console.error('Failed to clear cache:', error);
  }
};

// Format bytes to human readable
export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

// Last sync tracking
export const updateLastSync = async (): Promise<void> => {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.LAST_SYNC, Date.now().toString());
  } catch (error) {
    console.error('Failed to update last sync:', error);
  }
};

export const getLastSync = async (): Promise<number | null> => {
  try {
    const lastSync = await AsyncStorage.getItem(STORAGE_KEYS.LAST_SYNC);
    return lastSync ? parseInt(lastSync, 10) : null;
  } catch (error) {
    console.error('Failed to get last sync:', error);
    return null;
  }
};
