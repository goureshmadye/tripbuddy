import LoadingScreen from '@/components/loading-screen';
import { NavItem, ResponsiveLayout } from '@/components/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useUnreadNotificationCount } from '@/hooks/use-notifications';
import { useResponsive } from '@/hooks/use-responsive';
import { Redirect, Slot, useRouter, useSegments } from 'expo-router';
import React, { useMemo } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

// Base navigation items (badge will be added dynamically)
const BASE_NAV_ITEMS: Omit<NavItem, 'badge'>[] = [
  {
    key: 'index',
    label: 'My Trips',
    icon: 'airplane-outline',
    iconFilled: 'airplane',
  },
  {
    key: 'notifications',
    label: 'Notifications',
    icon: 'notifications-outline',
    iconFilled: 'notifications',
  },
  {
    key: 'profile',
    label: 'Profile',
    icon: 'person-outline',
    iconFilled: 'person',
  },
];

const FOOTER_ITEMS: NavItem[] = [
  {
    key: 'settings',
    label: 'Settings',
    icon: 'settings-outline',
    iconFilled: 'settings',
  },
  {
    key: 'help',
    label: 'Help & Support',
    icon: 'help-circle-outline',
    iconFilled: 'help-circle',
  },
];

export default function TabLayout() {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showSidebar } = useResponsive();
  const unreadCount = useUnreadNotificationCount();
  
  // Auth guard - redirect unauthenticated users to auth
  const { firebaseUser, loading, isGuestMode, isWalkthroughComplete } = useAuth();

  // Build nav items with dynamic badge count - MUST be before any conditional returns
  const navItems: NavItem[] = useMemo(() => {
    return BASE_NAV_ITEMS.map((item) => ({
      ...item,
      badge: item.key === 'notifications' && unreadCount > 0 ? unreadCount : undefined,
    }));
  }, [unreadCount]);

  // Determine active tab from segments - MUST be before any conditional returns
  const activeItem = useMemo(() => {
    const tabSegment = segments[1]; // e.g., ['(tabs)', 'index']
    return tabSegment || 'index';
  }, [segments]);

  // Show loading while checking auth state
  if (loading) {
    return <LoadingScreen message="Loading..." />;
  }

  // If user is not authenticated and not in guest mode, redirect to auth
  if (!firebaseUser && !isGuestMode) {
    // If walkthrough not complete, go to walkthrough first
    if (!isWalkthroughComplete) {
      return <Redirect href="/auth/walkthrough" />;
    }
    // Otherwise go to auth landing page
    return <Redirect href="/auth" />;
  }

  const handleItemPress = (key: string) => {
    // Handle navigation based on key
    switch (key) {
      case 'index':
        router.push('/(tabs)');
        break;
      case 'notifications':
        router.push('/(tabs)/notifications');
        break;
      case 'profile':
        router.push('/(tabs)/profile');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'help':
        // TODO: Create help screen
        break;
      default:
        break;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ResponsiveLayout
        navItems={navItems}
        activeItem={activeItem}
        onItemPress={handleItemPress}
        headerTitle="TripBuddy"
        headerIcon="airplane"
        footerItems={showSidebar ? FOOTER_ITEMS : []}
      >
        <Slot />
      </ResponsiveLayout>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
