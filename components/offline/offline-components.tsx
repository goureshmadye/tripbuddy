/**
 * Offline Mode Components
 * UI components for offline status, downloads, and cache management
 */

import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useOffline } from '@/hooks/use-offline';
import { CachedDocument, formatBytes, OfflineMapRegion } from '@/services/offline';
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

// Offline Status Banner
interface OfflineStatusBannerProps {
  compact?: boolean;
}

export function OfflineStatusBanner({ compact = false }: OfflineStatusBannerProps) {
  const { isOnline, lastSync, pendingActions } = useOffline();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  if (isOnline) return null;
  
  const formatLastSync = () => {
    if (!lastSync) return 'Never synced';
    const now = new Date();
    const diff = now.getTime() - lastSync.getTime();
    const mins = Math.floor(diff / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);
    
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };
  
  if (compact) {
    return (
      <View style={[styles.compactBanner, { backgroundColor: Colors.warning }]}>
        <Ionicons name="cloud-offline" size={14} color="#FFFFFF" />
        <Text style={styles.compactBannerText}>Offline</Text>
      </View>
    );
  }
  
  return (
    <View style={[styles.banner, { backgroundColor: Colors.warning + '15' }]}>
      <View style={styles.bannerContent}>
        <View style={[styles.bannerIcon, { backgroundColor: Colors.warning }]}>
          <Ionicons name="cloud-offline" size={20} color="#FFFFFF" />
        </View>
        <View style={styles.bannerText}>
          <Text style={[styles.bannerTitle, { color: Colors.warning }]}>You are Offline</Text>
          <Text style={[styles.bannerSubtitle, { color: isDark ? Colors.dark.textSecondary : Colors.light.textSecondary }]}>
            Last synced: {formatLastSync()}
            {pendingActions > 0 && ` • ${pendingActions} pending`}
          </Text>
        </View>
      </View>
    </View>
  );
}

// Download Button for documents
interface DownloadButtonProps {
  documentId: string;
  tripId: string;
  fileName: string;
  url: string;
  type?: string;
  size?: 'sm' | 'md';
  onDownloadComplete?: () => void;
}

export function DownloadButton({
  documentId,
  tripId,
  fileName,
  url,
  type,
  size = 'md',
  onDownloadComplete,
}: DownloadButtonProps) {
  const { downloadDocument, isDocumentCached, removeDocumentFromCache } = useOffline();
  const [isCached, setIsCached] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  
  const checkCacheStatus = useCallback(async () => {
    const cached = await isDocumentCached(documentId);
    setIsCached(cached);
  }, [documentId, isDocumentCached]);

  useEffect(() => {
    checkCacheStatus();
  }, [checkCacheStatus]);
  
  const handlePress = async () => {
    if (isCached) {
      Alert.alert(
        'Remove Download',
        'Remove this document from offline storage?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeDocumentFromCache(documentId);
              setIsCached(false);
            },
          },
        ]
      );
    } else {
      setIsDownloading(true);
      try {
        const success = await downloadDocument({ id: documentId, tripId, fileName, url, type });
        if (success) {
          setIsCached(true);
          onDownloadComplete?.();
        } else {
          Alert.alert('Download Failed', 'Could not download the document. Please try again.');
        }
      } finally {
        setIsDownloading(false);
      }
    }
  };
  
  const iconSize = size === 'sm' ? 16 : 20;
  const buttonSize = size === 'sm' ? 28 : 36;
  
  return (
    <TouchableOpacity
      style={[
        styles.downloadButton,
        {
          width: buttonSize,
          height: buttonSize,
          backgroundColor: isCached ? Colors.success + '15' : colors.backgroundSecondary,
        },
      ]}
      onPress={handlePress}
      disabled={isDownloading}
    >
      {isDownloading ? (
        <ActivityIndicator size="small" color={Colors.primary} />
      ) : (
        <Ionicons
          name={isCached ? 'checkmark-circle' : 'download-outline'}
          size={iconSize}
          color={isCached ? Colors.success : Colors.primary}
        />
      )}
    </TouchableOpacity>
  );
}

// Offline Map Download Component
interface MapDownloadCardProps {
  tripId: string;
  tripName: string;
  latitude: number;
  longitude: number;
  onDownloadComplete?: () => void;
}

