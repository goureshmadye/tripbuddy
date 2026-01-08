import { PLANS, SubscriptionPlan } from '@/types/subscription';
import { useAuth } from './use-auth';
import { useTrips } from './use-trips';

export function useUsageLimits() {
  const { user } = useAuth();
  const { trips } = useTrips(); // We use the real-time count from useTrips for accuracy

  // Fallback to 'free' if subscriptionTier is missing or invalid
  const currentTier: SubscriptionPlan = (user as any)?.subscriptionTier || 'free';
  
  // Find the plan object from the PLANS array
  const plan = PLANS.find(p => p.id === currentTier) || PLANS.find(p => p.id === 'free')!;

  const getUsage = () => {
    return {
      trips: trips.length,
      // For other metrics like storage, we would rely on user.usageCounts
      // storageMB: (user?.usageCounts?.storageBytes || 0) / (1024 * 1024),
    };
  };

  /**
   * Check if a specific resource limit has been reached
   * Now mapped to the keys in the PlanLimits interface
   */
  const checkLimit = (resource: 'maxTrips' | 'maxCollaboratorsPerTrip' | 'maxExpensesPerTrip') => {
    const limit = plan.limits[resource];
    
    let currentUsage = 0;
    
    switch (resource) {
      case 'maxTrips':
        currentUsage = trips.length;
        break;
      // Other cases would query respective hooks
      default:
        currentUsage = 0; 
    }

    const isLimitReached = limit !== Infinity && currentUsage >= limit;
    
    return {
      allowed: !isLimitReached,
      limit,
      currentUsage,
      tier: currentTier,
    };
  };

  return {
    tier: currentTier,
    plan,
    checkLimit,
    usage: getUsage(),
  };
}
