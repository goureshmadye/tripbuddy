import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { usePlans, useSubscription } from '@/hooks/use-subscription';
import { useAppColorScheme } from '@/hooks/use-theme';
import { BillingCycle, PlanInfo, SubscriptionPlan } from '@/types/subscription';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    SafeAreaView,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === 'dark';
  const colors = isDark ? Colors.dark : Colors.light;

  const { plans, currentPlan, currentPlanInfo } = usePlans();
  const { subscription, upgradePlan, cancelPlan, reactivatePlan, daysUntilRenewal } = useSubscription();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  const getPrice = (plan: PlanInfo) => {
    if (!plan.pricing) return 'Free';
    const price = billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly;
    const period = billingCycle === 'yearly' ? '/year' : '/month';
    return `$${price}${period}`;
  };

  const getSavings = (plan: PlanInfo) => {
    if (!plan.pricing) return null;
    const monthlyTotal = plan.pricing.monthly * 12;
    const savings = monthlyTotal - plan.pricing.yearly;
    if (savings > 0) {
      return `Save $${savings.toFixed(2)}/year`;
    }
    return null;
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan === currentPlan) return;

    if (plan === 'free') {
      // Downgrade confirmation
      Alert.alert(
        'Downgrade to Free',
        'You will lose access to premium features. Your current subscription will remain active until the end of the billing period. Are you sure?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Downgrade',
            style: 'destructive',
            onPress: async () => {
              setIsProcessing(true);
              await upgradePlan('free', billingCycle);
              setIsProcessing(false);
            },
          },
        ]
      );
      return;
    }

    // Upgrade flow
    setIsProcessing(true);
    // In a real app, this would open Stripe checkout
    await upgradePlan(plan, billingCycle);
    setIsProcessing(false);
  };

  const getButtonText = (plan: SubscriptionPlan) => {
    if (plan === currentPlan) return 'Current Plan';
    if (plan === 'free') return 'Downgrade';
    if (currentPlan === 'free') return 'Upgrade';
    if (plan === 'teams' && currentPlan === 'pro') return 'Upgrade';
    return 'Switch';
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => plan === currentPlan;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>Subscription</Text>
        <View style={styles.headerPlaceholder} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Current Plan Status */}
        {subscription && currentPlan !== 'free' && (
          <View style={[styles.statusCard, { backgroundColor: Colors.primary + '10', borderColor: Colors.primary + '30' }]}>
            <View style={styles.statusContent}>
              <View style={[styles.statusIcon, { backgroundColor: Colors.primary + '20' }]}>
                <Ionicons name="diamond" size={24} color={Colors.primary} />
              </View>
              <View style={styles.statusText}>
                <Text style={[styles.statusTitle, { color: colors.text }]}>
                  {currentPlanInfo?.name}
                </Text>
                <Text style={[styles.statusSubtitle, { color: colors.textSecondary }]}>
                  {subscription.cancelAtPeriodEnd
                    ? `Cancels in ${daysUntilRenewal} days`
                    : `Renews in ${daysUntilRenewal} days`}
                </Text>
              </View>
            </View>
            {subscription.cancelAtPeriodEnd ? (
              <TouchableOpacity
                style={[styles.reactivateButton, { backgroundColor: Colors.primary }]}
                onPress={reactivatePlan}
              >
                <Text style={styles.reactivateButtonText}>Reactivate</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.cancelButton, { borderColor: Colors.error }]}
                onPress={cancelPlan}
              >
                <Text style={[styles.cancelButtonText, { color: Colors.error }]}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Billing Toggle */}
        <View style={styles.billingToggle}>
          <Text style={[styles.billingLabel, { color: billingCycle === 'monthly' ? colors.text : colors.textMuted }]}>
            Monthly
          </Text>
          <Switch
            value={billingCycle === 'yearly'}
            onValueChange={(value) => setBillingCycle(value ? 'yearly' : 'monthly')}
            trackColor={{ false: colors.border, true: Colors.primary + '40' }}
            thumbColor={billingCycle === 'yearly' ? Colors.primary : colors.textMuted}
          />
          <Text style={[styles.billingLabel, { color: billingCycle === 'yearly' ? colors.text : colors.textMuted }]}>
            Yearly
          </Text>
          <View style={[styles.savingsBadge, { backgroundColor: Colors.success + '15' }]}>
            <Text style={[styles.savingsBadgeText, { color: Colors.success }]}>Save up to 35%</Text>
          </View>
        </View>

        {/* Plans */}
        {plans.map((plan) => (
          <PlanCard
            key={plan.id}
            plan={plan}
            price={getPrice(plan)}
            savings={billingCycle === 'yearly' ? getSavings(plan) : null}
            isCurrentPlan={isCurrentPlan(plan.id)}
            buttonText={getButtonText(plan.id)}
            onSelect={() => handleSelectPlan(plan.id)}
            isProcessing={isProcessing}
            colors={colors}
          />
        ))}

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={[styles.faqTitle, { color: colors.text }]}>Frequently Asked Questions</Text>
          
          <FAQItem
            question="Can I cancel anytime?"
            answer="Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period."
            colors={colors}
          />
          <FAQItem
            question="What happens if I downgrade?"
            answer="Your existing data will be preserved, but you won't be able to create new content that exceeds the free plan limits."
            colors={colors}
          />
          <FAQItem
            question="Is there a free trial?"
            answer="We offer a 14-day free trial for TripBuddy Pro. You won't be charged until the trial ends."
            colors={colors}
          />
        </View>

        {/* Restore Purchases */}
        <TouchableOpacity style={styles.restoreButton}>
          <Text style={[styles.restoreButtonText, { color: Colors.primary }]}>
            Restore Purchases
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

// ============================================
// Plan Card Component
// ============================================

interface PlanCardProps {
  plan: PlanInfo;
  price: string;
  savings: string | null;
  isCurrentPlan: boolean;
  buttonText: string;
  onSelect: () => void;
  isProcessing: boolean;
  colors: typeof Colors.light;
}

function PlanCard({
  plan,
  price,
  savings,
  isCurrentPlan,
  buttonText,
  onSelect,
  isProcessing,
  colors,
}: PlanCardProps) {
  const isPro = plan.id === 'pro';
  const isTeams = plan.id === 'teams';
  const accentColor = isTeams ? '#8B5CF6' : Colors.primary;

  return (
    <View
      style={[
        styles.planCard,
        { backgroundColor: colors.card, borderColor: isCurrentPlan ? accentColor : colors.border },
        plan.popular && { borderColor: accentColor, borderWidth: 2 },
      ]}
    >
      {/* Badge */}
      {plan.badge && (
        <View style={[styles.planBadge, { backgroundColor: accentColor }]}>
          <Text style={styles.planBadgeText}>{plan.badge}</Text>
        </View>
      )}

      {/* Header */}
      <View style={styles.planHeader}>
        <View style={styles.planTitleRow}>
          <Text style={[styles.planName, { color: colors.text }]}>{plan.name}</Text>
          {(isPro || isTeams) && (
            <View style={[styles.planIcon, { backgroundColor: accentColor + '15' }]}>
              <Ionicons name="diamond" size={16} color={accentColor} />
            </View>
          )}
        </View>
        <Text style={[styles.planDescription, { color: colors.textSecondary }]}>
          {plan.description}
        </Text>
      </View>

      {/* Price */}
      <View style={styles.priceContainer}>
        <Text style={[styles.price, { color: colors.text }]}>{price}</Text>
        {savings && (
          <Text style={[styles.savings, { color: Colors.success }]}>{savings}</Text>
        )}
      </View>

      {/* Features */}
      <View style={styles.featuresContainer}>
        {plan.features.slice(0, 6).map((feature, index) => (
          <View key={index} style={styles.featureRow}>
            <Ionicons
              name={feature.includes('Everything') ? 'checkmark-done-circle' : 'checkmark-circle'}
              size={18}
              color={feature.includes('Everything') ? accentColor : Colors.success}
            />
            <Text style={[styles.featureText, { color: colors.textSecondary }]}>
              {feature}
            </Text>
          </View>
        ))}
        {plan.features.length > 6 && (
          <Text style={[styles.moreFeatures, { color: accentColor }]}>
            +{plan.features.length - 6} more features
          </Text>
        )}
      </View>

      {/* Button */}
      <Button
        title={buttonText}
        onPress={onSelect}
        disabled={isCurrentPlan || isProcessing}
        variant={isCurrentPlan ? 'outline' : 'primary'}
        fullWidth
        style={!isCurrentPlan ? { backgroundColor: accentColor } : undefined}
      />
    </View>
  );
}

// ============================================
// FAQ Item Component
// ============================================

interface FAQItemProps {
  question: string;
  answer: string;
  colors: typeof Colors.light;
}

function FAQItem({ question, answer, colors }: FAQItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <TouchableOpacity
      style={[styles.faqItem, { borderBottomColor: colors.border }]}
      onPress={() => setIsExpanded(!isExpanded)}
      activeOpacity={0.7}
    >
      <View style={styles.faqQuestion}>
        <Text style={[styles.faqQuestionText, { color: colors.text }]}>{question}</Text>
        <Ionicons
          name={isExpanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color={colors.textMuted}
        />
      </View>
      {isExpanded && (
        <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>{answer}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.screenPadding,
    paddingVertical: Spacing.md,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
  },
  headerPlaceholder: {
    width: 44,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.screenPadding,
    paddingBottom: Spacing['2xl'],
  },
  // Status Card
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    marginBottom: Spacing.lg,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  statusIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusText: {},
  statusTitle: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  statusSubtitle: {
    fontSize: FontSizes.caption,
  },
  reactivateButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
  },
  reactivateButtonText: {
    color: '#fff',
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
  cancelButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
  },
  cancelButtonText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
  },
  // Billing Toggle
  billingToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  billingLabel: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  savingsBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
    marginLeft: Spacing.xs,
  },
  savingsBadgeText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
  // Plan Card
  planCard: {
    padding: Spacing.cardPadding,
    borderRadius: BorderRadius.large,
    borderWidth: 1,
    marginBottom: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
  },
  planBadge: {
    position: 'absolute',
    top: 12,
    right: -30,
    paddingHorizontal: 40,
    paddingVertical: 4,
    transform: [{ rotate: '45deg' }],
  },
  planBadgeText: {
    color: '#fff',
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.bold,
  },
  planHeader: {
    marginBottom: Spacing.md,
  },
  planTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: 4,
  },
  planName: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  planIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  planDescription: {
    fontSize: FontSizes.bodySmall,
  },
  priceContainer: {
    marginBottom: Spacing.md,
  },
  price: {
    fontSize: FontSizes.heading1,
    fontWeight: FontWeights.bold,
  },
  savings: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
  },
  featuresContainer: {
    marginBottom: Spacing.md,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  featureText: {
    flex: 1,
    fontSize: FontSizes.bodySmall,
    lineHeight: 20,
  },
  moreFeatures: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.medium,
    marginTop: Spacing.xs,
  },
  // FAQ
  faqSection: {
    marginTop: Spacing.lg,
  },
  faqTitle: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.semibold,
    marginBottom: Spacing.md,
  },
  faqItem: {
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  faqQuestion: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestionText: {
    flex: 1,
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
  faqAnswer: {
    fontSize: FontSizes.bodySmall,
    marginTop: Spacing.sm,
    lineHeight: 20,
  },
  restoreButton: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  restoreButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
});
