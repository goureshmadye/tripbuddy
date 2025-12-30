import { useEffect, useState } from 'react';
import { Dimensions, Platform, ScaledSize } from 'react-native';

export type DeviceType = 'mobile' | 'tablet' | 'desktop';
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

export interface ResponsiveConfig {
  deviceType: DeviceType;
  screenSize: ScreenSize;
  isDesktop: boolean;
  isTablet: boolean;
  isMobile: boolean;
  width: number;
  height: number;
  isLandscape: boolean;
  showSidebar: boolean;
  showBottomNav: boolean;
}

// Breakpoints (similar to Tailwind CSS)
const BREAKPOINTS = {
  xs: 0,
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
};

const getScreenSize = (width: number): ScreenSize => {
  if (width >= BREAKPOINTS.xl) return 'xl';
  if (width >= BREAKPOINTS.lg) return 'lg';
  if (width >= BREAKPOINTS.md) return 'md';
  if (width >= BREAKPOINTS.sm) return 'sm';
  return 'xs';
};

const getDeviceType = (width: number): DeviceType => {
  // On web, we use breakpoints
  if (Platform.OS === 'web') {
    if (width >= BREAKPOINTS.lg) return 'desktop';
    if (width >= BREAKPOINTS.md) return 'tablet';
    return 'mobile';
  }
  
  // On native, we check if it's a tablet based on screen dimensions
  const { width: screenWidth, height: screenHeight } = Dimensions.get('screen');
  const minDimension = Math.min(screenWidth, screenHeight);
  
  // Tablets typically have a minimum dimension > 600
  if (minDimension >= 600) return 'tablet';
  return 'mobile';
};

const getResponsiveConfig = (dimensions: ScaledSize): ResponsiveConfig => {
  const { width, height } = dimensions;
  const deviceType = getDeviceType(width);
  const screenSize = getScreenSize(width);
  
  const isDesktop = deviceType === 'desktop';
  const isTablet = deviceType === 'tablet';
  const isMobile = deviceType === 'mobile';
  const isLandscape = width > height;
  
  // Show sidebar on desktop and landscape tablets
  const showSidebar = isDesktop || (isTablet && isLandscape && Platform.OS === 'web');
  // Show bottom nav on mobile and portrait tablets
  const showBottomNav = !showSidebar;
  
  return {
    deviceType,
    screenSize,
    isDesktop,
    isTablet,
    isMobile,
    width,
    height,
    isLandscape,
    showSidebar,
    showBottomNav,
  };
};

export function useResponsive(): ResponsiveConfig {
  const [dimensions, setDimensions] = useState(() => Dimensions.get('window'));
  const [config, setConfig] = useState(() => getResponsiveConfig(dimensions));

  useEffect(() => {
    const subscription = Dimensions.addEventListener('change', ({ window }) => {
      setDimensions(window);
      setConfig(getResponsiveConfig(window));
    });

    return () => subscription?.remove();
  }, []);

  return config;
}

// Hook for getting responsive values
export function useResponsiveValue<T>(values: {
  mobile?: T;
  tablet?: T;
  desktop?: T;
  default: T;
}): T {
  const { deviceType } = useResponsive();
  
  switch (deviceType) {
    case 'desktop':
      return values.desktop ?? values.default;
    case 'tablet':
      return values.tablet ?? values.mobile ?? values.default;
    case 'mobile':
    default:
      return values.mobile ?? values.default;
  }
}
