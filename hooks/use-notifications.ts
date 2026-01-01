import {
    deleteAllNotifications,
    deleteNotification,
    getUserNotifications,
    markAllNotificationsAsRead,
    markNotificationAsRead,
    subscribeToNotifications,
    subscribeToUnreadCount,
} from '@/services/notifications';
import { Notification } from '@/types/database';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';

interface UseNotificationsResult {
  notifications: Notification[];
  unreadCount: number;
  loading: boolean;
  error: Error | null;
  refreshing: boolean;
  // Actions
  refresh: () => Promise<void>;
  markAsRead: (notificationId: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  deleteOne: (notificationId: string) => Promise<void>;
  deleteAll: () => Promise<void>;
}

export function useNotifications(): UseNotificationsResult {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Subscribe to real-time notifications
  useEffect(() => {
    if (!user?.id) {
      setNotifications([]);
      setUnreadCount(0);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Subscribe to notifications list
    const unsubscribeNotifications = subscribeToNotifications(
      user.id,
      (newNotifications) => {
        setNotifications(newNotifications);
        setLoading(false);
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    // Subscribe to unread count
    const unsubscribeCount = subscribeToUnreadCount(
      user.id,
      (count) => {
        setUnreadCount(count);
      },
      (err) => {
        console.error('Error subscribing to unread count:', err);
      }
    );

    return () => {
      unsubscribeNotifications();
      unsubscribeCount();
    };
  }, [user?.id]);

  // Manual refresh
  const refresh = useCallback(async () => {
    if (!user?.id) return;
    
    setRefreshing(true);
    try {
      const data = await getUserNotifications(user.id);
      setNotifications(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to refresh notifications'));
    } finally {
      setRefreshing(false);
    }
  }, [user?.id]);

  // Mark single notification as read
  const markAsRead = useCallback(async (notificationId: string) => {
    try {
      await markNotificationAsRead(notificationId);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId ? { ...n, read: true, readAt: new Date() } : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Error marking notification as read:', err);
      throw err;
    }
  }, []);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await markAllNotificationsAsRead(user.id);
      // Optimistic update
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read: true, readAt: new Date() }))
      );
      setUnreadCount(0);
    } catch (err) {
      console.error('Error marking all notifications as read:', err);
      throw err;
    }
  }, [user?.id]);

  // Delete single notification
  const deleteOne = useCallback(async (notificationId: string) => {
    try {
      const notification = notifications.find((n) => n.id === notificationId);
      await deleteNotification(notificationId);
      // Optimistic update
      setNotifications((prev) => prev.filter((n) => n.id !== notificationId));
      if (notification && !notification.read) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (err) {
      console.error('Error deleting notification:', err);
      throw err;
    }
  }, [notifications]);

  // Delete all notifications
  const deleteAll = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      await deleteAllNotifications(user.id);
      // Optimistic update
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {
      console.error('Error deleting all notifications:', err);
      throw err;
    }
  }, [user?.id]);

  return {
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
  };
}

// Hook to get just the unread count (lighter weight)
export function useUnreadNotificationCount(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!user?.id) {
      setCount(0);
      return;
    }

    const unsubscribe = subscribeToUnreadCount(
      user.id,
      (newCount) => {
        setCount(newCount);
      }
    );

    return () => unsubscribe();
  }, [user?.id]);

  return count;
}
