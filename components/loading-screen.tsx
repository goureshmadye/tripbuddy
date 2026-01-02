import { ScreenContainer } from '@/components/screen-container';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Easing,
  Image,
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

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [progress] = useState(new Animated.Value(0));
  const [progressPercent, setProgressPercent] = useState(0);

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Continuous pulse animation for the logo
    const pulseAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        }),
      ])
    );
    pulseAnimation.start();

    return () => pulseAnimation.stop();
  }, [fadeAnim, scaleAnim, pulseAnim]);

  useEffect(() => {
    if (showProgress) {
      Animated.timing(progress, {
        toValue: 100,
        duration: 3000,
        useNativeDriver: false,
        easing: Easing.out(Easing.cubic),
      }).start();

      const interval = setInterval(() => {
        setProgressPercent(prev => Math.min(prev + 5, 100));
      }, 150);

      return () => clearInterval(interval);
    }
  }, [showProgress, progress]);

  const progressWidth = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ['0%', '100%'],
  });

  return (
    <ScreenContainer style={{...styles.container, backgroundColor: colors.background }}>
      <View style={styles.content}>
        {/* Animated Logo */}
        <Animated.View 
          style={[
            styles.logoContainer, 
            { backgroundColor: Colors.primary + '15' },
            {
              opacity: fadeAnim,
              transform: [
                { scale: Animated.multiply(scaleAnim, pulseAnim) },
              ],
            },
          ]}
        >
          <Image
            source={require('../assets/images/logo.png')}
            style={styles.logoImage}
            resizeMode="contain"
          />
        </Animated.View>

        {/* App Name */}
        <Animated.Text 
          style={[
            styles.appName, 
            { color: colors.text },
            { opacity: fadeAnim, transform: [{ scale: scaleAnim }] },
          ]}
        >
          TripBuddy
        </Animated.Text>

        {/* Loading Indicator */}
        <Animated.View style={{ opacity: fadeAnim }}>
          <ActivityIndicator size="large" color={Colors.primary} style={styles.spinner} />
        </Animated.View>

        {/* Message */}
        <Animated.Text 
          style={[
            styles.message, 
            { color: colors.textSecondary },
            { opacity: fadeAnim },
          ]}
        >
          {message}
        </Animated.Text>

        {/* Progress Bar */}
        {showProgress && (
          <Animated.View style={[styles.progressContainer, { opacity: fadeAnim }]}>
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
          </Animated.View>
        )}
      </View>
    </ScreenContainer>
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
  logoImage: {
    width: 64,
    height: 64,
    borderRadius: 12,
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
