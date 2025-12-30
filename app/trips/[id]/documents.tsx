import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DocumentType, TripDocument } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    Dimensions,
    Image,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

const { width } = Dimensions.get('window');
const GALLERY_ITEM_SIZE = (width - Spacing.lg * 2 - Spacing.sm * 2) / 3;

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

const [documents] = useState<DocumentWithName[]>([]);
  const [filter, setFilter] = useState<DocumentType | 'all'>('all');
  const [viewMode, setViewMode] = useState<'list' | 'gallery'>('list');

  const filteredDocuments = filter === 'all'
    ? documents
    : documents.filter((doc: DocumentWithName) => doc.type === filter);

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

  const handleUpload = () => {
    Alert.alert(
      'Upload Document',
      'Choose upload method',
      [
        { text: 'Camera', onPress: () => {} },
        { text: 'Photo Library', onPress: () => {} },
        { text: 'Files', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDocumentPress = (doc: DocumentWithName) => {
    Alert.alert(
      doc.name,
      'Document options',
      [
        { text: 'View', onPress: () => {} },
        { text: 'Share', onPress: () => {} },
        { text: 'Delete', style: 'destructive', onPress: () => {} },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Documents</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'gallery' : 'list')}
            style={[styles.viewToggleButton, { backgroundColor: colors.backgroundSecondary }]}
          >
            <Ionicons 
              name={viewMode === 'list' ? 'grid-outline' : 'list-outline'} 
              size={20} 
              color={colors.text} 
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleUpload}
            style={[styles.addButton, { backgroundColor: Colors.primary }]}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
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
                  backgroundColor: isActive ? Colors.primary : colors.card,
                  borderColor: isActive ? Colors.primary : colors.border,
                },
              ]}
              onPress={() => setFilter(option)}
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

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredDocuments.length === 0 ? (
          <EmptyState
            icon="folder-open-outline"
            title="No documents yet"
            description="Upload your travel documents, tickets, and reservations to keep everything organized."
            actionLabel="Upload Document"
            onAction={handleUpload}
          />
        ) : (
          <>
            {/* Document Stats */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="document-outline" size={24} color={Colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>{documents.length}</Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Total Files</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="airplane-outline" size={24} color={Colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {documents.filter(d => d.type === 'flight').length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Flights</Text>
              </View>
              <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="ticket-outline" size={24} color={Colors.primary} />
                <Text style={[styles.statValue, { color: colors.text }]}>
                  {documents.filter(d => d.type === 'ticket').length}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Tickets</Text>
              </View>
            </View>

            {/* Documents View - List or Gallery */}
            {viewMode === 'list' ? (
              <View style={styles.documentsList}>
                {filteredDocuments.map((doc) => {
                  const config = getDocConfig(doc.type);
                  const extension = getFileExtension(doc.name);
                  return (
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.documentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => handleDocumentPress(doc)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.docIconContainer, { backgroundColor: config.color + '15' }]}>
                        <Ionicons name={config.icon} size={24} color={config.color} />
                        <View style={[styles.extensionBadge, { backgroundColor: config.color }]}>
                          <Text style={styles.extensionText}>{extension}</Text>
                        </View>
                      </View>
                      <View style={styles.docContent}>
                        <Text style={[styles.docName, { color: colors.text }]} numberOfLines={1}>
                          {doc.name}
                        </Text>
                        <View style={styles.docMeta}>
                          <View style={[styles.typeBadge, { backgroundColor: config.color + '15' }]}>
                            <Text style={[styles.typeBadgeText, { color: config.color }]}>{config.label}</Text>
                          </View>
                          <Text style={[styles.docDate, { color: colors.textMuted }]}>
                            {formatDate(doc.createdAt)}
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity style={styles.docAction}>
                        <Ionicons name="ellipsis-vertical" size={20} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </TouchableOpacity>
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
                    <TouchableOpacity
                      key={doc.id}
                      style={[styles.galleryItem, { backgroundColor: colors.card, borderColor: colors.border }]}
                      onPress={() => handleDocumentPress(doc)}
                      activeOpacity={0.7}
                    >
                      {isImage && doc.fileUrl ? (
                        <Image
                          source={{ uri: doc.fileUrl }}
                          style={styles.galleryThumbnail}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={[styles.galleryIconContainer, { backgroundColor: config.color + '15' }]}>
                          <Ionicons name={config.icon} size={32} color={config.color} />
                        </View>
                      )}
                      <View style={[styles.galleryExtensionBadge, { backgroundColor: config.color }]}>
                        <Text style={styles.galleryExtensionText}>{extension}</Text>
                      </View>
                      <Text style={[styles.galleryItemName, { color: colors.text }]} numberOfLines={2}>
                        {doc.name}
                      </Text>
                    </TouchableOpacity>
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  viewToggleButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filterTabs: {
    marginBottom: Spacing.md,
  },
  filterTabsContent: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
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
    paddingBottom: Spacing.xxxl + Spacing.xl,
  },
  statsRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.xs,
  },
  statValue: {
    fontSize: FontSizes.xl,
    fontWeight: FontWeights.bold,
  },
  statLabel: {
    fontSize: FontSizes.xs,
  },
  documentsList: {
    gap: Spacing.sm,
  },
  documentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  docIconContainer: {
    width: 56,
    height: 56,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  extensionBadge: {
    position: 'absolute',
    bottom: -4,
    right: -4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  extensionText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: FontWeights.bold,
  },
  docContent: {
    flex: 1,
  },
  docName: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
    marginBottom: Spacing.xs,
  },
  docMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  typeBadge: {
    paddingVertical: 2,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.full,
  },
  typeBadgeText: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
  },
  docDate: {
    fontSize: FontSizes.xs,
  },
  docAction: {
    padding: Spacing.xs,
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  galleryItem: {
    width: GALLERY_ITEM_SIZE,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    overflow: 'hidden',
  },
  galleryThumbnail: {
    width: '100%',
    height: GALLERY_ITEM_SIZE,
  },
  galleryIconContainer: {
    width: '100%',
    height: GALLERY_ITEM_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  galleryExtensionBadge: {
    position: 'absolute',
    top: Spacing.xs,
    right: Spacing.xs,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: BorderRadius.sm,
  },
  galleryExtensionText: {
    color: '#FFFFFF',
    fontSize: 8,
    fontWeight: FontWeights.bold,
  },
  galleryItemName: {
    fontSize: FontSizes.xs,
    fontWeight: FontWeights.medium,
    padding: Spacing.xs,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
