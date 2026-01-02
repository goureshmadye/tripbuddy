/**
 * useOffline Hook
 * Provides offline mode functionality including network status, document caching, and map downloads
 */

import {
    CachedDocument,
    cacheDocument,
    cacheTrips,
    cacheUserSession,
    checkNetworkStatus,
    clearAllCache,
    deleteCachedDocument,
    deleteOfflineMapRegion,
    formatBytes,
    getCachedDocument,
    getCachedDocumentsForTrip,
    getCachedDocumentsIndex,
    getCachedSession,
    getCachedTrips,
    getCacheSize,
    getLastSync,
    getOfflineMapRegions,
    getOfflineMapRegionsForTrip,
    getOfflineQueue,
    initializeOfflineStorage,
    OfflineMapRegion,
    processOfflineQueue,
    saveOfflineMapRegion,
    subscribeToNetworkChanges,
    updateLastSync,
} from '@/services/offline';
import { User } from '@/types/database';
import { useCallback, useEffect, useState } from 'react';

interface OfflineState {
  isOnline: boolean;
  isInitialized: boolean;
  lastSync: Date | null;
  cacheSize: {
    documents: number;
    maps: number;
    total: number;
    formatted: string;
  };
  pendingActions: number;
}

interface UseOfflineReturn extends OfflineState {
  // Network
  checkConnection: () => Promise<boolean>;
  
  // Session
  cacheSession: (user: User) => Promise<void>;
  getCachedSessionData: () => Promise<{ userId: string; email: string; name: string } | null>;
  
  // Trips
  cacheTripsData: (trips: any[]) => Promise<void>;
  getCachedTripsData: () => Promise<any[] | null>;
  
  // Documents
  downloadDocument: (doc: { id: string; tripId: string; fileName: string; url: string; type?: string }) => Promise<boolean>;
  getDocumentFromCache: (documentId: string) => Promise<CachedDocument | null>;
  getCachedDocuments: (tripId?: string) => Promise<CachedDocument[]>;
  isDocumentCached: (documentId: string) => Promise<boolean>;
  removeDocumentFromCache: (documentId: string) => Promise<void>;
  
  // Maps
  downloadMapRegion: (region: Omit<OfflineMapRegion, 'cachedAt'>) => Promise<boolean>;
  getCachedMapRegions: (tripId?: string) => Promise<OfflineMapRegion[]>;
  removeMapRegion: (regionId: string) => Promise<void>;
  
  // Cache management
  refreshCacheSize: () => Promise<void>;
  clearCache: () => Promise<void>;
  syncData: () => Promise<void>;
}

