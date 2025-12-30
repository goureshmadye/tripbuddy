import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useItineraryItem } from '@/hooks/use-trips';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

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
  const { id, itemId } = useLocalSearchParams<{ id: string; itemId: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { item, loading, error } = useItineraryItem(itemId);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');

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
    // Navigate to edit screen
    Alert.alert('Edit', 'Edit functionality coming soon!');
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Activity',
      'Are you sure you want to delete this activity?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => router.back() },
      ]
    );
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
    if (item?.latitude && item?.longitude) {
      // Open in maps app
      Alert.alert('Map', 'Opening in Maps app...');
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <View style={styles.headerPlaceholder} />
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading activity...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
      </SafeAreaView>
    );
  }

  if (!item) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
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
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerPlaceholder} />
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
      </View>

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
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Attachments</Text>
          <TouchableOpacity
            style={[styles.attachButton, { borderColor: colors.border }]}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
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
});
