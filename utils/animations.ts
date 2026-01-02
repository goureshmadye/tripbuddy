/**
 * Animated Transitions and Shared Animation Utilities
 * Provides smooth screen transitions and reusable animation helpers
 */

import { Platform } from 'react-native';

// Animation timing constants
export const AnimationDuration = {
  instant: 0,
  fast: 150,
  normal: 250,
  slow: 350,
  slower: 500,
};

export const AnimationEasing = {
  // Standard easing for most transitions
  standard: { x1: 0.4, y1: 0, x2: 0.2, y2: 1 },
  // Emphasized easing for dramatic transitions
  emphasized: { x1: 0.2, y1: 0, x2: 0, y2: 1 },
  // Decelerated easing for elements entering the screen
  decelerate: { x1: 0, y1: 0, x2: 0.2, y2: 1 },
  // Accelerated easing for elements leaving the screen
  accelerate: { x1: 0.4, y1: 0, x2: 1, y2: 1 },
};

// Spring animation configurations for react-native-reanimated
export const SpringConfig = {
  gentle: {
    damping: 20,
    stiffness: 100,
    mass: 1,
  },
  bouncy: {
    damping: 10,
    stiffness: 150,
    mass: 0.8,
  },
  stiff: {
    damping: 25,
    stiffness: 200,
    mass: 1,
  },
  snappy: {
    damping: 15,
    stiffness: 180,
    mass: 0.8,
  },
};

// Expo Router screen animation types
export type ScreenAnimation = 
  | 'default'
  | 'fade'
  | 'fade_from_bottom'
  | 'flip'
  | 'simple_push'
  | 'slide_from_bottom'
  | 'slide_from_right'
  | 'slide_from_left'
  | 'ios_from_right'
  | 'ios_from_left'
  | 'none';

// Screen transition configurations for Expo Router
export const screenTransitions = {
  // Standard push navigation (slide from right)
  push: 'slide_from_right' as ScreenAnimation,
  // Modal presentation (slide from bottom)
  modal: 'slide_from_bottom' as ScreenAnimation,
  // Fade transition for tab changes
  fade: 'fade' as ScreenAnimation,
  // iOS native feel
  ios: 'ios_from_right' as ScreenAnimation,
  // No animation
  none: 'none' as ScreenAnimation,
};

// Platform-specific default animation
export const platformDefaultAnimation: ScreenAnimation = Platform.select({
  ios: 'ios_from_right',
  android: 'slide_from_right',
  default: 'fade',
}) as ScreenAnimation;

// Animation configuration helper for Animated API
export const createTimingConfig = (duration: number = AnimationDuration.normal) => ({
  duration,
  useNativeDriver: true,
});

export const createSpringConfig = (config: keyof typeof SpringConfig = 'snappy') => ({
  ...SpringConfig[config],
  useNativeDriver: true,
});

// Fade animation helper values
export const fadeInConfig = {
  from: 0,
  to: 1,
  duration: AnimationDuration.normal,
};

export const fadeOutConfig = {
  from: 1,
  to: 0,
  duration: AnimationDuration.fast,
};

// Scale animation helper values  
export const scaleInConfig = {
  from: 0.9,
  to: 1,
  duration: AnimationDuration.normal,
};

export const scaleOutConfig = {
  from: 1,
  to: 0.9,
  duration: AnimationDuration.fast,
};
