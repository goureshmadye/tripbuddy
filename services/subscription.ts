import {
    collection,
    doc,
    getDoc,
    getDocs,
    onSnapshot,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { COLLECTIONS } from '../types/database';
import {
    BillingCycle,
    FEATURE_REQUIREMENTS,
    FeatureAccess,
    GatedFeature,
    PLAN_LIMITS,
    PlanLimits,
    PLANS,
    SubscriptionPlan,
    SubscriptionStatus,
    TripUsage,
    UserSubscription,
} from '../types/subscription';

// ============================================
// Collection Reference
// ============================================

const SUBSCRIPTIONS_COLLECTION = 'subscriptions';
const subscriptionsCollection = collection(firestore, SUBSCRIPTIONS_COLLECTION);

// ============================================
// Subscription CRUD
// ============================================

/**
 * Get user's subscription
 */
export async function getUserSubscription(userId: string): Promise<UserSubscription | null> {
  const docRef = doc(firestore, SUBSCRIPTIONS_COLLECTION, userId);
  const docSnap = await getDoc(docRef);
  
  if (!docSnap.exists()) {
    return null;
  }
  
  const data = docSnap.data();
  return {
    ...data,
    id: docSnap.id,
    currentPeriodStart: data.currentPeriodStart?.toDate(),
    currentPeriodEnd: data.currentPeriodEnd?.toDate(),
    createdAt: data.createdAt?.toDate(),
    updatedAt: data.updatedAt?.toDate(),
  } as UserSubscription;
}

/**
 * Create or update user subscription
 */
export async function createOrUpdateSubscription(
  userId: string,
  plan: SubscriptionPlan,
  billingCycle: BillingCycle = 'monthly'
): Promise<UserSubscription> {
  const now = new Date();
  const periodEnd = new Date(now);
  
  if (billingCycle === 'monthly') {
    periodEnd.setMonth(periodEnd.getMonth() + 1);
  } else {
    periodEnd.setFullYear(periodEnd.getFullYear() + 1);
  }

  const subscriptionData = {
    userId,
    plan,
    status: 'active' as SubscriptionStatus,
    billingCycle,
    currentPeriodStart: Timestamp.fromDate(now),
    currentPeriodEnd: Timestamp.fromDate(periodEnd),
    cancelAtPeriodEnd: false,
    updatedAt: Timestamp.now(),
  };

  const docRef = doc(firestore, SUBSCRIPTIONS_COLLECTION, userId);
  const existingDoc = await getDoc(docRef);

  if (existingDoc.exists()) {
    await updateDoc(docRef, subscriptionData);
  } else {
    await setDoc(docRef, {
      ...subscriptionData,
      createdAt: Timestamp.now(),
    });
  }

  return {
    id: userId,
    ...subscriptionData,
    currentPeriodStart: now,
    currentPeriodEnd: periodEnd,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Cancel subscription (will remain active until period end)
 */
export async function cancelSubscription(userId: string): Promise<void> {
  const docRef = doc(firestore, SUBSCRIPTIONS_COLLECTION, userId);
  await updateDoc(docRef, {
    cancelAtPeriodEnd: true,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Reactivate a canceled subscription
 */
export async function reactivateSubscription(userId: string): Promise<void> {
  const docRef = doc(firestore, SUBSCRIPTIONS_COLLECTION, userId);
  await updateDoc(docRef, {
    cancelAtPeriodEnd: false,
    updatedAt: Timestamp.now(),
  });
}

/**
 * Subscribe to subscription changes
 */
export function subscribeToSubscription(
  userId: string,
  callback: (subscription: UserSubscription | null) => void
): () => void {
  const docRef = doc(firestore, SUBSCRIPTIONS_COLLECTION, userId);
  
  return onSnapshot(
    docRef, 
    (docSnap) => {
      if (!docSnap.exists()) {
        callback(null);
        return;
      }
      
      const data = docSnap.data();
      callback({
        ...data,
        id: docSnap.id,
        currentPeriodStart: data.currentPeriodStart?.toDate(),
        currentPeriodEnd: data.currentPeriodEnd?.toDate(),
        createdAt: data.createdAt?.toDate(),
        updatedAt: data.updatedAt?.toDate(),
      } as UserSubscription);
    },
    (error) => {
      // Silently handle permission errors (expected when user is not authenticated)
      if ((error as any).code !== 'permission-denied') {
        console.error('Error listening to subscription:', error);
      }
      callback(null);
    }
  );
}

// ============================================
// Plan Helpers
// ============================================

/**
 * Get the effective plan for a user (defaults to free)
 */
export function getEffectivePlan(subscription: UserSubscription | null): SubscriptionPlan {
  if (!subscription) return 'free';
  
  // Check if subscription is expired
  if (subscription.currentPeriodEnd < new Date() && subscription.status !== 'active') {
    return 'free';
  }
  
  // Check if subscription is in a valid state
  if (['active', 'trialing'].includes(subscription.status)) {
    return subscription.plan;
  }
  
  return 'free';
}

/**
 * Get plan limits for a subscription
 */
export function getPlanLimits(plan: SubscriptionPlan): PlanLimits {
  return PLAN_LIMITS[plan];
}

/**
 * Get plan info
 */
export function getPlanInfo(plan: SubscriptionPlan) {
  return PLANS.find(p => p.id === plan);
}

/**
 * Check if a plan is higher than another
 */
export function isPlanHigherThan(plan1: SubscriptionPlan, plan2: SubscriptionPlan): boolean {
  const planOrder: SubscriptionPlan[] = ['free', 'pro', 'teams'];
  return planOrder.indexOf(plan1) > planOrder.indexOf(plan2);
}

/**
 * Get the minimum plan required for a feature
 */
export function getRequiredPlanForFeature(feature: GatedFeature): SubscriptionPlan {
  return FEATURE_REQUIREMENTS[feature];
}

// ============================================
// Feature Access Checks
// ============================================

/**
 * Check if a feature is accessible with the current plan
 */
export function checkFeatureAccess(
  plan: SubscriptionPlan,
  feature: GatedFeature
): FeatureAccess {
  const requiredPlan = FEATURE_REQUIREMENTS[feature];
  const planOrder: SubscriptionPlan[] = ['free', 'pro', 'teams'];
  
  const currentPlanIndex = planOrder.indexOf(plan);
  const requiredPlanIndex = planOrder.indexOf(requiredPlan);
  
  if (currentPlanIndex >= requiredPlanIndex) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    reason: `This feature requires ${getPlanInfo(requiredPlan)?.name || requiredPlan} plan`,
    requiredPlan,
  };
}

/**
 * Check if user can add more collaborators to a trip
 */
export function checkCollaboratorLimit(
  plan: SubscriptionPlan,
  currentCount: number
): FeatureAccess {
  const limits = getPlanLimits(plan);
  
  if (limits.maxCollaboratorsPerTrip === Infinity) {
    return { allowed: true, currentUsage: currentCount };
  }
  
  if (currentCount >= limits.maxCollaboratorsPerTrip) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxCollaboratorsPerTrip} collaborators per trip`,
      requiredPlan: 'pro',
      currentUsage: currentCount,
      limit: limits.maxCollaboratorsPerTrip,
    };
  }
  
  return {
    allowed: true,
    currentUsage: currentCount,
    limit: limits.maxCollaboratorsPerTrip,
  };
}

/**
 * Check if user can add more expenses to a trip
 */
export function checkExpenseLimit(
  plan: SubscriptionPlan,
  currentCount: number
): FeatureAccess {
  const limits = getPlanLimits(plan);
  
  if (limits.maxExpensesPerTrip === Infinity) {
    return { allowed: true, currentUsage: currentCount };
  }
  
  if (currentCount >= limits.maxExpensesPerTrip) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxExpensesPerTrip} expenses per trip`,
      requiredPlan: 'pro',
      currentUsage: currentCount,
      limit: limits.maxExpensesPerTrip,
    };
  }
  
  return {
    allowed: true,
    currentUsage: currentCount,
    limit: limits.maxExpensesPerTrip,
  };
}

/**
 * Check if user can upload more documents to a trip
 */
export function checkDocumentLimit(
  plan: SubscriptionPlan,
  currentCount: number
): FeatureAccess {
  const limits = getPlanLimits(plan);
  
  if (limits.maxDocumentsPerTrip === Infinity) {
    return { allowed: true, currentUsage: currentCount };
  }
  
  if (currentCount >= limits.maxDocumentsPerTrip) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxDocumentsPerTrip} documents per trip`,
      requiredPlan: 'pro',
      currentUsage: currentCount,
      limit: limits.maxDocumentsPerTrip,
    };
  }
  
  return {
    allowed: true,
    currentUsage: currentCount,
    limit: limits.maxDocumentsPerTrip,
  };
}

/**
 * Check if user can add more team members
 */
export function checkTeamMemberLimit(
  plan: SubscriptionPlan,
  currentCount: number
): FeatureAccess {
  const limits = getPlanLimits(plan);
  
  if (currentCount >= limits.maxTeamMembers) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxTeamMembers} team members`,
      requiredPlan: 'teams',
      currentUsage: currentCount,
      limit: limits.maxTeamMembers,
    };
  }
  
  return {
    allowed: true,
    currentUsage: currentCount,
    limit: limits.maxTeamMembers,
  };
}

