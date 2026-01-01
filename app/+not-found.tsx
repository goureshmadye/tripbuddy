import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    SafeAreaView,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export default function NotFoundScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const handleGoHome = () => {
    router.replace('/(tabs)');
  };

  const handleGoBack = () => {
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={[styles.iconContainer, { backgroundColor: Colors.accent + '15' }]}>
          <Ionicons name="map-outline" size={64} color={Colors.accent} />
          <View style={[styles.questionMark, { backgroundColor: Colors.accent }]}>
            <Text style={styles.questionMarkText}>?</Text>
          </View>
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>Page Not Found</Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          Oops! Looks like you've wandered off the beaten path. The page you're looking for doesn't exist or has been moved.
        </Text>

        {/* Error Code */}
        <View style={[styles.errorCode, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.errorCodeText, { color: colors.textMuted }]}>Error 404</Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Go Home"
            onPress={handleGoHome}
            fullWidth
            size="lg"
            icon={<Ionicons name="home" size={20} color="#FFFFFF" />}
          />
          <Button
            title="Go Back"
            onPress={handleGoBack}
            variant="outline"
            fullWidth
            size="lg"
            icon={<Ionicons name="arrow-back" size={20} color={Colors.primary} />}
          />
        </View>
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
  iconContainer: {
    width: 140,
    height: 140,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },
  questionMark: {
    position: 'absolute',
    top: 10,
    right: 15,
    width: 32,
    height: 32,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionMarkText: {
    color: '#FFFFFF',
    fontSize: FontSizes.lg,
    fontWeight: FontWeights.bold,
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  description: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  errorCode: {
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    borderRadius: BorderRadius.pill,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  errorCodeText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
});
