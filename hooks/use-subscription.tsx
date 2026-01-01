import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import {
    cancelSubscription,
    checkCollaboratorLimit,
    checkDocumentLimit,
    checkExpenseLimit,
    checkFeatureAccess,
    checkTeamMemberLimit,
    createOrUpdateSubscription,
    getEffectivePlan,
    getPlanInfo,
    getPlanLimits,
    getTripUsage,
    reactivateSubscription,
    subscribeToSubscription,
} from '../services/subscription';
import {
    BillingCycle,
    FeatureAccess,
    GatedFeature,
    PlanInfo,
    PlanLimits,
    PLANS,
    SubscriptionPlan,
    TripUsage,
    UserSubscription,
} from '../types/subscription';
import { useAuth } from './use-auth';

// ============================================
// Context Types
// ============================================

interface SubscriptionContextType {
  // Subscription state
  subscription: UserSubscription | null;
  plan: SubscriptionPlan;
  planInfo: PlanInfo | undefined;
  limits: PlanLimits;
  isLoading: boolean;
  
  // Feature access
  checkFeature: (feature: GatedFeature) => FeatureAccess;
  checkCollaborators: (tripId: string, currentCount: number) => FeatureAccess;
  checkExpenses: (tripId: string, currentCount: number) => FeatureAccess;
  checkDocuments: (tripId: string, currentCount: number) => FeatureAccess;
  checkTeamMembers: (currentCount: number) => FeatureAccess;
  
  // Trip usage
  getTripUsageCounts: (tripId: string) => Promise<TripUsage>;
  tripUsageCache: Record<string, TripUsage>;
  refreshTripUsage: (tripId: string) => Promise<void>;
  
  // Plan management
  upgradePlan: (plan: SubscriptionPlan, billingCycle?: BillingCycle) => Promise<void>;
  cancelPlan: () => Promise<void>;
  reactivatePlan: () => Promise<void>;
  
