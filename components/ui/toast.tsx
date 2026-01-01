import { BorderRadius, Colors, FontSizes, FontWeights, Shadows, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { NotificationType } from '@/types/database';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// ============================================
// Types
// ============================================

export type ToastType = 'success' | 'error' | 'warning' | 'info' | 'notification';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
  onPress?: () => void;
  notificationType?: NotificationType;
}

interface ToastContextType {
  showToast: (toast: Omit<Toast, 'id'>) => void;
  hideToast: (id: string) => void;
  hideAllToasts: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// ============================================
// Toast Configuration
// ============================================

const getToastConfig = (type: ToastType, notificationType?: NotificationType) => {
  // For notification type, check the specific notification type
  if (type === 'notification' && notificationType) {
    switch (notificationType) {
      case 'collaborator_added':
      case 'invitation_accepted':
        return { color: Colors.primary, icon: 'person-add' as const };
      case 'collaborator_removed':
        return { color: Colors.error, icon: 'person-remove' as const };
      case 'expense_added':
      case 'expense_updated':
        return { color: Colors.secondary, icon: 'wallet' as const };
      case 'itinerary_added':
      case 'itinerary_updated':
        return { color: Colors.accent, icon: 'calendar' as const };
      case 'trip_invitation':
        return { color: Colors.primary, icon: 'mail' as const };
      case 'trip_updated':
        return { color: Colors.info, icon: 'airplane' as const };
      case 'reminder':
        return { color: Colors.warning, icon: 'alarm' as const };
      case 'system':
      default:
        return { color: Colors.info, icon: 'information-circle' as const };
    }
  }

  switch (type) {
    case 'success':
      return { color: Colors.success, icon: 'checkmark-circle' as const };
    case 'error':
      return { color: Colors.error, icon: 'alert-circle' as const };
    case 'warning':
      return { color: Colors.warning, icon: 'warning' as const };
    case 'info':
    default:
      return { color: Colors.info, icon: 'information-circle' as const };
  }
};

// ============================================
// Individual Toast Component
// ============================================

interface ToastItemProps {
  toast: Toast;
  onHide: (id: string) => void;
  index: number;
}

function ToastItem({ toast, onHide, index }: ToastItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  
  const config = getToastConfig(toast.type, toast.notificationType);
  const duration = toast.duration ?? 4000;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.spring(scale, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();

    // Haptic feedback
    if (Platform.OS !== 'web') {
      Haptics.notificationAsync(
        toast.type === 'error'
          ? Haptics.NotificationFeedbackType.Error
          : toast.type === 'warning'
          ? Haptics.NotificationFeedbackType.Warning
          : Haptics.NotificationFeedbackType.Success
      );
    }

    // Auto-hide timer
    const timer = setTimeout(() => {
      hideWithAnimation();
    }, duration);

    return () => clearTimeout(timer);
  }, []);

  const hideWithAnimation = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(scale, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide(toast.id);
    });
  };

  const handlePress = () => {
    if (toast.onPress) {
      toast.onPress();
    }
    hideWithAnimation();
  };

  return (
    <Animated.View
      style={[
        styles.toastContainer,
        {
          top: insets.top + Spacing.md + index * 80,
          transform: [{ translateY }, { scale }],
          opacity,
        },
      ]}
    >
      <Pressable
        onPress={handlePress}
        style={[
          styles.toast,
          {
            backgroundColor: isDark ? colors.card : '#FFFFFF',
            borderColor: isDark ? colors.border : config.color + '30',
          },
          Shadows.lg,
        ]}
      >
        {/* Color indicator */}
        <View style={[styles.colorIndicator, { backgroundColor: config.color }]} />
        
        {/* Icon */}
        <View style={[styles.iconContainer, { backgroundColor: config.color + '15' }]}>
          <Ionicons name={config.icon} size={22} color={config.color} />
        </View>
        
        {/* Content */}
        <View style={styles.content}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {toast.title}
          </Text>
          {toast.message && (
            <Text
              style={[styles.message, { color: colors.textSecondary }]}
              numberOfLines={2}
            >
              {toast.message}
            </Text>
          )}
        </View>

        {/* Close button */}
        <Pressable
          onPress={hideWithAnimation}
          style={styles.closeButton}
          hitSlop={8}
        >
          <Ionicons name="close" size={18} color={colors.textMuted} />
        </Pressable>
      </Pressable>
    </Animated.View>
  );
}

// ============================================
// Toast Provider
// ============================================

interface ToastProviderProps {
  children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    setToasts((prev) => {
      // Limit to max 3 toasts at a time
      const newToasts = [...prev, { ...toast, id }];
      return newToasts.slice(-3);
    });
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const hideAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast, hideToast, hideAllToasts }}>
      {children}
      {/* Toast Portal */}
      <View style={styles.toastPortal} pointerEvents="box-none">
        {toasts.map((toast, index) => (
          <ToastItem
            key={toast.id}
            toast={toast}
            onHide={hideToast}
            index={index}
          />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

// ============================================
// Styles
// ============================================

const styles = StyleSheet.create({
  toastPortal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999,
    pointerEvents: 'box-none',
  },
  toastContainer: {
    position: 'absolute',
    left: Spacing.md,
    right: Spacing.md,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingRight: Spacing.sm,
    paddingLeft: 0,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    overflow: 'hidden',
    maxWidth: 500,
    alignSelf: 'center',
    width: '100%',
  },
  colorIndicator: {
    width: 4,
    alignSelf: 'stretch',
    marginRight: Spacing.sm,
    borderTopLeftRadius: BorderRadius.large,
    borderBottomLeftRadius: BorderRadius.large,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.medium,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.sm,
  },
  content: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  message: {
    fontSize: FontSizes.bodySmall,
    lineHeight: 18,
  },
  closeButton: {
    padding: Spacing.xs,
  },
});
