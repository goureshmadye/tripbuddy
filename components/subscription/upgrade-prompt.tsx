import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useSubscription } from '@/hooks/use-subscription';
import { useAppColorScheme } from '@/hooks/use-theme';
import { GatedFeature, SubscriptionPlan } from '@/types/subscription';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface UpgradePromptProps {
  visible: boolean;
  onClose: () => void;
  feature?: GatedFeature | string;
  requiredPlan?: SubscriptionPlan;
  title?: string;
  message?: string;
  currentUsage?: number;
  limit?: number;
}

export function UpgradePrompt({
  visible,
  onClose,
  feature,
  requiredPlan = 'pro',
  title,
  message,
  currentUsage,
  limit,
}: UpgradePromptProps) {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;
  const { planInfo } = useSubscription();

  const getPlanName = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'pro': return 'TripBuddy Pro';
      case 'teams': return 'TripBuddy Teams';
      default: return 'upgrade';
    }
  };

  const getFeatureTitle = () => {
    if (title) return title;
    if (typeof feature === 'string') {
      return feature.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }
    return 'Premium Feature';
  };

  const getFeatureMessage = () => {
    if (message) return message;
    if (currentUsage !== undefined && limit !== undefined) {
      return `You've used ${currentUsage} of ${limit} available. Upgrade to ${getPlanName(requiredPlan)} for unlimited access.`;
    }
    return `This feature requires ${getPlanName(requiredPlan)}. Upgrade now to unlock this and many more features!`;
  };

  const handleViewPlans = () => {
    onClose();
    router.push('/subscription');
  };

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: colors.card }]}>
          {/* Icon */}
          <View style={[styles.iconContainer, { backgroundColor: Colors.primary + '15' }]}>
            <Ionicons name="diamond" size={40} color={Colors.primary} />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: colors.text }]}>
            {getFeatureTitle()}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: colors.textSecondary }]}>
            {getFeatureMessage()}
          </Text>

          {/* Current plan badge */}
          <View style={[styles.currentPlanBadge, { backgroundColor: colors.background }]}>
            <Text style={[styles.currentPlanLabel, { color: colors.textMuted }]}>
              Current Plan:
            </Text>
            <Text style={[styles.currentPlanName, { color: colors.text }]}>
              {planInfo?.name || 'Free'}
            </Text>
          </View>

          {/* Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.primaryButton, { backgroundColor: Colors.primary }]}
              onPress={handleViewPlans}
            >
              <Ionicons name="rocket-outline" size={20} color="#fff" />
              <Text style={styles.primaryButtonText}>View Plans</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
              onPress={onClose}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.textSecondary }]}>
                Maybe Later
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================
// Inline Upgrade Banner
// ============================================

interface UpgradeBannerProps {
  feature: GatedFeature | string;
  requiredPlan?: SubscriptionPlan;
  compact?: boolean;
}

export function UpgradeBanner({ feature, requiredPlan = 'pro', compact = false }: UpgradeBannerProps) {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const getPlanName = (plan: SubscriptionPlan) => {
    switch (plan) {
      case 'pro': return 'Pro';
      case 'teams': return 'Teams';
      default: return 'upgrade';
    }
  };

  if (compact) {
    return (
      <TouchableOpacity
        style={[styles.compactBanner, { backgroundColor: Colors.primary + '10' }]}
        onPress={() => router.push('/subscription')}
      >
        <Ionicons name="diamond" size={16} color={Colors.primary} />
        <Text style={[styles.compactBannerText, { color: Colors.primary }]}>
          Upgrade to {getPlanName(requiredPlan)}
        </Text>
        <Ionicons name="chevron-forward" size={16} color={Colors.primary} />
      </TouchableOpacity>
    );
  }

  return (
    <View style={[styles.banner, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' }]}>
      <View style={styles.bannerContent}>
        <Ionicons name="diamond" size={24} color={Colors.primary} />
        <View style={styles.bannerTextContainer}>
          <Text style={[styles.bannerTitle, { color: colors.text }]}>
            Upgrade to {getPlanName(requiredPlan)}
          </Text>
          <Text style={[styles.bannerMessage, { color: colors.textSecondary }]}>
            Unlock {feature.toString().split('_').join(' ')} and more
          </Text>
        </View>
      </View>
      <TouchableOpacity
        style={[styles.bannerButton, { backgroundColor: Colors.primary }]}
        onPress={() => router.push('/subscription')}
      >
        <Text style={styles.bannerButtonText}>Upgrade</Text>
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// Locked Feature Overlay
// ============================================

interface LockedFeatureProps {
  children: React.ReactNode;
  feature: GatedFeature;
  requiredPlan?: SubscriptionPlan;
  showOverlay?: boolean;
}

export function LockedFeature({ children, feature, requiredPlan = 'pro', showOverlay = true }: LockedFeatureProps) {
  const { checkFeature } = useSubscription();
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const access = checkFeature(feature);

  if (access.allowed) {
    return <>{children}</>;
  }

  return (
    <View style={styles.lockedContainer}>
      {children}
      {showOverlay && (
        <TouchableOpacity
          style={styles.lockedOverlay}
          activeOpacity={0.9}
          onPress={() => router.push('/subscription')}
        >
          <View style={[styles.lockedBadge, { backgroundColor: colors.card }]}>
            <Ionicons name="lock-closed" size={20} color={Colors.primary} />
            <Text style={[styles.lockedText, { color: colors.text }]}>
              {requiredPlan === 'teams' ? 'Teams' : 'Pro'}
            </Text>
          </View>
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.screenPadding,
  },
  container: {
    width: '100%',
    maxWidth: 400,
    borderRadius: BorderRadius.modal,
    padding: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.heading2,
    fontWeight: FontWeights.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSizes.body,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    lineHeight: 22,
  },
  currentPlanBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  currentPlanLabel: {
    fontSize: FontSizes.caption,
  },
  currentPlanName: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
  buttonContainer: {
    width: '100%',
    gap: Spacing.sm,
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    gap: Spacing.sm,
  },
  primaryButton: {},
  primaryButtonText: {
    color: '#fff',
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  secondaryButton: {
    borderWidth: 1,
  },
  secondaryButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  // Banner styles
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    marginVertical: Spacing.sm,
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: Spacing.sm,
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
  bannerMessage: {
    fontSize: FontSizes.caption,
  },
  bannerButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.small,
  },
  bannerButtonText: {
    color: '#fff',
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
  // Compact banner
  compactBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.medium,
    gap: Spacing.xs,
  },
  compactBannerText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.medium,
  },
  // Locked feature
  lockedContainer: {
    position: 'relative',
  },
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: BorderRadius.medium,
  },
  lockedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    gap: Spacing.xs,
  },
  lockedText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
});
