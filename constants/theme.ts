/**
 * TripBuddy Theme Constants
 * Design System - Colors, Fonts, Spacing, and Design Tokens
 * 
 * Design Philosophy:
 * - Highly rounded, modern, friendly aesthetic
 * - Clean white backgrounds with subtle shadows
 * - Vibrant blue primary with orange accents
 * - WCAG AA compliant accessibility
 */

import { Platform } from 'react-native';

// ============================================
// Brand Colors
// ============================================
const primary = '#2F5FFF'; // Vibrant blue - primary actions, headers, key interactive elements
const primaryLight = '#5A82FF';
const primaryDark = '#1A42CC';
const secondary = '#FF8A00'; // Orange - accent for points, rewards, secondary highlights
const accent = '#FF8A00';

// Status Colors
const success = '#10B981';
const warning = '#FF8A00';
const error = '#EF4444';
const info = '#2F5FFF';
const rating = '#FFB800';

// Text Colors
const textPrimary = '#1A1A1A';
const textSecondary = '#6B7280';
const textLight = '#9CA3AF';

// Background Colors
const backgroundMain = '#FFFFFF';
const backgroundSecondary = '#F7F9FC';
const backgroundCard = '#FFFFFF';

// Border Colors
const borderDefault = '#E5E7EB';
const borderLight = '#F3F4F6';

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
  rating,
  
  // Light Theme
  light: {
    text: textPrimary,
    textSecondary: textSecondary,
    textMuted: textLight,
    background: backgroundMain,
    backgroundSecondary: backgroundSecondary,
    backgroundTertiary: '#F3F4F6',
    tint: primary,
    icon: textSecondary,
    tabIconDefault: textLight,
    tabIconSelected: primary,
    border: borderDefault,
    borderLight: borderLight,
    card: backgroundCard,
    cardElevated: backgroundCard,
    overlay: 'rgba(0, 0, 0, 0.5)',
    inputBackground: backgroundSecondary,
    placeholder: textLight,
  },
  
  // Dark Theme
  dark: {
    text: '#ECEDEE',
    textSecondary: '#9CA3AF',
    textMuted: '#6B7280',
    background: '#0F172A',
    backgroundSecondary: '#1E293B',
    backgroundTertiary: '#334155',
    tint: primaryLight,
    icon: '#9CA3AF',
    tabIconDefault: '#6B7280',
    tabIconSelected: primaryLight,
    border: '#334155',
    borderLight: '#1E293B',
    card: '#1E293B',
    cardElevated: '#334155',
    overlay: 'rgba(0, 0, 0, 0.7)',
    inputBackground: '#1E293B',
    placeholder: '#6B7280',
  },
};

// ============================================
// Spacing System (8pt base unit)
// ============================================
export const Spacing = {
  xs: 4,      // Extra small
  sm: 8,      // Small
  md: 16,     // Medium (Standard spacing between form fields)
  base: 16,   // Base unit / Screen padding
  lg: 24,     // Large / Section gap
  xl: 32,     // Extra large
  '2xl': 40,  // 2x Extra large
  '3xl': 48,  // 3x Extra large
  // Legacy support
  xxl: 40,
  xxxl: 48,
  // Semantic spacing
  screenPadding: 16,
  cardPadding: 16,
  sectionGap: 24,
  labelGap: 8,
};

// ============================================
// Border Radius - Consistent Roundness System
// ============================================
export const BorderRadius = {
  // Base values
  small: 8,   // Chips, tags
  medium: 12, // Inputs, buttons, cards
  large: 16,  // Modals, bottom sheets
  xlarge: 20,
  xxlarge: 24,
  pill: 999,
  // Legacy support
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 999,
  // Application-specific matches
  button: 12,
  card: 12,
  imageCard: 12,
  categoryIcon: 12,
  modal: 16,
  searchBar: 12,
  tabs: 12,
  input: 12,
  chip: 8,
  badge: 8,
};

// ============================================
// Typography
// ============================================
export const FontSizes = {
  micro: 10,      // Micro text
  caption: 12,    // Captions, helper text
  bodySmall: 14,  // Small body text
  body: 16,       // Default body, Button text
  sectionHeading: 18, // Section Heading
  heading3: 20,   // H3
  heading2: 24,   // Title / Screen Heading
  heading1: 28,   // H1
  // Legacy support
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 28,
  display: 32,
};

export const FontWeights = {
  regular: '400' as const,
  medium: '500' as const, // Button text
  semibold: '600' as const, // Headings
  bold: '700' as const,
};

export const LineHeights = {
  tight: 1.2,     // 120%
  normal: 1.4,    // 140%
  relaxed: 1.6,   // 160%
};

// ============================================
// Shadows - Subtle, soft shadows for depth
// ============================================
export const Shadows = {
  // Card shadow
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // Card hover/pressed shadow
  cardHover: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  // Button shadow
  button: {
    shadowColor: '#2F5FFF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  // Modal shadow
  modal: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 32,
    elevation: 8,
  },
  // Floating element shadow
  floating: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  // Legacy support
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
};

// ============================================
// Component Dimensions
// ============================================
export const ComponentSizes = {
  // Buttons
  buttonHeight: 48,
  buttonHeightSecondary: 44,
  iconButtonSize: 44,
  
  // Inputs
  inputHeight: 48,
  searchBarHeight: 48,
  
  // Navigation
  tabBarHeight: 64,
  topBarHeight: 56,
  
  // Icons
  iconSmall: 16,
  iconMedium: 20,
  iconLarge: 24,
  iconXLarge: 32,
  
  // Category icons
  categoryIconSize: 64,
  categoryIconInnerSize: 32,
  
  // Chips/Badges
  chipHeight: 32,
  badgeSize: 20,
  
  // Progress stepper
  stepperCircleSize: 32,
  stepperLineHeight: 2,
  
  // Minimum tap target (accessibility)
  minTapTarget: 44,
};

// ============================================
// Animation Durations
// ============================================
export const Animation = {
  fast: 200,
  normal: 300,
  slow: 400,
  // Press scale values
  pressScale: 0.96,
  cardPressScale: 0.98,
  // Modal scale
  modalScale: 0.95,
};

// ============================================
// Typography Styles (Pre-composed)
// ============================================
export const Typography = {
  heading1: {
    fontSize: FontSizes.heading1,
    fontWeight: FontWeights.bold,
    lineHeight: FontSizes.heading1 * LineHeights.tight,
    color: textPrimary,
  },
  heading2: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.heading2 * LineHeights.tight,
    color: textPrimary,
  },
  heading3: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.heading3 * LineHeights.tight,
    color: textPrimary,
  },
  body: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.body * LineHeights.normal,
    color: textPrimary,
  },
  bodySmall: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.bodySmall * LineHeights.normal,
    color: textSecondary,
  },
  caption: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.regular,
    lineHeight: FontSizes.caption * LineHeights.normal,
    color: textLight,
  },
  buttonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    lineHeight: FontSizes.body * LineHeights.tight,
  },
  chipText: {
    fontSize: 13,
    fontWeight: FontWeights.medium,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: FontWeights.semibold,
  },
};

// ============================================
// Fonts
// ============================================
export const Fonts = Platform.select({
  ios: {
    sans: 'System',
    serif: 'Georgia',
    rounded: 'System',
    mono: 'Menlo',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "Inter, -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', Inter, -apple-system, BlinkMacSystemFont, sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
