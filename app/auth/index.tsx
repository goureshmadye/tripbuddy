import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Dimensions,
    SafeAreaView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

const { width, height } = Dimensions.get('window');

export default function SplashScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const handleContinue = () => {
    router.push('/auth/login');
  };

  const handleGuestMode = () => {
    Alert.alert(
      'Continue as Guest',
      'Guest mode has limited features. Your data will only be stored locally and won\'t sync across devices. You can sign up anytime to unlock all features.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Continue', 
          onPress: () => router.replace('/(tabs)'),
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Logo Section - Centered */}
        <View style={styles.logoContainer}>
          <View style={[styles.logoBackground, { backgroundColor: Colors.primary }]}>
            <Ionicons name="airplane" size={64} color="#FFFFFF" />
          </View>
          <Text style={[styles.appName, { color: colors.text }]}>TripBuddy</Text>
          <Text style={[styles.tagline, { color: colors.textSecondary }]}>
            Plan trips together, travel smarter
          </Text>
        </View>

        {/* Features Preview */}
        <View style={styles.featuresContainer}>
          <FeatureItem
            icon="people-outline"
            title="Collaborate"
            description="Plan trips with friends & family"
            colors={colors}
          />
          <FeatureItem
            icon="map-outline"
            title="Organize"
            description="Itineraries, maps & documents"
            colors={colors}
          />
          <FeatureItem
            icon="wallet-outline"
            title="Split Expenses"
            description="Track & settle costs easily"
            colors={colors}
          />
        </View>

        {/* CTA Buttons */}
        <View style={styles.buttonContainer}>
          <Button
            title="Get Started"
            onPress={handleContinue}
            size="lg"
            fullWidth
            icon={<Ionicons name="arrow-forward" size={20} color="#FFFFFF" />}
            iconPosition="right"
          />
          
          {/* Guest Mode Option */}
          <TouchableOpacity 
            onPress={handleGuestMode}
            style={styles.guestButton}
          >
            <Ionicons name="person-outline" size={18} color={colors.textSecondary} />
            <Text style={[styles.guestText, { color: colors.textSecondary }]}>
              Continue as Guest
            </Text>
          </TouchableOpacity>

          <Text style={[styles.termsText, { color: colors.textMuted }]}>
            By continuing, you agree to our{' '}
            <Text style={styles.link}>Terms of Service</Text> and{' '}
            <Text style={styles.link}>Privacy Policy</Text>
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

interface FeatureItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
  colors: typeof Colors.light;
}

function FeatureItem({ icon, title, description, colors }: FeatureItemProps) {
  return (
    <View style={styles.featureItem}>
      <View style={[styles.featureIcon, { backgroundColor: Colors.primary + '15' }]}>
        <Ionicons name={icon} size={24} color={Colors.primary} />
      </View>
      <View style={styles.featureText}>
        <Text style={[styles.featureTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.featureDescription, { color: colors.textSecondary }]}>
          {description}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    justifyContent: 'space-between',
    paddingTop: height * 0.08,
    paddingBottom: Spacing.xl,
  },
  logoContainer: {
    alignItems: 'center',
  },
  logoBackground: {
    width: 120,
    height: 120,
    borderRadius: BorderRadius.xxl,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  appName: {
    fontSize: FontSizes.xxxl,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.xs,
  },
  tagline: {
    fontSize: FontSizes.md,
    textAlign: 'center',
  },
  featuresContainer: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  featureIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: FontSizes.md,
    fontWeight: FontWeights.semibold,
    marginBottom: 2,
  },
  featureDescription: {
    fontSize: FontSizes.sm,
  },
  buttonContainer: {
    gap: Spacing.md,
  },
  guestButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
  },
  guestText: {
    fontSize: FontSizes.sm,
    fontWeight: FontWeights.medium,
  },
  termsText: {
    fontSize: FontSizes.xs,
    textAlign: 'center',
    lineHeight: 18,
  },
  link: {
    color: Colors.primary,
    fontWeight: FontWeights.medium,
  },
});
