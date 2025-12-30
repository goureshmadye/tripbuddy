import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavItem } from './sidebar-navigation';

interface BottomNavigationProps {
  items: NavItem[];
  activeItem: string;
  onItemPress: (key: string) => void;
  showLabels?: boolean;
}

const TAB_HEIGHT = 65;
const ANIMATION_DURATION = 150;

export function BottomNavigation({
  items,
  activeItem,
  onItemPress,
  showLabels = true,
}: BottomNavigationProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const handlePress = (key: string) => {
    // Haptic feedback on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onItemPress(key);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.card,
          borderTopColor: colors.border,
          paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.sm,
        },
        Shadows.lg,
      ]}
    >
      <View style={styles.tabsContainer}>
        {items.map((item) => (
          <TabItem
            key={item.key}
            item={item}
            isActive={activeItem === item.key}
            onPress={() => handlePress(item.key)}
            colors={colors}
            showLabel={showLabels}
          />
        ))}
      </View>
    </View>
  );
}

interface TabItemProps {
  item: NavItem;
  isActive: boolean;
  onPress: () => void;
  colors: typeof Colors.light;
  showLabel: boolean;
}

function TabItem({ item, isActive, onPress, colors, showLabel }: TabItemProps) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const translateYAnim = useRef(new Animated.Value(0)).current;
  
  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isActive ? 1.1 : 1,
        friction: 8,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: isActive ? -2 : 0,
        duration: ANIMATION_DURATION,
        useNativeDriver: true,
      }),
    ]).start();
  }, [isActive, scaleAnim, translateYAnim]);

  const iconName = isActive && item.iconFilled ? item.iconFilled : item.icon;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.tabItem,
        { opacity: pressed ? 0.7 : 1 },
      ]}
      accessibilityRole="tab"
      accessibilityState={{ selected: isActive }}
      accessibilityLabel={item.label}
    >
      <Animated.View
        style={[
          styles.tabContent,
          {
            transform: [
              { scale: scaleAnim },
              { translateY: translateYAnim },
            ],
          },
        ]}
      >
        <View style={styles.iconWrapper}>
          <Ionicons
            name={iconName}
            size={24}
            color={isActive ? Colors.primary : colors.textSecondary}
          />
          {item.badge && item.badge > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.badge > 99 ? '99+' : item.badge}
              </Text>
            </View>
          )}
        </View>
        
        {showLabel && (
          <Text
            style={[
              styles.tabLabel,
              {
                color: isActive ? Colors.primary : colors.textSecondary,
                fontWeight: isActive ? FontWeights.semibold : FontWeights.medium,
              },
            ]}
            numberOfLines={1}
          >
            {item.label}
          </Text>
        )}
      </Animated.View>

      {/* Active indicator dot */}
      {isActive && (
        <View style={[styles.activeIndicator, { backgroundColor: Colors.primary }]} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    borderTopWidth: 1,
    paddingTop: Spacing.sm,
  },
  tabsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    height: TAB_HEIGHT,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xs,
  },
  tabContent: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapper: {
    position: 'relative',
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -6,
    right: -10,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: FontWeights.bold,
  },
  tabLabel: {
    fontSize: FontSizes.xs,
    marginTop: 4,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -Spacing.xs,
    width: 4,
    height: 4,
    borderRadius: BorderRadius.full,
  },
});
