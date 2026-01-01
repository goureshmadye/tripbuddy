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

export default function NoInternetScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const handleRetry = () => {
    // Check connection and navigate back
    router.back();
  };

  const handleOfflineMode = () => {
    // Enable offline mode
    router.back();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.content}>
        {/* Illustration */}
        <View style={[styles.iconContainer, { backgroundColor: Colors.error + '15' }]}>
          <Ionicons name="cloud-offline" size={64} color={Colors.error} />
        </View>

        {/* Title */}
        <Text style={[styles.title, { color: colors.text }]}>No Internet Connection</Text>

        {/* Description */}
        <Text style={[styles.description, { color: colors.textSecondary }]}>
          It looks like you're not connected to the internet. Please check your connection and try again.
        </Text>

        {/* Tips */}
        <View style={[styles.tipsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.tipsTitle, { color: colors.text }]}>Things to try:</Text>
          <View style={styles.tipItem}>
            <Ionicons name="wifi" size={18} color={colors.textSecondary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Check your WiFi connection
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="cellular" size={18} color={colors.textSecondary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Enable mobile data
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Ionicons name="airplane" size={18} color={colors.textSecondary} />
            <Text style={[styles.tipText, { color: colors.textSecondary }]}>
              Turn off Airplane mode
            </Text>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Button
            title="Try Again"
            onPress={handleRetry}
            fullWidth
            size="lg"
            icon={<Ionicons name="refresh" size={20} color="#FFFFFF" />}
          />
          <Button
            title="Continue Offline"
            onPress={handleOfflineMode}
            variant="outline"
            fullWidth
            size="lg"
            icon={<Ionicons name="cloud-offline-outline" size={20} color={Colors.primary} />}
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
    width: 120,
    height: 120,
    borderRadius: BorderRadius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
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
    marginBottom: Spacing.xl,
  },
  tipsCard: {
    width: '100%',
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.card,
    borderWidth: 1,
    marginBottom: Spacing.xl,
  },
  tipsTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  tipText: {
    fontSize: FontSizes.bodySmall,
  },
  actions: {
    width: '100%',
    gap: Spacing.sm,
  },
});
