import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

interface ScreenContainerProps {
  children: ReactNode;
  /** Additional styles for the container */
  style?: ViewStyle;
  /** Whether to add horizontal padding (default: true) */
  padded?: boolean;
  /** Safe area edges to respect (default: ['top', 'bottom']) */
  edges?: Edge[];
  /** Background color override */
  backgroundColor?: string;
  /** Whether to use flex: 1 (default: true) */
  flex?: boolean;
  /** Whether this screen has a bottom tab bar (adds extra padding) */
  hasBottomNav?: boolean;
  /** Custom bottom padding to avoid overlap with UI elements */
  bottomPadding?: number;
}

/**
 * ScreenContainer - A consistent wrapper for all screens
 * Provides safe area insets, consistent margins, and theming
 * Handles notches, status bars, and bottom navigation overlap
 */
export function ScreenContainer({
  children,
  style,
  padded = false,
  edges = ['top', 'bottom'],
  backgroundColor,
  flex = true,
  hasBottomNav = false,
  bottomPadding,
}: ScreenContainerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const bgColor = backgroundColor ?? colors.background;
  
  // Calculate additional bottom padding for bottom navigation
  // This prevents content from being hidden behind the tab bar
  const additionalBottomPadding = bottomPadding ?? (hasBottomNav ? 80 : 0);

  // Compute top padding as safe-area inset + documents page reference spacing
  // Use My Trips reference spacing for top padding (safe-area inset + reference spacing)
  const computedTopPadding = insets.top + Spacing.md;

  return (
    <SafeAreaView
      style={[
        styles.safeArea,
        flex && styles.flex,
        { backgroundColor: bgColor },
      ]}
      edges={edges}
    >
      <View
        style={[
          styles.container,
          flex && styles.flex,
          // Apply consistent top margin spacing across screens (Documents page reference)
          { paddingTop: computedTopPadding },
          padded && styles.padded,
          additionalBottomPadding > 0 && { paddingBottom: additionalBottomPadding },
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

/**
 * ScrollableScreenContainer - For screens with scrollable content
 * Automatically handles safe areas and provides consistent padding
 */
export function useScreenPadding(options?: { hasBottomNav?: boolean }) {
  const insets = useSafeAreaInsets();
  const bottomNavHeight = 80; // Standard bottom nav height
  const topMargin = insets.top + Spacing.md;

  return {
    top: insets.top,
    // Use Documents page top margin as consistent top spacing (includes safe area)
    topMargin,
    bottom: insets.bottom + (options?.hasBottomNav ? bottomNavHeight : 0),
    left: insets.left || Spacing.screenPadding,
    right: insets.right || Spacing.screenPadding,
    horizontal: Spacing.screenPadding,
    // Content insets for ScrollView/FlatList
    contentInsets: {
      top: topMargin,
      bottom: insets.bottom + (options?.hasBottomNav ? bottomNavHeight : Spacing.lg),
      left: 0,
      right: 0,
    },
  };
}

const styles = StyleSheet.create({
  safeArea: {
    // SafeAreaView handles insets automatically - no extra margins needed
  },
  flex: {
    flex: 1,
  },
  container: {
    // Base container styles
  },
  padded: {
    paddingHorizontal: Spacing.screenPadding,
  },
});

export default ScreenContainer;
