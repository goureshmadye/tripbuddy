import { ScreenContainer, useScreenPadding } from '@/components/screen-container';
import { EmptyState } from '@/components/ui/empty-state';
import { SkeletonListItem } from '@/components/ui/skeleton';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useNotifications } from '@/hooks/use-notifications';
import { Notification, NotificationType } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

// Bottom navigation height for proper content padding
const BOTTOM_NAV_HEIGHT = 80;

const getNotificationIcon = (type: NotificationType): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'collaborator_added':
    case 'invitation_accepted':
      return 'person-add-outline';
    case 'collaborator_removed':
      return 'person-remove-outline';
    case 'collaborator_role_changed':
      return 'shield-outline';
    case 'trip_invitation':
      return 'mail-outline';
    case 'expense_added':
    case 'expense_updated':
      return 'wallet-outline';
    case 'itinerary_added':
    case 'itinerary_updated':
      return 'calendar-outline';
    case 'trip_updated':
      return 'airplane-outline';
    case 'reminder':
      return 'alarm-outline';
    case 'system':
    default:
      return 'information-circle-outline';
  }
};

const getNotificationColor = (type: NotificationType): string => {
  switch (type) {
    case 'collaborator_added':
    case 'invitation_accepted':
    case 'trip_invitation':
      return Colors.primary;
    case 'collaborator_removed':
      return Colors.error;
    case 'collaborator_role_changed':
      return '#8B5CF6';
    case 'expense_added':
    case 'expense_updated':
      return Colors.secondary;
    case 'itinerary_added':
    case 'itinerary_updated':
      return Colors.accent;
    case 'trip_updated':
      return Colors.info;
    case 'reminder':
      return Colors.warning;
    case 'system':
    default:
      return Colors.info;
  }
};

const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

interface NotificationItemProps {
  notification: Notification;
  colors: typeof Colors.light;
  onPress: (notification: Notification) => void;
  onDelete: (id: string) => void;
}

function NotificationItem({ notification, colors, onPress, onDelete }: NotificationItemProps) {
  const iconColor = getNotificationColor(notification.type);
  
  return (
    <Animated.View
      entering={FadeIn.duration(200)}
      exiting={FadeOut.duration(150)}
      layout={Layout.springify()}
    >
      <TouchableOpacity
        style={[
          styles.notificationItem,
          {
            backgroundColor: notification.read ? colors.card : Colors.primary + '08',
            borderColor: colors.border,
          },
        ]}
        onPress={() => onPress(notification)}
        activeOpacity={0.7}
      >
        <View style={[styles.iconContainer, { backgroundColor: iconColor + '15' }]}>
          <Ionicons
            name={getNotificationIcon(notification.type)}
            size={22}
            color={iconColor}
          />
        </View>
        
        <View style={styles.notificationContent}>
          <View style={styles.notificationHeader}>
            <Text
              style={[
                styles.notificationTitle,
                {
                  color: colors.text,
                  fontWeight: notification.read ? FontWeights.medium : FontWeights.semibold,
                },
              ]}
              numberOfLines={1}
            >
              {notification.title}
            </Text>
            {!notification.read && (
              <View style={[styles.unreadDot, { backgroundColor: Colors.primary }]} />
            )}
          </View>
          
          <Text
            style={[styles.notificationMessage, { color: colors.textSecondary }]}
            numberOfLines={2}
          >
            {notification.message}
          </Text>
          
          <View style={styles.notificationFooter}>
            <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
              {formatTimeAgo(notification.createdAt)}
            </Text>
            {notification.actorName && (
              <Text style={[styles.actorName, { color: colors.textMuted }]}>
                • {notification.actorName}
              </Text>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(notification.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </TouchableOpacity>
      </TouchableOpacity>
    </Animated.View>
  );
}

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { bottom } = useScreenPadding({ hasBottomNav: true });

  // Calculate bottom padding for scroll content
  const bottomPadding = Math.max(bottom, Spacing.lg) + BOTTOM_NAV_HEIGHT;

  const {
    notifications,
    unreadCount,
    loading,
    error,
    refreshing,
    refresh,
    markAsRead,
    markAllAsRead,
    deleteOne,
    deleteAll,
  } = useNotifications();

  const handleNotificationPress = useCallback(async (notification: Notification) => {
    if (!notification.read) {
      await markAsRead(notification.id);
    }

    switch (notification.type) {
      case 'collaborator_added':
      case 'trip_updated':
        if (notification.tripId) {
          router.push(`/trips/${notification.tripId}`);
        }
        break;

      case 'expense_added':
      case 'expense_updated':
        if (notification.tripId) {
          router.push(`/trips/${notification.tripId}/expenses`);
        }
        break;

      case 'itinerary_added':
      case 'itinerary_updated':
        if (notification.tripId && notification.itineraryId) {
          router.push(`/trips/${notification.tripId}/itinerary/${notification.itineraryId}`);
        } else if (notification.tripId) {
          router.push(`/trips/${notification.tripId}/itinerary`);
        }
        break;

      case 'trip_invitation':
        if (notification.tripId) {
          router.push(`/trips/${notification.tripId}`);
        }
        break;

      case 'invitation_accepted':
      case 'collaborator_role_changed':
        if (notification.tripId) {
          router.push(`/trips/${notification.tripId}/collaborators`);
        }
        break;

      default:
        break;
    }
  }, [router, markAsRead]);

  const handleDeleteNotification = useCallback(async (id: string) => {
    try {
      await deleteOne(id);
    } catch (err) {
      console.error('Failed to delete notification:', err);
    }
  }, [deleteOne]);

  if (loading && notifications.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        </View>
        <View style={{ paddingHorizontal: Spacing.screenPadding, gap: Spacing.sm }}>
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
          <SkeletonListItem />
        </View>
      </ScreenContainer>
    );
  }

  if (error && notifications.length === 0) {
    return (
      <ScreenContainer>
        <View style={styles.header}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
        </View>
        <EmptyState
          icon="alert-circle-outline"
          title="Unable to load notifications"
          description={error.message || 'Please check your connection and try again.'}
          actionLabel="Retry"
          onAction={refresh}
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Notifications</Text>
          {unreadCount > 0 && (
            <Text style={[styles.unreadCount, { color: colors.textSecondary }]}>
              {unreadCount} unread
            </Text>
          )}
        </View>
        {notifications.length > 0 && (
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity onPress={markAllAsRead} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, { color: Colors.primary }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={deleteAll} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor={Colors.primary}
          />
        }
      >
        {notifications.length === 0 ? (
          <EmptyState
            icon="notifications-off-outline"
            title="No notifications"
            description="You're all caught up! We'll notify you when something happens."
          />
        ) : (
          <View style={styles.notificationsList}>
            {notifications.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                colors={colors}
                onPress={handleNotificationPress}
                onDelete={handleDeleteNotification}
              />
            ))}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.screenPadding,
    paddingTop: 0,
    paddingBottom: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
  },
  unreadCount: {
    fontSize: FontSizes.bodySmall,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerButton: {
    padding: Spacing.xs,
  },
  headerButtonText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    // Bottom padding is applied dynamically via bottomPadding
  },
  notificationsList: {
    gap: Spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationContent: {
    flex: 1,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  notificationTitle: {
    fontSize: FontSizes.body,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  notificationMessage: {
    fontSize: FontSizes.bodySmall,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationFooter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  notificationTime: {
    fontSize: FontSizes.caption,
  },
  actorName: {
    fontSize: FontSizes.caption,
    marginLeft: 4,
  },
  deleteButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});
