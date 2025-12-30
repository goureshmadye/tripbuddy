import { EmptyState } from '@/components/ui/empty-state';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
    RefreshControl,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';

interface Notification {
  id: string;
  type: 'trip_invite' | 'expense_added' | 'itinerary_update' | 'reminder' | 'system';
  title: string;
  message: string;
  time: string;
  read: boolean;
  tripId?: string;
}

const getNotificationIcon = (type: Notification['type']): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case 'trip_invite':
      return 'person-add-outline';
    case 'expense_added':
      return 'wallet-outline';
    case 'itinerary_update':
      return 'calendar-outline';
    case 'reminder':
      return 'alarm-outline';
    case 'system':
      return 'information-circle-outline';
    default:
      return 'notifications-outline';
  }
};

const getNotificationColor = (type: Notification['type']): string => {
  switch (type) {
    case 'trip_invite':
      return Colors.primary;
    case 'expense_added':
      return Colors.secondary;
    case 'itinerary_update':
      return Colors.accent;
    case 'reminder':
      return Colors.warning;
    case 'system':
      return Colors.info;
    default:
      return Colors.primary;
  }
};

export default function NotificationsScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleRefresh = async () => {
    setRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleMarkAllRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleNotificationPress = (notification: Notification) => {
    // Mark as read
    setNotifications(notifications.map(n => 
      n.id === notification.id ? { ...n, read: true } : n
    ));
    // TODO: Navigate to relevant screen based on type
  };

  const handleClearAll = () => {
    setNotifications([]);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
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
              <TouchableOpacity onPress={handleMarkAllRead} style={styles.headerButton}>
                <Text style={[styles.headerButtonText, { color: Colors.primary }]}>
                  Mark all read
                </Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity onPress={handleClearAll} style={styles.headerButton}>
              <Ionicons name="trash-outline" size={20} color={colors.textSecondary} />
            </TouchableOpacity>
          </View>
        )}
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
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
            {notifications.map((notification) => {
              const iconColor = getNotificationColor(notification.type);
              return (
                <TouchableOpacity
                  key={notification.id}
                  style={[
                    styles.notificationItem,
                    { 
                      backgroundColor: notification.read ? colors.card : Colors.primary + '08',
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleNotificationPress(notification)}
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
                          }
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
                    <Text style={[styles.notificationTime, { color: colors.textMuted }]}>
                      {notification.time}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    alignItems: 'flex-start',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  headerTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: FontWeights.bold,
  },
  unreadCount: {
    fontSize: FontSizes.sm,
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
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  notificationsList: {
    gap: Spacing.sm,
  },
  notificationItem: {
    flexDirection: 'row',
    padding: Spacing.md,
    borderRadius: BorderRadius.lg,
    borderWidth: 1,
    gap: Spacing.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.lg,
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
    fontSize: FontSizes.md,
    flex: 1,
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  notificationMessage: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: 4,
  },
  notificationTime: {
    fontSize: FontSizes.xs,
  },
});