  // UI helpers
  showUpgradePrompt: (feature: GatedFeature | string, requiredPlan?: SubscriptionPlan) => void;
  isPro: boolean;
  isTeams: boolean;
  isFree: boolean;
  daysUntilRenewal: number | null;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

// ============================================
// Provider Component
// ============================================

export function SubscriptionProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [subscription, setSubscription] = useState<UserSubscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tripUsageCache, setTripUsageCache] = useState<Record<string, TripUsage>>({});

  // Derive plan and limits
  const plan = getEffectivePlan(subscription);
  const planInfo = getPlanInfo(plan);
  const limits = getPlanLimits(plan);

  // Convenience flags
  const isPro = plan === 'pro' || plan === 'teams';
  const isTeams = plan === 'teams';
  const isFree = plan === 'free';

  // Calculate days until renewal
  const daysUntilRenewal = subscription?.currentPeriodEnd
    ? Math.ceil((subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  // Subscribe to subscription changes
  useEffect(() => {
    if (!user?.id) {
      setSubscription(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const unsubscribe = subscribeToSubscription(user.id, (sub) => {
      setSubscription(sub);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id]);

  // Feature access checks
  const checkFeature = useCallback(
    (feature: GatedFeature): FeatureAccess => {
      return checkFeatureAccess(plan, feature);
    },
    [plan]
  );

  const checkCollaborators = useCallback(
    (_tripId: string, currentCount: number): FeatureAccess => {
      return checkCollaboratorLimit(plan, currentCount);
    },
    [plan]
  );

  const checkExpenses = useCallback(
    (_tripId: string, currentCount: number): FeatureAccess => {
      return checkExpenseLimit(plan, currentCount);
    },
    [plan]
  );

  const checkDocuments = useCallback(
    (_tripId: string, currentCount: number): FeatureAccess => {
      return checkDocumentLimit(plan, currentCount);
    },
    [plan]
  );

  const checkTeamMembers = useCallback(
    (currentCount: number): FeatureAccess => {
      return checkTeamMemberLimit(plan, currentCount);
    },
    [plan]
  );

  // Trip usage tracking
  const getTripUsageCounts = useCallback(async (tripId: string): Promise<TripUsage> => {
    const usage = await getTripUsage(tripId);
    setTripUsageCache((prev) => ({ ...prev, [tripId]: usage }));
    return usage;
  }, []);

  const refreshTripUsage = useCallback(async (tripId: string): Promise<void> => {
    await getTripUsageCounts(tripId);
  }, [getTripUsageCounts]);

  // Plan management
  const upgradePlan = useCallback(
    async (newPlan: SubscriptionPlan, billingCycle: BillingCycle = 'monthly') => {
      if (!user?.id) {
        Alert.alert('Error', 'Please sign in to upgrade your plan');
        return;
      }

      try {
        // In a real app, this would integrate with Stripe or another payment provider
        // For now, we'll just update the subscription directly
        await createOrUpdateSubscription(user.id, newPlan, billingCycle);
        Alert.alert(
          'Plan Updated',
          `You've successfully ${newPlan === 'free' ? 'downgraded to' : 'upgraded to'} ${getPlanInfo(newPlan)?.name}`
        );
      } catch (error) {
        console.error('Failed to update plan:', error);
        Alert.alert('Error', 'Failed to update your plan. Please try again.');
      }
    },
    [user?.id]
  );

  const cancelPlan = useCallback(async () => {
    if (!user?.id) return;

    Alert.alert(
      'Cancel Subscription',
      'Your subscription will remain active until the end of the billing period. Are you sure?',
      [
        { text: 'Keep Subscription', style: 'cancel' },
        {
          text: 'Cancel Subscription',
          style: 'destructive',
          onPress: async () => {
            try {
              await cancelSubscription(user.id);
              Alert.alert(
                'Subscription Canceled',
                'Your subscription will remain active until the end of your billing period.'
              );
            } catch (error) {
              Alert.alert('Error', 'Failed to cancel subscription');
            }
          },
        },
      ]
    );
  }, [user?.id]);

  const reactivatePlan = useCallback(async () => {
    if (!user?.id) return;

    try {
      await reactivateSubscription(user.id);
      Alert.alert('Subscription Reactivated', 'Your subscription has been reactivated.');
    } catch (error) {
      Alert.alert('Error', 'Failed to reactivate subscription');
    }
  }, [user?.id]);

  // UI helper to show upgrade prompts
  const showUpgradePrompt = useCallback(
    (feature: GatedFeature | string, requiredPlan?: SubscriptionPlan) => {
      const targetPlan = requiredPlan || 'pro';
      const targetPlanInfo = getPlanInfo(targetPlan);

      Alert.alert(
        'Upgrade Required',
        `${feature} requires ${targetPlanInfo?.name || 'a higher plan'}. Upgrade now to unlock this feature!`,
        [
          { text: 'Not Now', style: 'cancel' },
          {
            text: 'View Plans',
            onPress: () => {
              // Navigation to subscription screen will be handled by the component
            },
          },
        ]
      );
    },
    []
  );

  return (
    <SubscriptionContext.Provider
      value={{
        subscription,
        plan,
        planInfo,
        limits,
        isLoading,
        checkFeature,
        checkCollaborators,
        checkExpenses,
        checkDocuments,
        checkTeamMembers,
        getTripUsageCounts,
        tripUsageCache,
        refreshTripUsage,
        upgradePlan,
        cancelPlan,
        reactivatePlan,
        showUpgradePrompt,
        isPro,
        isTeams,
        isFree,
        daysUntilRenewal,
      }}
    >
      {children}
    </SubscriptionContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useSubscription() {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
}

// ============================================
// Utility Hooks
// ============================================

/**
 * Hook to check if a specific feature is available
 */
export function useFeatureAccess(feature: GatedFeature): FeatureAccess & { isLoading: boolean } {
  const { checkFeature, isLoading } = useSubscription();
  return { ...checkFeature(feature), isLoading };
}

/**
 * Hook to get trip usage with caching
 */
export function useTripUsage(tripId: string): {
  usage: TripUsage | null;
  isLoading: boolean;
  refresh: () => Promise<void>;
  collaboratorAccess: FeatureAccess;
  expenseAccess: FeatureAccess;
  documentAccess: FeatureAccess;
} {
  const { tripUsageCache, getTripUsageCounts, checkCollaborators, checkExpenses, checkDocuments } = useSubscription();
  const [isLoading, setIsLoading] = useState(!tripUsageCache[tripId]);

  useEffect(() => {
    if (!tripUsageCache[tripId]) {
      setIsLoading(true);
      getTripUsageCounts(tripId).finally(() => setIsLoading(false));
    }
  }, [tripId, getTripUsageCounts, tripUsageCache]);

  const usage = tripUsageCache[tripId] || null;

  return {
    usage,
    isLoading,
    refresh: async () => {
      setIsLoading(true);
      await getTripUsageCounts(tripId);
      setIsLoading(false);
    },
    collaboratorAccess: checkCollaborators(tripId, usage?.collaboratorCount || 0),
    expenseAccess: checkExpenses(tripId, usage?.expenseCount || 0),
    documentAccess: checkDocuments(tripId, usage?.documentCount || 0),
  };
}

/**
 * Hook to get all available plans
 */
export function usePlans(): {
  plans: PlanInfo[];
  currentPlan: SubscriptionPlan;
  currentPlanInfo: PlanInfo | undefined;
} {
  const { plan, planInfo } = useSubscription();
  return {
    plans: PLANS,
    currentPlan: plan,
    currentPlanInfo: planInfo,
  };
}
