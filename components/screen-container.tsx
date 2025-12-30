import { Colors, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { ReactNode } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';

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
}

/**
 * ScreenContainer - A consistent wrapper for all screens
 * Provides safe area insets, consistent margins, and theming
 */
export function ScreenContainer({
  children,
  style,
  padded = false,
  edges = ['top', 'bottom'],
  backgroundColor,
  flex = true,
}: ScreenContainerProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const bgColor = backgroundColor ?? colors.background;

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
          padded && styles.padded,
          style,
        ]}
      >
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    // Add top and bottom margin for all screens
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  flex: {
    flex: 1,
  },
  container: {
    // Base container styles
  },
  padded: {
    paddingHorizontal: Spacing.lg,
  },
});

export default ScreenContainer;
