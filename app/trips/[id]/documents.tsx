import { UpgradePrompt } from '@/components/subscription';
import { EmptyState } from '@/components/ui/empty-state';
import { storage } from '@/config/firebase';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSubscription, useTripUsage } from '@/hooks/use-subscription';
import { useTripDocuments } from '@/hooks/use-trips';
import { createDocument, deleteDocument } from '@/services/firestore';
import { DocumentType, TripDocument } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sharing from 'expo-sharing';
import { getDownloadURL, ref, uploadBytes } from 'firebase/storage';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    Image,
    Modal,
    Platform,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';

const { width } = Dimensions.get('window');
const GALLERY_COLUMNS = 3;
const GALLERY_GAP = Spacing.md;
const GALLERY_ITEM_SIZE = (width - Spacing.lg * 2 - GALLERY_GAP * (GALLERY_COLUMNS - 1)) / GALLERY_COLUMNS;

// Extended type for documents with display name
type DocumentWithName = TripDocument & { name: string };

const DOCUMENT_CONFIG: Record<DocumentType | string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  flight: { icon: 'airplane-outline', color: Colors.primary, label: 'Flight' },
  hotel: { icon: 'bed-outline', color: Colors.secondary, label: 'Hotel' },
  activity: { icon: 'ticket-outline', color: '#8B5CF6', label: 'Activity' },
  other: { icon: 'document-outline', color: '#64748B', label: 'Other' },
};

const FILTER_OPTIONS: (DocumentType | 'all')[] = ['all', 'flight', 'hotel', 'activity', 'other'];

