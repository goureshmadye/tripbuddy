import { ScreenHeader } from '@/components/navigation/screen-header';
import { ScreenContainer } from '@/components/screen-container';
import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useItineraryItem } from '@/hooks/use-trips';
import { deleteItineraryItem, updateItineraryItem } from '@/services/firestore';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as Linking from 'expo-linking';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';

interface Attachment {
  id: string;
  name: string;
  type: string;
  uri: string;
  size?: number;
}

interface Comment {
  id: string;
  userId: string;
  userName: string;
  text: string;
  createdAt: Date;
}

const CATEGORY_CONFIG: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
  activity: { icon: 'flash-outline', color: '#8B5CF6', label: 'Activity' },
  food: { icon: 'restaurant-outline', color: '#F97316', label: 'Food & Dining' },
  transport: { icon: 'car-outline', color: Colors.primary, label: 'Transport' },
  accommodation: { icon: 'bed-outline', color: Colors.secondary, label: 'Accommodation' },
  sightseeing: { icon: 'camera-outline', color: Colors.accent, label: 'Sightseeing' },
  other: { icon: 'ellipsis-horizontal-outline', color: '#64748B', label: 'Other' },
};

export default function ItineraryItemDetailScreen() {
  const router = useRouter();
  const { itemId } = useLocalSearchParams<{ itemId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { item, loading, error } = useItineraryItem(itemId);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const config = item ? (CATEGORY_CONFIG[item.category || 'other'] || CATEGORY_CONFIG.other) : CATEGORY_CONFIG.other;

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true,
    });
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', { 
      weekday: 'long',
      month: 'long', 
      day: 'numeric',
      year: 'numeric',
    });
  };

  const handleEdit = () => {
    if (item) {
      setEditTitle(item.title || '');
      setEditDescription(item.description || '');
      setEditLocation(item.location || '');
      setIsEditModalVisible(true);
    }
  };

  const handleSaveEdit = async () => {
    if (!itemId || !editTitle.trim()) {
      Alert.alert('Error', 'Title is required');
      return;
    }

    setIsSaving(true);
    try {
      await updateItineraryItem(itemId, {
        title: editTitle.trim(),
        description: editDescription.trim() || null,
        location: editLocation.trim() || null,
      });
      setIsEditModalVisible(false);
    } catch (err) {
      console.error('Error updating item:', err);
      Alert.alert('Error', 'Failed to update activity');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive', 
          onPress: async () => {
            try {
              if (itemId) {
                await deleteItineraryItem(itemId);
              }
              router.back();
            } catch (err) {
              console.error('Error deleting item:', err);
              Alert.alert('Error', 'Failed to delete activity');
            }
          } 
        },
      ]
    );
  };

  const handleAddAttachment = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const newAttachment: Attachment = {
          id: Date.now().toString(),
          name: asset.name,
          type: asset.mimeType || 'application/octet-stream',
          uri: asset.uri,
          size: asset.size,
        };
        setAttachments([...attachments, newAttachment]);
      }
    } catch (err) {
      console.error('Error picking document:', err);
      Alert.alert('Error', 'Failed to pick document');
    }
  };

  const handleRemoveAttachment = (attachmentId: string) => {
    setAttachments(attachments.filter(a => a.id !== attachmentId));
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleAddComment = () => {
    if (!newComment.trim()) return;
    
    setComments([
      ...comments,
      {
        id: Date.now().toString(),
        userId: 'user1',
        userName: 'You',
        text: newComment,
        createdAt: new Date(),
      },
    ]);
    setNewComment('');
  };

  const handleOpenMap = () => {
    if (item?.latitude != null && item?.longitude != null) {
      // Open in native maps app
      const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
      const latLng = `${item.latitude},${item.longitude}`;
      const label = encodeURIComponent(item.title || item.location || 'Location');
      const url = Platform.select({
        ios: `${scheme}${label}@${latLng}`,
        android: `${scheme}${latLng}(${label})`,
        default: `https://www.google.com/maps/search/?api=1&query=${latLng}`,
      });
      Linking.openURL(url as string);
    } else if (item?.location) {
      // Open location search in maps
      const query = encodeURIComponent(item.location);
      const url = Platform.select({
        ios: `maps:0,0?q=${query}`,
        android: `geo:0,0?q=${query}`,
        default: `https://www.google.com/maps/search/?api=1&query=${query}`,
      });
      Linking.openURL(url as string);
    } else {
      Alert.alert('No Location', 'This activity does not have a location set.');
    }
  };

  if (loading) {
    return (
      <ScreenContainer style={styles.container} backgroundColor={colors.background} padded={false}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading activity...</Text>
        </View>
      </ScreenContainer>
    );
  }

  if (error) {
    return (
      <ScreenContainer style={styles.container} backgroundColor={colors.background} padded={false}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <EmptyState
            icon="alert-circle-outline"
            title="Failed to load activity"
            description={error.message || "Something went wrong. Please try again."}
          />
        </View>
      </ScreenContainer>
    );
  }

  if (!item) {
    return (
      <ScreenContainer style={styles.container} backgroundColor={colors.background} padded={false}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.errorContainer}>
          <EmptyState
            icon="calendar-outline"
            title="Activity Not Found"
            description="This activity may have been deleted or doesn't exist."
          />
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer style={styles.container} backgroundColor={colors.background} padded={false}>
      {/* Header */}
      <ScreenHeader
        title={item.title}
        left={null}
        right={(
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={handleEdit}
              style={[styles.headerButton, { backgroundColor: colors.backgroundSecondary }]}
            >
              <Ionicons name="pencil-outline" size={20} color={colors.text} />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleDelete}
              style={[styles.headerButton, { backgroundColor: Colors.error + '15' }]}
            >
              <Ionicons name="trash-outline" size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        )}
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category Badge */}
        <View style={[styles.categoryBadge, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={16} color={config.color} />
          <Text style={[styles.categoryText, { color: config.color }]}>{config.label}</Text>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

        {/* Time & Date */}
        <View style={styles.timeSection}>
          <View style={styles.infoRow}>
            <Ionicons name="calendar-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {item.startTime && formatDate(item.startTime)}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Ionicons name="time-outline" size={20} color={colors.textSecondary} />
            <Text style={[styles.infoText, { color: colors.text }]}>
              {item.startTime && formatTime(item.startTime)}
              {item.endTime && ` - ${formatTime(item.endTime)}`}
            </Text>
          </View>
        </View>

        {/* Location */}
        {item.location && (
          <TouchableOpacity
            style={[styles.locationCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleOpenMap}
          >
            <View style={[styles.locationIcon, { backgroundColor: Colors.primary + '15' }]}>
              <Ionicons name="location" size={24} color={Colors.primary} />
            </View>
            <View style={styles.locationContent}>
              <Text style={[styles.locationLabel, { color: colors.textSecondary }]}>Location</Text>
              <Text style={[styles.locationText, { color: colors.text }]}>{item.location}</Text>
            </View>
            <Ionicons name="navigate-outline" size={24} color={Colors.primary} />
          </TouchableOpacity>
        )}

        {/* Description */}
        {item.description && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Notes</Text>
            <View style={[styles.descriptionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[styles.descriptionText, { color: colors.text }]}>
                {item.description}
              </Text>
            </View>
          </View>
        )}

        {/* Attachments */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Attachments ({attachments.length})
          </Text>
          {attachments.map((attachment) => (
            <View
              key={attachment.id}
              style={[styles.attachmentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.attachmentIcon, { backgroundColor: Colors.primary + '15' }]}>
                <Ionicons 
                  name={attachment.type.includes('image') ? 'image-outline' : 'document-outline'} 
                  size={20} 
                  color={Colors.primary} 
                />
              </View>
              <View style={styles.attachmentContent}>
                <Text style={[styles.attachmentName, { color: colors.text }]} numberOfLines={1}>
                  {attachment.name}
                </Text>
                {attachment.size && (
                  <Text style={[styles.attachmentSize, { color: colors.textMuted }]}>
                    {formatFileSize(attachment.size)}
                  </Text>
                )}
              </View>
              <TouchableOpacity 
                onPress={() => handleRemoveAttachment(attachment.id)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close-circle" size={22} color={Colors.error} />
              </TouchableOpacity>
            </View>
          ))}
          <TouchableOpacity
            style={[styles.attachButton, { borderColor: colors.border }]}
            onPress={handleAddAttachment}
          >
            <Ionicons name="add-outline" size={24} color={colors.textSecondary} />
            <Text style={[styles.attachText, { color: colors.textSecondary }]}>Add attachment</Text>
          </TouchableOpacity>
        </View>

        {/* Comments */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Comments ({comments.length})
          </Text>
          {comments.map((comment) => (
            <View
              key={comment.id}
              style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <View style={[styles.avatar, { backgroundColor: Colors.primary + '20' }]}>
                <Text style={[styles.avatarText, { color: Colors.primary }]}>
                  {comment.userName.charAt(0)}
                </Text>
              </View>
              <View style={styles.commentContent}>
                <View style={styles.commentHeader}>
                  <Text style={[styles.commentAuthor, { color: colors.text }]}>
                    {comment.userName}
                  </Text>
                  <Text style={[styles.commentTime, { color: colors.textMuted }]}>
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <Text style={[styles.commentText, { color: colors.textSecondary }]}>
                  {comment.text}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* Comment Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={[styles.commentInputContainer, { backgroundColor: colors.background, borderColor: colors.border }]}>
          <TextInput
            style={[styles.commentInput, { backgroundColor: colors.inputBackground, color: colors.text }]}
            placeholder="Add a comment..."
            placeholderTextColor={colors.placeholder}
            value={newComment}
            onChangeText={setNewComment}
            multiline
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: Colors.primary }]}
            onPress={handleAddComment}
            disabled={!newComment.trim()}
          >
            <Ionicons name="send" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Edit Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <ScreenContainer style={styles.modalContainer} backgroundColor={colors.background}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setIsEditModalVisible(false)}>
                <Text style={[styles.modalCancel, { color: Colors.primary }]}>Cancel</Text>
              </TouchableOpacity>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Activity</Text>
              <TouchableOpacity onPress={handleSaveEdit} disabled={isSaving}>
                <Text style={[styles.modalSave, { color: isSaving ? colors.textMuted : Colors.primary }]}>
                  {isSaving ? 'Saving...' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent} contentContainerStyle={styles.modalScrollContent}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Title *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={editTitle}
                  onChangeText={setEditTitle}
                  placeholder="Activity title"
                  placeholderTextColor={colors.placeholder}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Location</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }]}
                  value={editLocation}
                  onChangeText={setEditLocation}
                  placeholder="Location or address"
                  placeholderTextColor={colors.placeholder}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.text }]}>Notes</Text>
                <TextInput
                  style={[
                    styles.modalInput, 
                    styles.modalTextArea,
                    { backgroundColor: colors.inputBackground, color: colors.text, borderColor: colors.border }
                  ]}
                  value={editDescription}
                  onChangeText={setEditDescription}
                  placeholder="Add notes or description"
                  placeholderTextColor={colors.placeholder}
                  multiline
                  numberOfLines={4}
                  textAlignVertical="top"
                />
              </View>
            </ScrollView>
          </ScreenContainer>
        </TouchableWithoutFeedback>
      </Modal>
    </ScreenContainer>
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
  headerPlaceholder: {
    width: 40,
    height: 40,
  },
  headerActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  categoryText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.md,
  },
  timeSection: {
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  infoText: {
    fontSize: FontSizes.md,
  },
  locationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.md,
  },
  locationIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationContent: {
    flex: 1,
  },
  locationLabel: {
    fontSize: FontSizes.xs,
    marginBottom: 2,
  },
  locationText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.medium,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.sm,
  },
  descriptionCard: {
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
  },
  descriptionText: {
    fontSize: FontSizes.md,
    lineHeight: 24,
  },
  attachButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    gap: Spacing.sm,
  },
  attachText: {
    fontSize: FontSizes.md,
  },
  commentCard: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  commentContent: {
    flex: 1,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  commentAuthor: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.semibold,
  },
  commentTime: {
    fontSize: FontSizes.xs,
  },
  commentText: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: Spacing.md,
    paddingBottom: Spacing.lg,
    borderTopWidth: 1,
    gap: Spacing.sm,
  },
  commentInput: {
    flex: 1,
    maxHeight: 100,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    fontSize: FontSizes.md,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: FontSizes.md,
  },
  errorContainer: {
    flex: 1,
    paddingHorizontal: Spacing.xl,
  },
  // Attachment styles
  attachmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  attachmentIcon: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachmentContent: {
    flex: 1,
  },
  attachmentName: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  attachmentSize: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  // Modal styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  modalTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.semibold,
  },
  modalCancel: {
    fontSize: FontSizes.md,
  },
  modalSave: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
  },
  modalContent: {
    flex: 1,
  },
  modalScrollContent: {
    padding: Spacing.lg,
    gap: Spacing.lg,
  },
  inputGroup: {
    gap: Spacing.xs,
  },
  inputLabel: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  modalInput: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    fontSize: FontSizes.md,
  },
  modalTextArea: {
    minHeight: 100,
    paddingTop: Spacing.sm,
  },
});
