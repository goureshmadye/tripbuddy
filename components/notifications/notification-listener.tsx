import { useToast } from '@/components/ui/toast';
import { useAuth } from '@/hooks/use-auth';
import { subscribeToNotifications } from '@/services/notifications';
import { Notification } from '@/types/database';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

/**
 * Component that listens for new notifications and shows toast popups.
 * This should be placed at the root of the app (e.g., in _layout.tsx).
 */
export function NotificationListener() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  
  // Track previously seen notification IDs to detect new ones
  const seenNotificationIds = useRef<Set<string>>(new Set());
  const isInitialLoad = useRef(true);

  useEffect(() => {
    if (!user?.id) {
      seenNotificationIds.current.clear();
      isInitialLoad.current = true;
      return;
    }

    const unsubscribe = subscribeToNotifications(
      user.id,
      (notifications: Notification[]) => {
        // On initial load, just record all existing notification IDs
        if (isInitialLoad.current) {
          notifications.forEach((n) => seenNotificationIds.current.add(n.id));
          isInitialLoad.current = false;
          return;
        }

        // Find new notifications that we haven't seen yet
        const newNotifications = notifications.filter(
          (n) => !seenNotificationIds.current.has(n.id) && !n.read
        );

        // Show toast for each new notification
        newNotifications.forEach((notification) => {
          seenNotificationIds.current.add(notification.id);
          
          showToast({
            type: 'notification',
            title: notification.title,
            message: notification.message,
            notificationType: notification.type,
            duration: 5000,
            onPress: () => {
              // Navigate based on notification type
              handleNotificationNavigation(notification);
            },
          });
        });

        // Update seen IDs with current notifications
        notifications.forEach((n) => seenNotificationIds.current.add(n.id));
      },
      (error) => {
        console.error('Notification listener error:', error);
      }
    );

    return () => {
      unsubscribe();
    };
  }, [user?.id, showToast, router]);

  const handleNotificationNavigation = (notification: Notification) => {
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
        // Navigate to notifications screen to handle invitation
        router.push('/(tabs)/notifications');
        break;
      
      case 'invitation_accepted':
      case 'collaborator_role_changed':
        if (notification.tripId) {
          router.push(`/trips/${notification.tripId}/collaborators`);
        }
        break;
      
      default:
        // Default to notifications screen
        router.push('/(tabs)/notifications');
        break;
    }
  };

  // This component doesn't render anything
  return null;
}