export default function DocumentsScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, firebaseUser } = useAuth();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { documents: rawDocuments, loading, error } = useTripDocuments(id);
  const [filter, setFilter] = useState<DocumentType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');
  const [uploading, setUploading] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocumentWithName | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  
  // Subscription and usage limits
  const { limits } = useSubscription();
  const { usage, documentAccess, refresh: refreshUsage } = useTripUsage(id || '');
  const [showUpgradePrompt, setShowUpgradePrompt] = useState(false);

  // Map documents to include name from fileName or default
  const documents: DocumentWithName[] = rawDocuments.map((doc) => ({
    ...doc,
    name: doc.label || 'Untitled Document',
  }));

  const filteredDocuments = filter === 'all'
    ? documents
    : documents.filter((doc: DocumentWithName) => doc.type === filter);
  
  const isImageFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp'].includes(ext);
  };

  const isPdfFile = (name: string) => {
    const ext = name.split('.').pop()?.toLowerCase() || '';
    return ext === 'pdf';
  };

  const getDocConfig = (type?: string | null) => {
    return DOCUMENT_CONFIG[type || 'other'] || DOCUMENT_CONFIG.other;
  };

  const getFileExtension = (name: string) => {
    return name.split('.').pop()?.toUpperCase() || 'FILE';
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const uploadFileToStorage = async (
    uri: string, 
    fileName: string, 
    mimeType?: string
  ): Promise<string> => {
    const response = await fetch(uri);
    const blob = await response.blob();
    
    const fileExtension = fileName.split('.').pop() || 'file';
    const uniqueFileName = `${Date.now()}_${fileName}`;
    const storageRef = ref(storage, `trips/${id}/documents/${uniqueFileName}`);
    
    await uploadBytes(storageRef, blob, {
      contentType: mimeType || 'application/octet-stream',
    });
    
    return getDownloadURL(storageRef);
  };

  const selectDocumentType = (onSelect: (type: DocumentType) => void) => {
    Alert.alert(
      'Document Type',
      'What type of document is this?',
      [
        { text: 'Flight', onPress: () => onSelect('flight') },
        { text: 'Hotel', onPress: () => onSelect('hotel') },
        { text: 'Activity', onPress: () => onSelect('activity') },
        { text: 'Other', onPress: () => onSelect('other') },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handlePickFromCamera = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Camera access is required to take photos.');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `photo_${Date.now()}.jpg`;
        
        selectDocumentType(async (docType) => {
          await saveDocument(asset.uri, fileName, asset.mimeType, docType);
        });
      }
    } catch (err) {
      console.error('Camera error:', err);
      Alert.alert('Error', 'Failed to take photo.');
    }
  };

  const handlePickFromLibrary = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Permission Denied', 'Photo library access is required.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsMultipleSelection: false,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        const fileName = asset.fileName || `image_${Date.now()}.jpg`;
        
        selectDocumentType(async (docType) => {
          await saveDocument(asset.uri, fileName, asset.mimeType, docType);
        });
      }
    } catch (err) {
      console.error('Image picker error:', err);
      Alert.alert('Error', 'Failed to select image.');
    }
  };

  const handlePickFromFiles = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        
        selectDocumentType(async (docType) => {
          await saveDocument(asset.uri, asset.name, asset.mimeType, docType);
        });
      }
    } catch (err) {
      console.error('Document picker error:', err);
      Alert.alert('Error', 'Failed to select file.');
    }
  };

  const saveDocument = async (
    uri: string, 
    fileName: string, 
    mimeType?: string, 
    docType: DocumentType = 'other'
  ) => {
    if (!firebaseUser || !id) return;

    // Check document limit before uploading
    await refreshUsage();
    if (!documentAccess.allowed) {
      setShowUpgradePrompt(true);
      return;
    }

    setUploading(true);
    try {
      const fileUrl = await uploadFileToStorage(uri, fileName, mimeType);
      
      await createDocument({
        tripId: id,
        uploadedBy: firebaseUser.uid,
        fileUrl,
        label: fileName,
        type: docType,
      });

      // Refresh usage after successful upload
      await refreshUsage();
      Alert.alert('Success', 'Document uploaded successfully!');
    } catch (err) {
      console.error('Upload error:', err);
      Alert.alert('Error', 'Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleUpload = () => {
    Alert.alert(
      'Upload Document',
      'Choose upload method',
      [
        { text: 'Camera', onPress: handlePickFromCamera },
        { text: 'Photo Library', onPress: handlePickFromLibrary },
        { text: 'Files', onPress: handlePickFromFiles },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleViewDocument = (doc: DocumentWithName) => {
    // Open inline preview modal
    setPreviewDoc(doc);
  };

  const handleOpenExternal = async (doc: DocumentWithName) => {
    try {
      if (Platform.OS === 'web') {
        window.open(doc.fileUrl, '_blank');
      } else {
        await Linking.openURL(doc.fileUrl);
      }
    } catch (err) {
      console.error('Open error:', err);
      Alert.alert('Error', 'Failed to open document externally.');
    }
  };

  const handleShareDocument = async (doc: DocumentWithName) => {
    try {
      if (Platform.OS === 'web') {
        // Web sharing
        if (navigator.share) {
          await navigator.share({
            title: doc.name,
            url: doc.fileUrl,
          });
        } else {
          await navigator.clipboard.writeText(doc.fileUrl);
          Alert.alert('Copied', 'Document link copied to clipboard.');
        }
      } else {
        // Mobile sharing - download file first then share
        const isAvailable = await Sharing.isAvailableAsync();
        if (!isAvailable) {
          // Fallback: copy link to clipboard
          await Clipboard.setStringAsync(doc.fileUrl);
          Alert.alert('Link Copied', 'Document link has been copied to clipboard.');
          return;
        }

        // Download file to cache directory using legacy File API
        const fileName = `${Date.now()}_${doc.name}`;
        const localUri = `${FileSystem.cacheDirectory}${fileName}`;
        
        const downloadResult = await FileSystem.downloadAsync(doc.fileUrl, localUri);
        
        if (downloadResult.status === 200) {
          await Sharing.shareAsync(downloadResult.uri, {
            mimeType: downloadResult.headers['content-type'] || 'application/octet-stream',
            dialogTitle: `Share ${doc.name}`,
          });
        } else {
          // Fallback: copy link
          await Clipboard.setStringAsync(doc.fileUrl);
          Alert.alert('Link Copied', 'Could not download file. Link has been copied instead.');
        }
      }
    } catch (err) {
      console.error('Share error:', err);
      // Fallback: try to copy link
      try {
        await Clipboard.setStringAsync(doc.fileUrl);
        Alert.alert('Link Copied', 'Document link has been copied to clipboard.');
      } catch {
        Alert.alert('Error', 'Failed to share document.');
      }
    }
  };

  const handleCopyLink = async (doc: DocumentWithName) => {
    try {
      if (Platform.OS === 'web') {
        await navigator.clipboard.writeText(doc.fileUrl);
      } else {
        await Clipboard.setStringAsync(doc.fileUrl);
      }
      Alert.alert('Copied', 'Document link copied to clipboard.');
    } catch (err) {
      console.error('Copy error:', err);
      Alert.alert('Error', 'Failed to copy link.');
    }
  };

  const handleDeleteDocument = async (doc: DocumentWithName) => {
    Alert.alert(
      'Delete Document',
      `Are you sure you want to delete "${doc.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteDocument(doc.id);
              Alert.alert('Deleted', 'Document has been removed.');
            } catch (err) {
              console.error('Delete error:', err);
              Alert.alert('Error', 'Failed to delete document.');
            }
          },
        },
      ]
    );
  };

  const handleDocumentPress = (doc: DocumentWithName) => {
    // Directly open preview instead of showing alert
    handleViewDocument(doc);
  };

  const handleDocumentLongPress = (doc: DocumentWithName) => {
    Alert.alert(
      doc.name,
      'Document options',
      [
        { text: 'Preview', onPress: () => handleViewDocument(doc) },
        { text: 'Open External', onPress: () => handleOpenExternal(doc) },
        { text: 'Share', onPress: () => handleShareDocument(doc) },
        { text: 'Copy Link', onPress: () => handleCopyLink(doc) },
        { text: 'Delete', style: 'destructive', onPress: () => handleDeleteDocument(doc) },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderPreviewContent = () => {
    if (!previewDoc) return null;
    
    const extension = previewDoc.name.split('.').pop()?.toLowerCase() || '';
    
    if (isImageFile(previewDoc.name)) {
      return (
        <Image
          source={{ uri: previewDoc.fileUrl }}
          style={styles.previewImage}
          resizeMode="contain"
          onLoadStart={() => setPreviewLoading(true)}
          onLoadEnd={() => setPreviewLoading(false)}
        />
      );
    }
    
    if (isPdfFile(previewDoc.name) || Platform.OS === 'web') {
      // Use WebView for PDFs and web preview
      return (
        <WebView
          source={{ uri: previewDoc.fileUrl }}
          style={styles.previewWebView}
          onLoadStart={() => setPreviewLoading(true)}
          onLoadEnd={() => setPreviewLoading(false)}
          startInLoadingState={true}
          renderLoading={() => (
            <View style={styles.previewLoadingContainer}>
              <ActivityIndicator size="large" color={Colors.primary} />
            </View>
          )}
        />
      );
    }
    
    // For other file types, show a preview card with open option
    const config = getDocConfig(previewDoc.type);
    return (
      <View style={styles.previewFallback}>
        <View style={[styles.previewFallbackIcon, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={64} color={config.color} />
        </View>
        <Text style={[styles.previewFallbackName, { color: colors.text }]}>{previewDoc.name}</Text>
        <Text style={[styles.previewFallbackType, { color: colors.textSecondary }]}>
          {extension.toUpperCase()} File
        </Text>
        <TouchableOpacity
          style={[styles.previewOpenButton, { backgroundColor: Colors.primary }]}
          onPress={() => handleOpenExternal(previewDoc)}
        >
          <Ionicons name="open-outline" size={20} color="#FFFFFF" />
          <Text style={styles.previewOpenButtonText}>Open in External App</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Document Preview Modal */}
      <Modal
        visible={previewDoc !== null}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setPreviewDoc(null)}
      >
        <SafeAreaView style={[styles.previewContainer, { backgroundColor: colors.background }]}>
          {/* Preview Header */}
          <View style={[styles.previewHeader, { borderBottomColor: colors.border }]}>
            <TouchableOpacity
              onPress={() => setPreviewDoc(null)}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close" size={28} color={colors.text} />
            </TouchableOpacity>
            <Text style={[styles.previewTitle, { color: colors.text }]} numberOfLines={1}>
              {previewDoc?.name || 'Document'}
            </Text>
            <View style={styles.previewHeaderActions}>
              <TouchableOpacity
                onPress={() => previewDoc && handleShareDocument(previewDoc)}
                style={[styles.previewHeaderButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="share-outline" size={20} color={colors.text} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => previewDoc && handleOpenExternal(previewDoc)}
                style={[styles.previewHeaderButton, { backgroundColor: colors.backgroundSecondary }]}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="open-outline" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Preview Content */}
          <View style={styles.previewContent}>
            {previewLoading && (
              <View style={styles.previewLoadingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
              </View>
            )}
            {renderPreviewContent()}
          </View>
        </SafeAreaView>
      </Modal>

      {/* Upload Overlay */}
      {uploading && (
        <View style={styles.uploadOverlay}>
          <View style={[styles.uploadModal, { backgroundColor: colors.card }]}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.uploadText, { color: colors.text }]}>Uploading...</Text>
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Documents</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'gallery' : 'list')}
            style={[styles.viewToggleButton, { backgroundColor: colors.backgroundSecondary }]}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons 
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} 
              size={20} 
              color={colors.text} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={[styles.filterTabsWrapper, { borderBottomColor: colors.border }]}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.filterTabs}
          contentContainerStyle={styles.filterTabsContent}
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = filter === option;
            const config = option === 'all' ? null : getDocConfig(option);
            return (
              <TouchableOpacity
                key={option}
                style={[
                  styles.filterTab,
                  {
                    backgroundColor: isActive ? Colors.primary : colors.backgroundSecondary,
                    borderColor: isActive ? Colors.primary : 'transparent',
                  },
                ]}
                onPress={() => setFilter(option)}
                activeOpacity={0.7}
              >
                {config && (
                  <Ionicons 
                    name={config.icon} 
                  size={16} 
                  color={isActive ? '#FFFFFF' : colors.textSecondary} 
                />
              )}
              <Text style={[
                styles.filterTabText,
                { color: isActive ? '#FFFFFF' : colors.text },
              ]}>
                {option === 'all' ? 'All' : config?.label}
              </Text>
            </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : error ? (
          <EmptyState
            icon="alert-circle-outline"
            title="Unable to load documents"
            description={error.message || "There was an error loading documents."}
          />
        ) : filteredDocuments.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No documents yet"
            description="Upload your travel documents, tickets, and reservations to keep everything organized."
            actionLabel="Upload Document"
            onAction={handleUpload}
          />
        ) : (
          <>
            {/* Document Limit Warning */}
            {!documentAccess.allowed && (
              <LimitWarning
                type="document"
                current={usage?.documentCount || 0}
                limit={limits.maxDocumentsPerTrip}
                onUpgrade={() => setShowUpgradePrompt(true)}
              />
            )}

            {/* Document Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.sm]}>
                <View style={[styles.statIconWrapper, { backgroundColor: Colors.primary + '15' }]}>
                  <Ionicons name="folder-outline" size={20} color={Colors.primary} />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>{documents.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.sm]}>
                <View style={[styles.statIconWrapper, { backgroundColor: '#3B82F6' + '15' }]}>
                  <Ionicons name="airplane-outline" size={20} color="#3B82F6" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {documents.filter(d => d.type === 'flight').length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Flights</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card }, Shadows.sm]}>
                <View style={[styles.statIconWrapper, { backgroundColor: '#8B5CF6' + '15' }]}>
                  <Ionicons name="ticket-outline" size={20} color="#8B5CF6" />
                </View>
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {documents.filter(d => d.type === 'activity').length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Activities</Text>
              </View>
            </View>

            {/* Documents View - List or Gallery */}
            {viewMode === 'list' ? (
              <View style={styles.documentsList}>
                {filteredDocuments.map((doc) => {
                  const config = getDocConfig(doc.type);
                  const extension = getFileExtension(doc.name);
                  return (
                    <Pressable
                      key={doc.id}
                      style={[styles.documentCard, { backgroundColor: colors.card }, Shadows.sm]}
                      onPress={() => handleDocumentPress(doc)}
                      onLongPress={() => handleDocumentLongPress(doc)}
                      delayLongPress={400}
                    >
                      <View style={[styles.docIconContainer, { backgroundColor: config.color + '12' }]}>
                        <Ionicons name={config.icon} size={26} color={config.color} />
                        <View style={[styles.extensionBadge, { backgroundColor: config.color }]}>
                          <Text style={styles.extensionText}>{extension}</Text>
                        </View>
                      </View>
                      <View style={styles.docContent}>
                        <Text style={[styles.docName, { color: colors.text }]} numberOfLines={1}>
                          {doc.name}
                        </Text>
                        <View style={styles.docMeta}>
                          <View style={[styles.typeBadge, { backgroundColor: config.color + '12' }]}>
                            <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                          </View>
                          <View style={styles.dateSeparator} />
                          <Ionicons name="time-outline" size={12} color={colors.textMuted} />
                          <Text style={[styles.docDate, { color: colors.textMuted }]}>
                            {formatDate(doc.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity 
                        style={[styles.docAction, { backgroundColor: colors.backgroundSecondary }]}
                        onPress={() => handleDocumentLongPress(doc)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="ellipsis-horizontal" size={18} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={styles.galleryGrid}>
                {filteredDocuments.map((doc) => {
                  const config = getDocConfig(doc.type);
                  const extension = getFileExtension(doc.name);
                  const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension.toLowerCase());
                  return (
                    <Pressable
                      key={doc.id}
                      style={[styles.galleryItem, { backgroundColor: colors.card }, Shadows.sm]}
                      onPress={() => handleDocumentPress(doc)}
                      onLongPress={() => handleDocumentLongPress(doc)}
                      delayLongPress={400}
                    >
                      {isImage && doc.fileUrl ? (
                        <Image
                          source={{ uri: doc.fileUrl }}
                          style={styles.galleryThumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.galleryIconContainer, { backgroundColor: config.color + '10' }]}>
                          <Ionicons name={config.icon} size={36} color={config.color} />
                        </View>
                      )}
                      <View style={[styles.galleryExtensionBadge, { backgroundColor: config.color }]}>
                        <Text style={styles.galleryExtensionText}>{extension}</Text>
                      </View>
                      <View style={styles.galleryItemInfo}>
                        <Text style={[styles.galleryItemName, { color: colors.text }]} numberOfLines={2}>
                          {doc.name}
                        </Text>
                        <Text style={[styles.galleryItemDate, { color: colors.textMuted }]}>
                          {formatDate(doc.createdAt)}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, Shadows.lg]}
        onPress={handleUpload}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Upgrade Prompt Modal */}
      <UpgradePrompt
        visible={showUpgradePrompt}
        onClose={() => setShowUpgradePrompt(false)}
        feature="Document Limit Reached"
        message={`You've uploaded ${usage?.documentCount || 0} of ${limits.maxDocumentsPerTrip} documents for this trip. Upgrade to Pro to upload unlimited documents.`}
        currentUsage={usage?.documentCount}
        limit={limits.maxDocumentsPerTrip}
        requiredPlan="pro"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  uploadOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 100,
  },
  uploadModal: {
    padding: Spacing.xl,
    borderRadius: BorderRadius.xl,
    alignItems: 'center',
    gap: Spacing.md,
  },
  uploadText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: Spacing.xxl,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabsWrapper: {
    borderBottomWidth: 1,
    paddingBottom: Spacing.md,
    marginBottom: Spacing.lg,
  },
  filterTabs: {
    flexGrow: 0,
  },
  filterTabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  filterTabText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl + Spacing.xxl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.md,
    marginBottom: Spacing.xl,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.xl,
    gap: Spacing.xs,
  },
  statIconWrapper: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  documentsList: {
    gap: Spacing.md,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.xl,
    gap: Spacing.md,
  },
  docIconContainer: {
    width: 52,
    height: 52,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  extensionBadge: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  extensionText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.5,
  },
  docContent: {
    flex: 1,
    gap: Spacing.xs,
  },
  docName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  typeBadge: {
    paddingVertical: 3,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  dateSeparator: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: '#9CA3AF',
    marginHorizontal: Spacing.xs,
  },
  docDate: {
    fontSize: FontSizes.xs,
    marginLeft: 2,
  },
  docAction: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GALLERY_GAP,
  },
  galleryItem: {
    width: GALLERY_ITEM_SIZE,
    borderRadius: BorderRadius.lg,
    overflow: 'hidden',
  },
  galleryThumbnail: {
    width: '100%',
    height: GALLERY_ITEM_SIZE * 0.85,
  },
  galleryIconContainer: {
    width: '100%',
    height: GALLERY_ITEM_SIZE * 0.85,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryExtensionBadge: {
    position: 'absolute',
    top: Spacing.sm,
    right: Spacing.sm,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  galleryExtensionText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeights.bold,
    letterSpacing: 0.3,
  },
  galleryItemInfo: {
    padding: Spacing.sm,
    gap: 2,
  },
  galleryItemName: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    lineHeight: FontSizes.xs * 1.3,
  },
  galleryItemDate: {
    fontSize: 10,
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xxl,
    right: Spacing.lg,
    width: 60,
    height: 60,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Preview Modal Styles
  previewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(0,0,0,0.85)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  previewTitle: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
    marginHorizontal: Spacing.sm,
  },
  previewHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  previewHeaderButton: {
    padding: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
  },
  previewContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewWebView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  previewLoadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  previewLoadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  previewFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  previewFallbackIcon: {
    width: 100,
    height: 100,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  previewFallbackName: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  previewFallbackType: {
    fontSize: FontSizes.sm,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: Spacing.xl,
  },
  previewOpenButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.primary,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.full,
  },
  previewOpenButtonText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    color: '#FFFFFF',
  },
});
