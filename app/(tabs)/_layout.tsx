import { NavItem, ResponsiveLayout } from '@/components/navigation';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import { Slot, useRouter, useSegments } from 'expo-router';
import React, { useMemo } from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';

// Define navigation items for the app
const NAV_ITEMS: NavItem[] = [
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
    badge: 3,
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
  const colors = isDark ? Colors.dark : Colors.light;
  const { showSidebar } = useResponsive();

  // Determine active tab from segments
  const activeItem = useMemo(() => {
    const tabSegment = segments[1]; // e.g., ['(tabs)', 'index']
    return tabSegment || 'index';
  }, [segments]);

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
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
      <ResponsiveLayout
        navItems={NAV_ITEMS}
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
