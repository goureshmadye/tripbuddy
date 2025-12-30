import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomNavigation } from './bottom-navigation';
import { NavItem, SidebarNavigation } from './sidebar-navigation';

interface ResponsiveLayoutProps {
  children: React.ReactNode;
  navItems: NavItem[];
  activeItem: string;
  onItemPress: (key: string) => void;
  headerTitle?: string;
  headerIcon?: keyof typeof import('@expo/vector-icons').Ionicons.glyphMap;
  footerItems?: NavItem[];
}

const SIDEBAR_COLLAPSED_WIDTH = 72;
const BOTTOM_NAV_HEIGHT = 80; // Approximate height including safe area
const MOBILE_TOP_MARGIN = 44; // Standard iOS status bar + some padding

function ResponsiveLayoutContent({
  children,
  navItems,
  activeItem,
  onItemPress,
  headerTitle = 'TripBuddy',
  headerIcon = 'airplane',
  footerItems = [],
}: ResponsiveLayoutProps) {
  const { showSidebar, showBottomNav, isMobile } = useResponsive();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  // Calculate top margin for mobile - use safe area insets or fallback
  const mobileTopPadding = isMobile ? Math.max(insets.top, MOBILE_TOP_MARGIN) : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Sidebar for desktop/large screens */}
      {showSidebar && (
        <SidebarNavigation
          items={navItems}
          activeItem={activeItem}
          onItemPress={onItemPress}
          headerTitle={headerTitle}
          headerIcon={headerIcon}
          footerItems={footerItems}
        />
      )}

      {/* Main Content */}
      <View
        style={[
          styles.content,
          showSidebar && {
            marginLeft: Platform.OS === 'web' ? SIDEBAR_COLLAPSED_WIDTH : 0,
            paddingLeft: Platform.OS === 'web' ? 0 : SIDEBAR_COLLAPSED_WIDTH,
          },
          showBottomNav && { paddingBottom: BOTTOM_NAV_HEIGHT },
          isMobile && { paddingTop: mobileTopPadding },
        ]}
      >
        {children}
      </View>

      {/* Bottom Navigation for mobile */}
      {showBottomNav && (
        <BottomNavigation
          items={navItems}
          activeItem={activeItem}
          onItemPress={onItemPress}
        />
      )}
    </View>
  );
}

export function ResponsiveLayout(props: ResponsiveLayoutProps) {
  return (
    <SafeAreaProvider>
      <ResponsiveLayoutContent {...props} />
    </SafeAreaProvider>
  );
}

// Index export for navigation components
export { BottomNavigation } from './bottom-navigation';
export { NavItem, SidebarNavigation } from './sidebar-navigation';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  content: {
    flex: 1,
  },
});