export function MapDownloadCard({
  tripId,
  tripName,
  latitude,
  longitude,
  onDownloadComplete,
}: MapDownloadCardProps) {
  const { downloadMapRegion, getCachedMapRegions, removeMapRegion } = useOffline();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [cachedRegion, setCachedRegion] = useState<OfflineMapRegion | null>(null);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  
  const checkDownloadStatus = useCallback(async () => {
    const regions = await getCachedMapRegions(tripId);
    if (regions.length > 0) {
      setIsDownloaded(true);
      setCachedRegion(regions[0]);
    }
  }, [getCachedMapRegions, tripId]);

  useEffect(() => {
    checkDownloadStatus();
  }, [checkDownloadStatus]);
  
  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      const regionId = `map_${tripId}_${Date.now()}`;
      const success = await downloadMapRegion({
        id: regionId,
        tripId,
        name: tripName,
        latitude,
        longitude,
        latitudeDelta: 0.1,
        longitudeDelta: 0.1,
        zoomLevel: 14,
        tileCount: 100, // Estimated
        sizeInMB: 5, // Estimated
      });
      
      if (success) {
        setIsDownloaded(true);
        onDownloadComplete?.();
        Alert.alert('Map Downloaded', 'This area is now available offline.');
      }
    } finally {
      setIsDownloading(false);
    }
  };
  
  const handleRemove = async () => {
    if (!cachedRegion) return;
    
    Alert.alert(
      'Remove Offline Map',
      'Remove this map from offline storage?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await removeMapRegion(cachedRegion.id);
            setIsDownloaded(false);
            setCachedRegion(null);
          },
        },
      ]
    );
  };
  
  return (
    <View style={[styles.mapCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.mapCardHeader}>
        <View style={[styles.mapIcon, { backgroundColor: Colors.primary + '15' }]}>
          <Ionicons name="map" size={24} color={Colors.primary} />
        </View>
        <View style={styles.mapCardInfo}>
          <Text style={[styles.mapCardTitle, { color: colors.text }]}>Offline Map</Text>
          <Text style={[styles.mapCardSubtitle, { color: colors.textSecondary }]}>
            {isDownloaded ? `${cachedRegion?.sizeInMB || 5} MB • Downloaded` : 'Download for offline use'}
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[
          styles.mapDownloadBtn,
          {
            backgroundColor: isDownloaded ? Colors.success + '15' : Colors.primary,
          },
        ]}
        onPress={isDownloaded ? handleRemove : handleDownload}
        disabled={isDownloading}
      >
        {isDownloading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            <Ionicons
              name={isDownloaded ? 'checkmark-circle' : 'download'}
              size={18}
              color={isDownloaded ? Colors.success : '#FFFFFF'}
            />
            <Text
              style={[
                styles.mapDownloadBtnText,
                { color: isDownloaded ? Colors.success : '#FFFFFF' },
              ]}
            >
              {isDownloaded ? 'Downloaded' : 'Download'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </View>
  );
}

// Cache Manager Modal
interface CacheManagerProps {
  visible?: boolean;
  onClose?: () => void;
  onClearComplete?: () => void;
}

// Inner content component that can be used standalone or in modal
function CacheManagerContent({ onClearComplete }: { onClearComplete?: () => void }) {
  const {
    cacheSize,
    getCachedDocuments,
    getCachedMapRegions,
    removeDocumentFromCache,
    removeMapRegion,
    clearCache,
    refreshCacheSize,
  } = useOffline();
  const [documents, setDocuments] = useState<CachedDocument[]>([]);
  const [mapRegions, setMapRegions] = useState<OfflineMapRegion[]>([]);
  const [loading, setLoading] = useState(true);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  
  const loadCachedItems = useCallback(async () => {
    setLoading(true);
    const [docs, maps] = await Promise.all([
      getCachedDocuments(),
      getCachedMapRegions(),
    ]);
    setDocuments(docs);
    setMapRegions(maps);
    await refreshCacheSize();
    setLoading(false);
  }, [getCachedDocuments, getCachedMapRegions, refreshCacheSize]);

  useEffect(() => {
    loadCachedItems();
  }, [loadCachedItems]);
  
  const handleClearAll = () => {
    Alert.alert(
      'Clear All Cache',
      'This will remove all offline documents and maps. Are you sure?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await clearCache();
            setDocuments([]);
            setMapRegions([]);
            onClearComplete?.();
          },
        },
      ]
    );
  };
  
  const handleRemoveDocument = async (docId: string) => {
    await removeDocumentFromCache(docId);
    setDocuments(prev => prev.filter(d => d.id !== docId));
    await refreshCacheSize();
  };
  
  const handleRemoveMap = async (regionId: string) => {
    await removeMapRegion(regionId);
    setMapRegions(prev => prev.filter(r => r.id !== regionId));
    await refreshCacheSize();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      {/* Cache Size Summary */}
      <View style={[styles.cacheSummary, { backgroundColor: colors.card }]}>
        <View style={styles.cacheSummaryRow}>
          <Text style={[styles.cacheSummaryLabel, { color: colors.textSecondary }]}>
            Total Storage Used
          </Text>
          <Text style={[styles.cacheSummaryValue, { color: colors.text }]}>
            {cacheSize.formatted}
          </Text>
        </View>
        <View style={styles.cacheBreakdown}>
          <View style={styles.cacheBreakdownItem}>
            <View style={[styles.cacheBreakdownDot, { backgroundColor: Colors.primary }]} />
            <Text style={[styles.cacheBreakdownText, { color: colors.textSecondary }]}>
              Documents: {formatBytes(cacheSize.documents)}
            </Text>
          </View>
          <View style={styles.cacheBreakdownItem}>
            <View style={[styles.cacheBreakdownDot, { backgroundColor: Colors.secondary }]} />
            <Text style={[styles.cacheBreakdownText, { color: colors.textSecondary }]}>
              Maps: {formatBytes(cacheSize.maps)}
            </Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={handleClearAll} 
          style={[styles.clearAllButton, { borderColor: Colors.error }]}
        >
          <Ionicons name="trash-outline" size={16} color={Colors.error} />
          <Text style={[styles.clearAllText, { color: Colors.error }]}>Clear All Cache</Text>
        </TouchableOpacity>
      </View>
      
      {/* Documents Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Documents ({documents.length})
        </Text>
        {documents.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No documents downloaded
          </Text>
        ) : (
          documents.map((doc) => (
            <View
              key={doc.id}
              style={[styles.cacheItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cacheItemInfo}>
                <Ionicons name="document-outline" size={20} color={Colors.primary} />
                <View style={styles.cacheItemText}>
                  <Text style={[styles.cacheItemName, { color: colors.text }]} numberOfLines={1}>
                    {doc.fileName}
                  </Text>
                  <Text style={[styles.cacheItemSize, { color: colors.textSecondary }]}>
                    {formatBytes(doc.fileSize)}
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveDocument(doc.id)}
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
      
      {/* Maps Section */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>
          Maps ({mapRegions.length})
        </Text>
        {mapRegions.length === 0 ? (
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No maps downloaded
          </Text>
        ) : (
          mapRegions.map((region) => (
            <View
              key={region.id}
              style={[styles.cacheItem, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={styles.cacheItemInfo}>
                <Ionicons name="map-outline" size={20} color={Colors.secondary} />
                <View style={styles.cacheItemText}>
                  <Text style={[styles.cacheItemName, { color: colors.text }]} numberOfLines={1}>
                    {region.name}
                  </Text>
                  <Text style={[styles.cacheItemSize, { color: colors.textSecondary }]}>
                    {region.sizeInMB.toFixed(1)} MB
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => handleRemoveMap(region.id)}
                style={styles.removeButton}
              >
                <Ionicons name="trash-outline" size={18} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </View>
  );
}

export function CacheManager({ visible, onClose, onClearComplete }: CacheManagerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // If visible and onClose are not provided, render content directly
  if (visible === undefined && onClose === undefined) {
    return <CacheManagerContent onClearComplete={onClearComplete} />;
  }

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet">
      <View style={[styles.modalContainer, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.modalTitle, { color: colors.text }]}>Offline Storage</Text>
          <View style={styles.closeButton} />
        </View>
        
        <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
          <CacheManagerContent onClearComplete={onClearComplete} />
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  // Banner styles
  banner: {
    marginHorizontal: Spacing.screenPadding,
    marginVertical: Spacing.sm,
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  bannerSubtitle: {
    fontSize: FontSizes.caption,
    marginTop: 2,
  },
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.pill,
    gap: 4,
  },
  compactBannerText: {
    color: '#FFFFFF',
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
  },
  
  // Download button styles
  downloadButton: {
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  // Map card styles
  mapCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    marginBottom: Spacing.md,
  },
  mapCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  mapIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  mapCardInfo: {
    flex: 1,
  },
  mapCardTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  mapCardSubtitle: {
    fontSize: FontSizes.caption,
    marginTop: 2,
  },
  mapDownloadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    gap: 6,
  },
  mapDownloadBtnText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  closeButton: {
    padding: Spacing.xs,
  },
  modalTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
  },
  clearButton: {
    padding: Spacing.xs,
  },
  clearButtonText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  cacheSummary: {
    margin: Spacing.screenPadding,
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
  },
  cacheSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  cacheSummaryLabel: {
    fontSize: FontSizes.body,
  },
  cacheSummaryValue: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  cacheBreakdown: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  cacheBreakdownItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cacheBreakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  cacheBreakdownText: {
    fontSize: FontSizes.caption,
  },
  clearAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: 1,
    borderRadius: BorderRadius.medium,
    marginTop: Spacing.sm,
  },
  clearAllText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: Spacing.screenPadding,
  },
  loadingContainer: {
    paddingVertical: Spacing['3xl'],
    alignItems: 'center',
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  emptyText: {
    fontSize: FontSizes.bodySmall,
    fontStyle: 'italic',
  },
  cacheItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    marginBottom: Spacing.sm,
  },
  cacheItemInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.md,
  },
  cacheItemText: {
    flex: 1,
  },
  cacheItemName: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  cacheItemSize: {
    fontSize: FontSizes.caption,
    marginTop: 2,
  },
  removeButton: {
    padding: Spacing.sm,
  },
});
