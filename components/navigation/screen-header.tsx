import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { ReactNode } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface ScreenHeaderProps {
  title?: string;
  left?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  showBack?: boolean;
}

export function ScreenHeader({ title, left, right, onBack, showBack = true }: ScreenHeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  return (
    <View style={[styles.header, { backgroundColor: colors.background }]}>
      <View style={styles.side}>{left ?? (showBack ? (
        <TouchableOpacity
          onPress={onBack}
          style={[styles.backButton, { backgroundColor: colors.backgroundSecondary }]}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
      ) : null)}</View>

      <View style={styles.center}>
        {title ? <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>{title}</Text> : null}
      </View>

      <View style={styles.side}>{right}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.screenPadding,
    // Top spacing is handled by ScreenContainer (safe area + Documents reference)
    paddingTop: 0,
    paddingBottom: Spacing.sm,
  },
  side: {
    width: 56,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default ScreenHeader;
