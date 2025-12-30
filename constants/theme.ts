/**
 * TripBuddy Theme Constants
 * Colors, Fonts, Spacing, and Design Tokens
 */

import { Platform } from 'react-native';

// Brand Colors
const primary = '#2563EB'; // Blue
const primaryLight = '#3B82F6';
const primaryDark = '#1D4ED8';
const secondary = '#10B981'; // Emerald
const accent = '#F59E0B'; // Amber

// Status Colors
const success = '#22C55E';
const warning = '#F59E0B';
const error = '#EF4444';
const info = '#3B82F6';

export const Colors = {
  // Brand
  primary,
  primaryLight,
  primaryDark,
  secondary,
  accent,
  
  // Status
  success,
  warning,
  error,
  info,
  
  // Light Theme
  light: {
    text: '#11181C',
    textSecondary: '#687076',
    textMuted: '#9BA1A6',
    background: '#FFFFFF',
    backgroundSecondary: '#F8FAFC',
    backgroundTertiary: '#F1F5F9',
    tint: primary,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primary,
    border: '#E2E8F0',
    borderLight: '#F1F5F9',
    card: '#FFFFFF',
    cardElevated: '#FFFFFF',
    overlay: 'rgba(0, 0, 0, 0.5)',
    inputBackground: '#F8FAFC',
    placeholder: '#9BA1A6',
  },
  
  // Dark Theme
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9BA1A6',
    textMuted: '#687076',
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',
    tint: primaryLight,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: primaryLight,
    border: '#334155',
    borderLight: '#1E293B',
    card: '#1E293B',
    cardElevated: '#334155',
    overlay: 'rgba(0, 0, 0, 0.7)',
    inputBackground: '#1E293B',
    placeholder: '#687076',
  },
};

// Spacing System (4px base)
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
  xxxl: 64,
};

// Border Radius
export const BorderRadius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 24,
  full: 9999,
};

// Font Sizes
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  display: 40,
};

// Font Weights
export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const,
  semibold: '600' as const,
  bold: '700' as const,
};

// Shadows
export const Shadows = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
};

export const Fonts = Platform.select({
  ios: {
    /** iOS `UIFontDescriptorSystemDesignDefault` */
    sans: 'system-ui',
    /** iOS `UIFontDescriptorSystemDesignSerif` */
    serif: 'ui-serif',
    /** iOS `UIFontDescriptorSystemDesignRounded` */
    rounded: 'ui-rounded',
    /** iOS `UIFontDescriptorSystemDesignMonospaced` */
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
