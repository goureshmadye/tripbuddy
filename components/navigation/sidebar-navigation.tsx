import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
    Animated,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View
} from 'react-native';

export interface NavItem {
  key: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  iconFilled?: keyof typeof Ionicons.glyphMap;
  badge?: number;
}

interface SidebarNavigationProps {
  items: NavItem[];
  activeItem: string;
  onItemPress: (key: string) => void;
  headerTitle?: string;
  headerIcon?: keyof typeof Ionicons.glyphMap;
  footerItems?: NavItem[];
}

const SIDEBAR_EXPANDED_WIDTH = 260;
const SIDEBAR_COLLAPSED_WIDTH = 72;
const ANIMATION_DURATION = 200;

export function SidebarNavigation({
  items,
  activeItem,
  onItemPress,
  headerTitle = 'TripBuddy',
  headerIcon = 'airplane',
  footerItems = [],
}: SidebarNavigationProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  // Hover state for expand/collapse
  const [isHovered, setIsHovered] = useState(false);
  const collapsed = !isHovered;

  const widthAnim = useRef(new Animated.Value(SIDEBAR_COLLAPSED_WIDTH)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [showLabels, setShowLabels] = useState(false);

  useEffect(() => {
    if (collapsed) {
      // First fade out labels, then collapse
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: ANIMATION_DURATION / 2,
        useNativeDriver: true,
      }).start(() => {
        setShowLabels(false);
      });

      Animated.timing(widthAnim, {
        toValue: SIDEBAR_COLLAPSED_WIDTH,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }).start();
    } else {
      // First expand, then fade in labels
      Animated.timing(widthAnim, {
        toValue: SIDEBAR_EXPANDED_WIDTH,
        duration: ANIMATION_DURATION,
        useNativeDriver: false,
      }).start();

      setTimeout(() => {
        setShowLabels(true);
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: ANIMATION_DURATION / 2,
          useNativeDriver: true,
        }).start();
      }, ANIMATION_DURATION / 2);
    }
  }, [collapsed, widthAnim, opacityAnim]);

  const renderNavItem = (item: NavItem, isFooter = false) => {
    const isActive = activeItem === item.key;
    const iconName = isActive && item.iconFilled ? item.iconFilled : item.icon;

    return (
      <Pressable
        key={item.key}
        onPress={() => onItemPress(item.key)}
        style={({ pressed, hovered }) => [
          styles.navItem,
          {
            backgroundColor: isActive
              ? Colors.primary + '15'
              : hovered
              ? colors.backgroundSecondary
              : 'transparent',
            opacity: pressed ? 0.8 : 1,
          },
          collapsed && styles.navItemCollapsed,
        ]}
      >
        <View style={styles.navItemContent}>
          <View style={[
            styles.iconContainer,
            isActive && { backgroundColor: Colors.primary + '20' },
          ]}>
            <Ionicons
              name={iconName}
              size={22}
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
          
          {showLabels && (
            <Animated.Text
              style={[
                styles.navLabel,
                {
                  color: isActive ? Colors.primary : colors.text,
                  fontWeight: isActive ? FontWeights.semibold : FontWeights.medium,
                  opacity: opacityAnim,
                },
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Animated.Text>
          )}
        </View>

        {isActive && !collapsed && (
          <View style={[styles.activeIndicator, { backgroundColor: Colors.primary }]} />
        )}
      </Pressable>
    );
  };

  // Web hover handlers - these props are valid on web but not in React Native types
  const hoverProps = Platform.OS === 'web' ? {
    onMouseEnter: () => setIsHovered(true),
    onMouseLeave: () => setIsHovered(false),
  } : {};

  return (
    <View
      {...hoverProps}
      style={styles.hoverContainer}
    >
      <Animated.View
        style={[
          styles.container,
          {
            width: widthAnim,
            backgroundColor: colors.card,
            borderRightColor: colors.border,
          },
          Shadows.sm,
        ]}
      >
      {/* Header */}
      <View style={[styles.header, collapsed && styles.headerCollapsed]}>
        <View style={[styles.logoContainer, { backgroundColor: Colors.primary + '15' }]}>
          <Ionicons name={headerIcon} size={24} color={Colors.primary} />
        </View>
        {showLabels && (
          <Animated.Text
            style={[
              styles.headerTitle,
              { color: colors.text, opacity: opacityAnim },
            ]}
            numberOfLines={1}
          >
            {headerTitle}
          </Animated.Text>
        )}
      </View>

      {/* Divider */}
      <View style={[styles.divider, { backgroundColor: colors.border }]} />

      {/* Navigation Items */}
      <View style={styles.navSection}>
        {items.map((item) => renderNavItem(item))}
      </View>

      {/* Spacer */}
      <View style={styles.spacer} />

      {/* Footer Items */}
      {footerItems.length > 0 && (
        <>
          <View style={[styles.divider, { backgroundColor: colors.border }]} />
          <View style={styles.footerSection}>
            {footerItems.map((item) => renderNavItem(item, true))}
          </View>
        </>
      )}

      {/* Collapse indicator at bottom */}
      {collapsed && (
        <View style={[styles.collapseHint, { borderTopColor: colors.border }]}>
          <Ionicons name="ellipsis-horizontal" size={16} color={colors.textMuted} />
        </View>
      )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  hoverContainer: {
    height: '100%',
    ...(Platform.OS === 'web' ? { position: 'fixed' as unknown as undefined, left: 0, top: 0, zIndex: 100 } : {}),
  },
  container: {
    height: '100%',
    borderRightWidth: 1,
    paddingVertical: Spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  headerCollapsed: {
    justifyContent: 'center',
  },
  logoContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
    flex: 1,
  },
  divider: {
    height: 1,
    marginHorizontal: Spacing.md,
    marginVertical: Spacing.sm,
  },
  navSection: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
  },
  footerSection: {
    paddingHorizontal: Spacing.sm,
    gap: Spacing.xs,
    paddingBottom: Spacing.sm,
  },
  navItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.lg,
    minHeight: 44,
  },
  navItemCollapsed: {
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
  },
  navItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  navLabel: {
    fontSize: FontSizes.md,
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: Colors.error,
    borderRadius: BorderRadius.full,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: FontWeights.bold,
  },
  activeIndicator: {
    width: 4,
    height: 24,
    borderRadius: BorderRadius.full,
    marginLeft: Spacing.sm,
  },
  spacer: {
    flex: 1,
  },
  collapseHint: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: 1,
  },
});
