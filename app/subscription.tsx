import { ScreenContainer } from "@/components/screen-container";
import {
    BorderRadius,
    Colors,
    FontSizes,
    FontWeights,
    Spacing,
} from "@/constants/theme";
import { useAuth } from "@/hooks/use-auth";
import { useGlobalPricing } from "@/hooks/use-global-pricing";
import { usePlans, useSubscription } from "@/hooks/use-subscription";
import { useAppColorScheme } from "@/hooks/use-theme";
import { useUsageLimits } from "@/hooks/use-usage-limits";
import { PaymentService } from "@/services/payment";
import { PricingService } from "@/services/pricing";
import { BillingCycle, PlanInfo, SubscriptionPlan } from "@/types/subscription";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
    Alert,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

export default function SubscriptionScreen() {
  const router = useRouter();
  const colorScheme = useAppColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;

  const { user } = useAuth();
  const { plans, currentPlan, currentPlanInfo } = usePlans();
  const {
    subscription,
    upgradePlan,
    cancelPlan,
    reactivatePlan,
    daysUntilRenewal,
  } = useSubscription();
  const { usage } = useUsageLimits();

  const [billingCycle, setBillingCycle] = useState<BillingCycle>("yearly");
  const [isProcessing, setIsProcessing] = useState(false);

  const getButtonText = (plan: SubscriptionPlan) => {
    if (plan === currentPlan) return "Current Plan";
    if (plan === "free") return "Downgrade";
    if (currentPlan === "free") return "Start Free Trial";
    if (plan === "teams" && currentPlan === "pro") return "Upgrade";
    return "Switch";
  };

  const isCurrentPlan = (plan: SubscriptionPlan) => plan === currentPlan;

  // Helper component to handle price conversion per plan
  const PlanPriceDisplay = ({
    plan,
    billingCycle,
  }: {
    plan: PlanInfo;
    billingCycle: BillingCycle;
  }) => {
    // Only convert if not free
    const basePrice = plan.pricing
      ? billingCycle === "yearly"
        ? plan.pricing.yearly
        : plan.pricing.monthly
      : 0;

    // Use the hook - ensure we check for free plan
    const { displayAmount } = useGlobalPricing(basePrice);

    if (!plan.pricing)
      return <Text style={[styles.price, { color: colors.text }]}>Free</Text>;

    const period = billingCycle === "yearly" ? "/year" : "/month";
    return (
      <View style={styles.priceRow}>
        <Text style={[styles.price, { color: colors.text }]}>
          {displayAmount}
        </Text>
        <Text style={[styles.pricePeriod, { color: colors.textSecondary }]}>
          {period}
        </Text>
      </View>
    );
  };

  // Helper for per-day pricing
  const PerDayPricing = ({
    plan,
    billingCycle,
  }: {
    plan: PlanInfo;
    billingCycle: BillingCycle;
  }) => {
    const basePrice = plan.pricing
      ? billingCycle === "yearly"
        ? plan.pricing.yearly / 12
        : plan.pricing.monthly
      : 0;

    const perDay = basePrice / 30;
    const { displayAmount } = useGlobalPricing(perDay);

    if (!plan.pricing) return null;

    return (
      <Text style={[styles.perDayText, { color: colors.textMuted }]}>
        Only {displayAmount}/day
      </Text>
    );
  };

  const handleSelectPlan = async (plan: SubscriptionPlan) => {
    if (plan === currentPlan) return;

    if (plan === "free") {
      // Downgrade confirmation
      Alert.alert(
        "Downgrade to Free",
        "You will lose access to premium features. Your current subscription will remain active until the end of the billing period. Are you sure?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Downgrade",
            style: "destructive",
            onPress: async () => {
              setIsProcessing(true);
              await upgradePlan("free", billingCycle);
              setIsProcessing(false);
            },
          },
        ],
      );
      return;
    }

    // Upgrade flow
    setIsProcessing(true);

    try {
      // 1. Get Plan Details & Dynamic Price
      const targetPlan = plans.find((p) => p.id === plan);
      if (!targetPlan || !targetPlan.pricing) {
        throw new Error("Invalid plan selected");
      }

      const basePrice =
        billingCycle === "yearly"
          ? targetPlan.pricing.yearly
          : targetPlan.pricing.monthly;
      const userCurrency = user?.defaultCurrency || "USD";

      // Calculate local price (returns amount in subunits, e.g. paise)
      const localPrice = PricingService.calculateLocalPrice(
        basePrice * 100,
        userCurrency,
      );

      // 2. Open Razorpay Checkout
      await PaymentService.startPayment({
        description: `${targetPlan.name} (${billingCycle})`,
        image: "https://cdn-icons-png.flaticon.com/512/3177/3177440.png", // TripBuddy icon placeholder
        currency: localPrice.currency,
        amount: localPrice.amount, // already in subunits
        name: "TripBuddy",
        prefill: {
          email: user?.email || "user@example.com",
          contact: "", // can pull from profile if available
          name: user?.name || "Traveler",
        },
        theme: { color: Colors.primary },
      });

      // 3. Success -> Update Subscription
      await upgradePlan(plan, billingCycle);
      Alert.alert("Success", `Welcome to ${targetPlan.name}!`);
    } catch (error: any) {
      // Handle Cancellation or Failure
      if (error.code && error.description) {
        Alert.alert("Payment Failed", error.description);
      } else {
        console.error(error);
        Alert.alert("Error", "Something went wrong during checkout.");
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const savingsPercentage = 35; // Calculate based on plans if needed

  return (
    <ScreenContainer padded backgroundColor={colors.background}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backButton}
        >
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <Text style={[styles.heroTitle, { color: colors.text }]}>
            Unlock Your Perfect Trip
          </Text>
          <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
            Choose the plan that fits your travel style
          </Text>
        </View>

        {/* Billing Toggle */}
        <View style={styles.billingToggleContainer}>
          <TouchableOpacity
            style={[
              styles.billingOption,
              billingCycle === "monthly" && {
                backgroundColor: isDark
                  ? colors.backgroundTertiary
                  : colors.backgroundSecondary,
              },
            ]}
            onPress={() => setBillingCycle("monthly")}
          >
            <Text
              style={[
                styles.billingOptionText,
                {
                  color:
                    billingCycle === "monthly" ? colors.text : colors.textMuted,
                  fontWeight:
                    billingCycle === "monthly"
                      ? FontWeights.semibold
                      : FontWeights.regular,
                },
              ]}
            >
              Monthly
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.billingOption,
              billingCycle === "yearly" && {
                backgroundColor: isDark
                  ? colors.backgroundTertiary
                  : colors.backgroundSecondary,
              },
            ]}
            onPress={() => setBillingCycle("yearly")}
          >
            <Text
              style={[
                styles.billingOptionText,
                {
                  color:
                    billingCycle === "yearly" ? colors.text : colors.textMuted,
                  fontWeight:
                    billingCycle === "yearly"
                      ? FontWeights.semibold
                      : FontWeights.regular,
                },
              ]}
            >
              Yearly
            </Text>
            <View style={styles.discountBadge}>
              <Text style={styles.discountBadgeText}>
                {savingsPercentage}% OFF
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Current Plan Status Badge (if applicable) */}
        {subscription && currentPlan !== "free" && (
          <View
            style={[
              styles.currentPlanBanner,
              {
                backgroundColor: Colors.primary + "15",
                borderColor: Colors.primary + "30",
              },
            ]}
          >
            <Ionicons
              name="checkmark-circle"
              size={20}
              color={Colors.primary}
            />
            <Text style={[styles.currentPlanText, { color: colors.text }]}>
              You're on {currentPlanInfo?.name}
            </Text>
            <Text
              style={[
                styles.currentPlanSubtext,
                { color: colors.textSecondary },
              ]}
            >
              {subscription.cancelAtPeriodEnd
                ? `Cancels in ${daysUntilRenewal} days`
                : `Renews in ${daysUntilRenewal} days`}
            </Text>
          </View>
        )}

        {/* Plans */}
        {plans.map((plan) => {
          const isPro = plan.id === "pro";
          const isTeams = plan.id === "teams";
          const accentColor = isTeams ? "#F97316" : Colors.primary;
          const isCurrent = isCurrentPlan(plan.id);

          return (
            <View
              key={plan.id}
              style={[
                styles.planCard,
                {
                  backgroundColor: colors.card,
                  borderColor: isCurrent ? accentColor : colors.border,
                  borderWidth: isCurrent ? 2 : 1,
                },
              ]}
            >
              {/* Gradient border effect for popular plans */}
              {plan.popular && !isCurrent && (
                <LinearGradient
                  colors={[accentColor + "40", accentColor + "10"]}
                  style={styles.gradientBorder}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                />
              )}

              {/* Badge */}
              {plan.badge && (
                <View
                  style={[styles.planBadge, { backgroundColor: accentColor }]}
                >
                  <Text style={styles.planBadgeText}>{plan.badge}</Text>
                </View>
              )}

              {/* Card Content */}
              <View style={styles.planContent}>
                {/* Header */}
                <View style={styles.planHeaderSection}>
                  <View style={styles.planTitleRow}>
                    <Text style={[styles.planName, { color: colors.text }]}>
                      {plan.name}
                    </Text>
                    {isCurrent && (
                      <View
                        style={[
                          styles.currentBadge,
                          { backgroundColor: accentColor + "20" },
                        ]}
                      >
                        <Text
                          style={[
                            styles.currentBadgeText,
                            { color: accentColor },
                          ]}
                        >
                          Current
                        </Text>
                      </View>
                    )}
                  </View>
                  <Text
                    style={[
                      styles.planDescription,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {plan.description}
                  </Text>
                </View>

                {/* Pricing Section */}
                <View style={styles.pricingSection}>
                  <PlanPriceDisplay plan={plan} billingCycle={billingCycle} />
                  <PerDayPricing plan={plan} billingCycle={billingCycle} />
                </View>

                {/* Features List */}
                <View style={styles.featuresList}>
                  {plan.features.slice(0, 7).map((feature, index) => (
                    <View key={index} style={styles.featureItem}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color={accentColor}
                        style={styles.featureIcon}
                      />
                      <Text
                        style={[
                          styles.featureText,
                          { color: colors.textSecondary },
                        ]}
                      >
                        {feature}
                      </Text>
                    </View>
                  ))}
                  {plan.features.length > 7 && (
                    <Text style={[styles.moreFeatures, { color: accentColor }]}>
                      +{plan.features.length - 7} more features
                    </Text>
                  )}
                </View>

                {/* CTA Button */}
                <TouchableOpacity
                  style={[
                    styles.ctaButton,
                    {
                      backgroundColor: isCurrent ? "transparent" : accentColor,
                      borderWidth: isCurrent ? 1 : 0,
                      borderColor: isCurrent ? colors.border : "transparent",
                    },
                  ]}
                  onPress={() => handleSelectPlan(plan.id)}
                  disabled={isCurrent || isProcessing}
                  activeOpacity={0.8}
                >
                  <Text
                    style={[
                      styles.ctaButtonText,
                      { color: isCurrent ? colors.textMuted : "#FFFFFF" },
                    ]}
                  >
                    {getButtonText(plan.id)}
                  </Text>
                </TouchableOpacity>

                {/* Free trial note */}
                {!isCurrent && plan.id !== "free" && currentPlan === "free" && (
                  <Text style={[styles.trialNote, { color: colors.textMuted }]}>
                    14 days free, then{" "}
                    {billingCycle === "yearly"
                      ? "billed annually"
                      : "billed monthly"}
                  </Text>
                )}
              </View>
            </View>
          );
        })}

        {/* FAQ Section */}
        <View style={styles.faqSection}>
          <Text style={[styles.faqTitle, { color: colors.text }]}>
            Frequently Asked Questions
          </Text>

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
            question="How does the 14-day trial work?"
            answer="Start using TripBuddy Pro features immediately. You won't be charged until after 14 days. Cancel anytime during the trial period at no cost."
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
        <Text style={[styles.faqQuestionText, { color: colors.text }]}>
          {question}
        </Text>
        <Ionicons
          name={isExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color={colors.textMuted}
        />
      </View>
      {isExpanded && (
        <Text style={[styles.faqAnswer, { color: colors.textSecondary }]}>
          {answer}
        </Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: Spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing["2xl"],
  },

  // Hero Section
  heroSection: {
    alignItems: "center",
    marginBottom: Spacing.xl,
  },
  heroTitle: {
    fontSize: 32,
    fontWeight: FontWeights.bold,
    textAlign: "center",
    marginBottom: Spacing.sm,
    lineHeight: 38,
  },
  heroSubtitle: {
    fontSize: FontSizes.body,
    textAlign: "center",
    lineHeight: 22,
  },

  // Billing Toggle
  billingToggleContainer: {
    flexDirection: "row",
    backgroundColor: "transparent",
    borderRadius: BorderRadius.medium,
    padding: 4,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  billingOption: {
    flex: 1,
    paddingVertical: Spacing.sm + 2,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.small,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  billingOptionText: {
    fontSize: FontSizes.body,
  },
  discountBadge: {
    position: "absolute",
    top: -8,
    right: -4,
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: BorderRadius.small,
  },
  discountBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: FontWeights.bold,
  },

  // Current Plan Banner
  currentPlanBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    borderRadius: BorderRadius.medium,
    borderWidth: 1,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  currentPlanText: {
    fontSize: FontSizes.bodySmall,
    fontWeight: FontWeights.semibold,
    flex: 1,
  },
  currentPlanSubtext: {
    fontSize: FontSizes.caption,
  },

  // Plan Card
  planCard: {
    borderRadius: BorderRadius.large,
    marginBottom: Spacing.lg,
    overflow: "hidden",
    position: "relative",
  },
  gradientBorder: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: BorderRadius.large,
  },
  planBadge: {
    position: "absolute",
    top: 16,
    right: -28,
    paddingHorizontal: 32,
    paddingVertical: 6,
    transform: [{ rotate: "45deg" }],
    zIndex: 10,
  },
  planBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: FontWeights.bold,
    textAlign: "center",
  },
  planContent: {
    padding: Spacing.cardPadding + 4,
  },

  // Plan Header
  planHeaderSection: {
    marginBottom: Spacing.md,
  },
  planTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: Spacing.xs,
    gap: Spacing.sm,
  },
  planName: {
    fontSize: FontSizes.heading3,
    fontWeight: FontWeights.bold,
  },
  currentBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.small,
  },
  currentBadgeText: {
    fontSize: FontSizes.caption,
    fontWeight: FontWeights.semibold,
  },
  planDescription: {
    fontSize: FontSizes.bodySmall,
    lineHeight: 20,
  },

  // Pricing Section
  pricingSection: {
    marginBottom: Spacing.lg,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.xs,
  },
  price: {
    fontSize: 42,
    fontWeight: FontWeights.bold,
    letterSpacing: -1,
  },
  pricePeriod: {
    fontSize: FontSizes.body,
    marginLeft: Spacing.xs,
    fontWeight: FontWeights.medium,
  },
  perDayText: {
    fontSize: FontSizes.bodySmall,
  },

  // Features List
  featuresList: {
    marginBottom: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: Spacing.sm,
  },
  featureIcon: {
    marginRight: Spacing.sm,
    marginTop: 2,
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

  // CTA Button
  ctaButton: {
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.medium,
    alignItems: "center",
    justifyContent: "center",
  },
  ctaButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.semibold,
  },
  trialNote: {
    fontSize: FontSizes.caption,
    textAlign: "center",
    marginTop: Spacing.sm,
  },

  // FAQ
  faqSection: {
    marginTop: Spacing.xl,
    marginBottom: Spacing.lg,
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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

  // Restore Button
  restoreButton: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  restoreButtonText: {
    fontSize: FontSizes.body,
    fontWeight: FontWeights.medium,
  },
});
