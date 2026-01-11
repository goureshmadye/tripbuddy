import { useScreenPadding } from '@/components/screen-container';
import { BorderRadius, Colors, ComponentSizes, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
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
import { NavItem } from './sidebar-navigation';

interface BottomNavigationProps {
  items: NavItem[];
  activeItem: string;
  onItemPress: (key: string) => void;
  showLabels?: boolean;
}

const TAB_HEIGHT = ComponentSizes.tabBarHeight;
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
  const { bottom } = useScreenPadding();

  const handlePress = (key: string) => {
    // Haptic feedback on native platforms
    if (Platform.OS !== 'web') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    onItemPress(key);
  };

  // Use blur on native, fallback to semi-transparent on web
  // Higher intensity for more pronounced glassmorphism effect
  const blurIntensity = isDark ? 100 : 80;
  const blurTint = isDark ? 'dark' : 'light';

  return (
    <View
        style={[
        styles.container,
        {
          paddingBottom: bottom > 0 ? bottom : Spacing.sm,
        },
      ]}
    >
      {/* Glassmorphism background - iOS style */}
      {Platform.OS !== 'web' ? (
        <BlurView
          intensity={blurIntensity}
          tint={blurTint}
          style={[StyleSheet.absoluteFill, styles.blurBackground]}
        />
      ) : (
        <View
          style={[
            StyleSheet.absoluteFill,
            styles.blurBackground,
            {
              backgroundColor: isDark 
                ? 'rgba(15, 23, 42, 0.75)' 
                : 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(24px)',
              // @ts-ignore
              WebkitBackdropFilter: 'blur(24px)',
            },
          ]}
        />
      )}

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
            size={ComponentSizes.iconLarge}
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
    paddingTop: 0,
    // Transparent background is essential for glassmorphism effect
    backgroundColor: 'transparent',
  },
  blurBackground: {
    // BlurView handles the glass effect
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
