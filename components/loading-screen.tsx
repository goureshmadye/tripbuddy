import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

type LoadingScreenProps = {
  message?: string;
  showProgress?: boolean;
};

export default function LoadingScreen({ 
  message = 'Loading...', 
  showProgress = false 
}: LoadingScreenProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const [progress] = useState(new Animated.Value(0));
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    if (showProgress) {
      Animated.timing(progress, {
        toValue: 100,
        duration: 3000,
        useNativeDriver: false,
      }).start();

      const interval = setInterval(() => {
        setProgressPercent(prev => Math.min(prev + 5, 100));
      }, 150);

      return () => clearInterval(interval);
    }
  }, [showProgress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo */}
        <View style={[styles.logoContainer, { backgroundColor: Colors.primary + '15' }]}>
          <Ionicons name="airplane" size={48} color={Colors.primary} />
        </View>

        {/* App Name */}
        <Text style={[styles.appName, { color: colors.text }]}>TripBuddy</Text>

        {/* Loading Indicator */}
        <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />

        {/* Message */}
        <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

        {/* Progress Bar */}
        {showProgress && (
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { backgroundColor: Colors.primary, width: progressWidth }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: colors.textMuted }]}>
              {progressPercent}%
            </Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  logoContainer: {
    width: 100,
    height: 100,
    borderRadius: BorderRadius.xlarge,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xl,
  },
  spinner: {
    marginBottom: Spacing.md,
  },
  message: {
    fontSize: FontSizes.body,
    textAlign: 'center',
  },
  progressContainer: {
    width: '80%',
    marginTop: Spacing.xl,
    alignItems: 'center',
  },
  progressBar: {
    width: '100%',
    height: 6,
    borderRadius: BorderRadius.pill,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: BorderRadius.pill,
  },
  progressText: {
    marginTop: Spacing.sm,
    fontSize: FontSizes.bodySmall,
  },
});