export function useOffline(): UseOfflineReturn {
  const [state, setState] = useState<OfflineState>({
    isOnline: true,
    isInitialized: false,
    lastSync: null,
    cacheSize: {
      documents: 0,
      maps: 0,
      total: 0,
      formatted: '0 B',
    },
    pendingActions: 0,
  });

  // Initialize offline storage and check network status
  useEffect(() => {
    const initialize = async () => {
      await initializeOfflineStorage();
      
      const [isOnline, lastSyncTime, size, queue] = await Promise.all([
        checkNetworkStatus(),
        getLastSync(),
        getCacheSize(),
        getOfflineQueue(),
      ]);
      
      setState(prev => ({
        ...prev,
        isOnline,
        isInitialized: true,
        lastSync: lastSyncTime ? new Date(lastSyncTime) : null,
        cacheSize: {
          ...size,
          formatted: formatBytes(size.total),
        },
        pendingActions: queue.length,
      }));
    };
    
    initialize();
  }, []);

  // Subscribe to network changes
  useEffect(() => {
    const unsubscribe = subscribeToNetworkChanges(async (isConnected) => {
      setState(prev => ({ ...prev, isOnline: isConnected }));
      if (isConnected) {
        try {
          await processOfflineQueue();
          // Refresh cache size and pending actions
          const queue = await getOfflineQueue();
          const size = await getCacheSize();
          setState(prev => ({
            ...prev,
            pendingActions: queue.length,
            cacheSize: { ...size, formatted: formatBytes(size.total) },
          }));
        } catch (err) {
          console.warn('Error processing offline queue on reconnect:', err);
        }
      }
    });
    
    return unsubscribe;
  }, []);

  // Check connection
  const checkConnection = useCallback(async (): Promise<boolean> => {
    const isOnline = await checkNetworkStatus();
    setState(prev => ({ ...prev, isOnline }));
    return isOnline;
  }, []);

  // Cache session
  const cacheSession = useCallback(async (user: User): Promise<void> => {
    await cacheUserSession(user);
  }, []);

  // Get cached session
  const getCachedSessionData = useCallback(async () => {
    const session = await getCachedSession();
    if (!session) return null;
    return {
      userId: session.userId,
      email: session.email,
      name: session.name,
    };
  }, []);

  // Cache trips
  const cacheTripsData = useCallback(async (trips: any[]): Promise<void> => {
    await cacheTrips(trips);
    await updateLastSync();
    const lastSyncTime = await getLastSync();
    setState(prev => ({
      ...prev,
      lastSync: lastSyncTime ? new Date(lastSyncTime) : null,
    }));
  }, []);

  // Get cached trips
  const getCachedTripsData = useCallback(async (): Promise<any[] | null> => {
    return getCachedTrips();
  }, []);

  // Download document
  const downloadDocument = useCallback(async (
    doc: { id: string; tripId: string; fileName: string; url: string; type?: string }
  ): Promise<boolean> => {
    try {
      const result = await cacheDocument(doc);
      if (result) {
        await refreshCacheSizeInternal();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to download document:', error);
      return false;
    }
  }, []);

  // Get document from cache
  const getDocumentFromCache = useCallback(async (documentId: string): Promise<CachedDocument | null> => {
    return getCachedDocument(documentId);
  }, []);

  // Get cached documents
  const getCachedDocuments = useCallback(async (tripId?: string): Promise<CachedDocument[]> => {
    if (tripId) {
      return getCachedDocumentsForTrip(tripId);
    }
    const index = await getCachedDocumentsIndex();
    return Object.values(index);
  }, []);

  // Check if document is cached
  const isDocumentCached = useCallback(async (documentId: string): Promise<boolean> => {
    const cached = await getCachedDocument(documentId);
    return cached !== null;
  }, []);

  // Remove document from cache
  const removeDocumentFromCache = useCallback(async (documentId: string): Promise<void> => {
    await deleteCachedDocument(documentId);
    await refreshCacheSizeInternal();
  }, []);

  // Download map region
  const downloadMapRegion = useCallback(async (
    region: Omit<OfflineMapRegion, 'cachedAt'>
  ): Promise<boolean> => {
    try {
      await saveOfflineMapRegion(region);
      await refreshCacheSizeInternal();
      return true;
    } catch (error) {
      console.error('Failed to download map region:', error);
      return false;
    }
  }, []);

  // Get cached map regions
  const getCachedMapRegions = useCallback(async (tripId?: string): Promise<OfflineMapRegion[]> => {
    if (tripId) {
      return getOfflineMapRegionsForTrip(tripId);
    }
    const regions = await getOfflineMapRegions();
    return Object.values(regions);
  }, []);

  // Remove map region
  const removeMapRegion = useCallback(async (regionId: string): Promise<void> => {
    await deleteOfflineMapRegion(regionId);
    await refreshCacheSizeInternal();
  }, []);

  // Internal refresh cache size
  const refreshCacheSizeInternal = async () => {
    const size = await getCacheSize();
    setState(prev => ({
      ...prev,
      cacheSize: {
        ...size,
        formatted: formatBytes(size.total),
      },
    }));
  };

  // Refresh cache size (exposed)
  const refreshCacheSize = useCallback(async (): Promise<void> => {
    await refreshCacheSizeInternal();
  }, []);

  // Clear cache
  const clearCache = useCallback(async (): Promise<void> => {
    await clearAllCache();
    await refreshCacheSizeInternal();
  }, []);

  // Sync data
  const syncData = useCallback(async (): Promise<void> => {
    await updateLastSync();
    const lastSyncTime = await getLastSync();
    setState(prev => ({
      ...prev,
      lastSync: lastSyncTime ? new Date(lastSyncTime) : null,
    }));
  }, []);

  return {
    ...state,
    checkConnection,
    cacheSession,
    getCachedSessionData,
    cacheTripsData,
    getCachedTripsData,
    downloadDocument,
    getDocumentFromCache,
    getCachedDocuments,
    isDocumentCached,
    removeDocumentFromCache,
    downloadMapRegion,
    getCachedMapRegions,
    removeMapRegion,
    refreshCacheSize,
    clearCache,
    syncData,
  };
}
