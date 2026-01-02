import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useResponsive } from '@/hooks/use-responsive';
import React from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
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

      {/* Main Content - content scrolls behind bottom nav for glassmorphism */}
      <View
        style={[
          styles.content,
          showSidebar && {
            marginLeft: Platform.OS === 'web' ? SIDEBAR_COLLAPSED_WIDTH : 0,
            paddingLeft: Platform.OS === 'web' ? 0 : SIDEBAR_COLLAPSED_WIDTH,
          },
          // Note: paddingBottom is handled by individual screens, not here
          // This allows content to scroll behind the translucent bottom nav
          // Rely on ScreenContainer for top padding
          isMobile && {  },
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
    // Content extends behind bottom nav for glassmorphism effect
  },
});