// ============================================
// Usage Tracking
// ============================================

/**
 * Get trip usage counts
 */
export async function getTripUsage(tripId: string): Promise<TripUsage> {
  const [collaboratorsSnapshot, expensesSnapshot, documentsSnapshot] = await Promise.all([
    getDocs(query(
      collection(firestore, COLLECTIONS.TRIP_COLLABORATORS),
      where('tripId', '==', tripId)
    )),
    getDocs(query(
      collection(firestore, COLLECTIONS.EXPENSES),
      where('tripId', '==', tripId)
    )),
    getDocs(query(
      collection(firestore, COLLECTIONS.DOCUMENTS),
      where('tripId', '==', tripId)
    )),
  ]);
  
  return {
    tripId,
    collaboratorCount: collaboratorsSnapshot.size,
    expenseCount: expensesSnapshot.size,
    documentCount: documentsSnapshot.size,
  };
}

// ============================================
// Downgrade Handling
// ============================================

/**
 * Check if downgrade will affect existing data
 */
export async function checkDowngradeImpact(
  userId: string,
  newPlan: SubscriptionPlan
): Promise<{
  hasImpact: boolean;
  affectedTrips: Array<{
    tripId: string;
    tripTitle: string;
    issues: string[];
  }>;
}> {
  const newLimits = getPlanLimits(newPlan);
  const affectedTrips: Array<{ tripId: string; tripTitle: string; issues: string[] }> = [];
  
  // Get all trips for user
  const tripsSnapshot = await getDocs(query(
    collection(firestore, COLLECTIONS.TRIPS),
    where('creatorId', '==', userId)
  ));
  
  for (const tripDoc of tripsSnapshot.docs) {
    const tripData = tripDoc.data();
    const usage = await getTripUsage(tripDoc.id);
    const issues: string[] = [];
    
    if (newLimits.maxCollaboratorsPerTrip !== Infinity && 
        usage.collaboratorCount > newLimits.maxCollaboratorsPerTrip) {
      issues.push(`Has ${usage.collaboratorCount} collaborators (limit: ${newLimits.maxCollaboratorsPerTrip})`);
    }
    
    if (newLimits.maxExpensesPerTrip !== Infinity && 
        usage.expenseCount > newLimits.maxExpensesPerTrip) {
      issues.push(`Has ${usage.expenseCount} expenses (limit: ${newLimits.maxExpensesPerTrip})`);
    }
    
    if (newLimits.maxDocumentsPerTrip !== Infinity && 
        usage.documentCount > newLimits.maxDocumentsPerTrip) {
      issues.push(`Has ${usage.documentCount} documents (limit: ${newLimits.maxDocumentsPerTrip})`);
    }
    
    if (issues.length > 0) {
      affectedTrips.push({
        tripId: tripDoc.id,
        tripTitle: tripData.title,
        issues,
      });
    }
  }
  
  return {
    hasImpact: affectedTrips.length > 0,
    affectedTrips,
  };
}

// ============================================
// Plan Comparison
// ============================================

/**
 * Get features that differ between two plans
 */
export function getFeatureDifferences(
  fromPlan: SubscriptionPlan,
  toPlan: SubscriptionPlan
): {
  gained: string[];
  lost: string[];
} {
  const fromInfo = getPlanInfo(fromPlan);
  const toInfo = getPlanInfo(toPlan);
  
  if (!fromInfo || !toInfo) {
    return { gained: [], lost: [] };
  }
  
  // For upgrade, show what they gain
  const isUpgrade = isPlanHigherThan(toPlan, fromPlan);
  
  if (isUpgrade) {
    return {
      gained: toInfo.features.filter(f => !f.includes('Everything in')),
      lost: [],
    };
  }
  
  // For downgrade, show what they lose
  return {
    gained: [],
    lost: fromInfo.features.filter(f => !f.includes('Everything in')),
  };
}
