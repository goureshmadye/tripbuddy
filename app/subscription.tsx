import { ScreenContainer } from '@/components/screen-container';
import { Button } from '@/components/ui/button';
import { BorderRadius, Colors, FontSizes, FontWeights, Spacing } from '@/constants/theme';
import { useAuth } from '@/hooks/use-auth';
import { useGlobalPricing } from '@/hooks/use-global-pricing';
import { usePlans, useSubscription } from '@/hooks/use-subscription';
import { useAppColorScheme } from '@/hooks/use-theme';
import { useUsageLimits } from '@/hooks/use-usage-limits';
import { PaymentService } from '@/services/payment';
import { PricingService } from '@/services/pricing';
import { BillingCycle, PlanInfo, SubscriptionPlan } from '@/types/subscription';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
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

  const { user } = useAuth();
  const { plans, currentPlan, currentPlanInfo } = usePlans();
  const { subscription, upgradePlan, cancelPlan, reactivatePlan, daysUntilRenewal } = useSubscription();
  const { usage } = useUsageLimits();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>('yearly');
  const [isProcessing, setIsProcessing] = useState(false);

  const getButtonText = (plan: SubscriptionPlan) => {
    if (plan === currentPlan) return 'Current Plan';
    if (plan === 'free') return 'Downgrade';
    if (currentPlan === 'free') return 'Upgrade';
    if (plan === 'teams' && currentPlan === 'pro') return 'Upgrade';
    return 'Switch';
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => plan === currentPlan;

  // Helper component to handle price conversion per plan
  const PlanPriceDisplay = ({ plan, billingCycle }: { plan: PlanInfo, billingCycle: BillingCycle }) => {
    // Only convert if not free
    const basePrice = plan.pricing ? (billingCycle === 'yearly' ? plan.pricing.yearly : plan.pricing.monthly) : 0;
    
    // Use the hook - ensure we check for free plan
    const { displayAmount } = useGlobalPricing(basePrice);
    
    if (!plan.pricing) return <Text style={[styles.price, { color: colors.text }]}>Free</Text>;
    
    const period = billingCycle === 'yearly' ? '/year' : '/month';
    return <Text style={[styles.price, { color: colors.text }]}>{displayAmount}{period}</Text>;
  };

  // Helper for savings display
  const SavingsDisplay = ({ plan }: { plan: PlanInfo }) => {
    // consistently call hook
    const monthlyTotal = plan.pricing ? plan.pricing.monthly * 12 : 0;
    const yearlyTotal = plan.pricing ? plan.pricing.yearly : 0;
    const savingsBase = Math.max(0, monthlyTotal - yearlyTotal);
    
    const { displayAmount } = useGlobalPricing(savingsBase);
    
    if (!plan.pricing || savingsBase <= 0) return null;
    
    return <Text style={[styles.savings, { color: Colors.success }]}>Save {displayAmount}/year</Text>;
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

    try {


      // 1. Get Plan Details & Dynamic Price
      const targetPlan = plans.find(p => p.id === plan);
      if (!targetPlan || !targetPlan.pricing) {
        throw new Error("Invalid plan selected");
      }
      
      const basePrice = billingCycle === 'yearly' ? targetPlan.pricing.yearly : targetPlan.pricing.monthly;
      const userCurrency = user?.defaultCurrency || 'USD';
      
      // Calculate local price (returns amount in subunits, e.g. paise)
      const localPrice = PricingService.calculateLocalPrice(basePrice * 100, userCurrency);

      // 2. Open Razorpay Checkout
      await PaymentService.startPayment({
        description: `${targetPlan.name} (${billingCycle})`,
        image: 'https://cdn-icons-png.flaticon.com/512/3177/3177440.png', // TripBuddy icon placeholder
        currency: localPrice.currency,
        amount: localPrice.amount, // already in subunits
        name: 'TripBuddy',
        prefill: {
          email: user?.email || 'user@example.com',
          contact: '', // can pull from profile if available
          name: user?.name || 'Traveler',
        },
        theme: { color: Colors.primary }
      });

      // 3. Success -> Update Subscription
      await upgradePlan(plan, billingCycle);
      Alert.alert('Success', `Welcome to ${targetPlan.name}!`);
      
    } catch (error: any) {
       // Handle Cancellation or Failure
       if (error.code && error.description) {
         Alert.alert('Payment Failed', error.description);
       } else {
         console.error(error);
         Alert.alert('Error', 'Something went wrong during checkout.');
       }
    } finally {
      setIsProcessing(false);
    }
  };



  return (
    <ScreenContainer padded backgroundColor={colors.background}>
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
            {/* Usage Stats (New) */}
            <View style={styles.usageStats}>
              <View style={styles.usageRow}>
                <Text style={[styles.usageLabel, { color: colors.textSecondary }]}>Trips Used</Text>
                <Text style={[styles.usageValue, { color: colors.text }]}>{usage.trips} / {currentPlanInfo?.limits?.maxTrips === Infinity ? '∞' : currentPlanInfo?.limits?.maxTrips}</Text>
              </View>
              {/* Add progress bar here if desired */}
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
            billingCycle={billingCycle}
            priceComponent={<PlanPriceDisplay plan={plan} billingCycle={billingCycle} />}
            savingsComponent={billingCycle === 'yearly' ? <SavingsDisplay plan={plan} /> : null}
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
    </ScreenContainer>
  );
}

// ============================================
// Plan Card Component
// ============================================

interface PlanCardProps {
  plan: PlanInfo;
  billingCycle: BillingCycle;
  priceComponent: React.ReactNode;
  savingsComponent: React.ReactNode;
  isCurrentPlan: boolean;
  buttonText: string;
  onSelect: () => void;
  isProcessing: boolean;
  colors: typeof Colors.light;
}

function PlanCard({
  plan,
  billingCycle,
  priceComponent,
  savingsComponent,
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
        {priceComponent}
        {savingsComponent}
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
    marginBottom: Spacing.md,
    // paddingHorizontal handled by ScreenContainer
    // paddingVertical handled by ScreenContainer top logic + marginBottom here
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
    paddingBottom: Spacing['2xl'],
    // paddingHorizontal handled by ScreenContainer
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
    paddingVertical: Spacing.xs,
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
    paddingHorizontal: Spacing['2xl'],
    paddingVertical: Spacing.xs,
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
    marginBottom: Spacing.xs,
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
  usageStats: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0,0,0,0.05)',
  },
  usageRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  usageLabel: {
    fontSize: FontSizes.caption,
  },
  usageValue: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
});
