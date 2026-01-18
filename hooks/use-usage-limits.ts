import { PLANS, SubscriptionPlan } from "@/types/subscription";
import { useAuth } from "./use-auth";
import {
    useTripCollaborators,
    useTripDocuments,
    useTripExpenses,
    useTrips,
} from "./use-trips";

export type ResourceType =
  | "maxTrips"
  | "maxCollaboratorsPerTrip"
  | "maxExpensesPerTrip"
  | "maxDocumentsPerTrip";

export function useUsageLimits(tripId?: string) {
  const { user } = useAuth();
  const { trips } = useTrips();

  // Per-trip resource hooks (only fetch if tripId is provided)
  const { collaborators } = useTripCollaborators(tripId);
  const { expenses } = useTripExpenses(tripId);
  const { documents } = useTripDocuments(tripId);

  // Fallback to 'free' if subscriptionTier is missing or invalid
  const currentTier: SubscriptionPlan =
    (user as any)?.subscriptionTier || "free";

  // Find the plan object from the PLANS array
  const plan =
    PLANS.find((p) => p.id === currentTier) ||
    PLANS.find((p) => p.id === "free")!;

  const getUsage = () => {
    return {
      trips: trips.length,
      collaborators: collaborators?.length || 0,
      expenses: expenses?.length || 0,
      documents: documents?.length || 0,
    };
  };

  /**
   * Check if a specific resource limit has been reached
   * For per-trip resources, tripId must be provided when calling the hook
   */
  const checkLimit = (resource: ResourceType) => {
    const limit = plan.limits[resource];

    let currentUsage = 0;

    switch (resource) {
      case "maxTrips":
        currentUsage = trips.length;
        break;
      case "maxCollaboratorsPerTrip":
        currentUsage = collaborators?.length || 0;
        break;
      case "maxExpensesPerTrip":
        currentUsage = expenses?.length || 0;
        break;
      case "maxDocumentsPerTrip":
        currentUsage = documents?.length || 0;
        break;
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

  /**
   * Check if a new resource can be created
   * Returns detailed information for showing upgrade prompts
   */
  const canCreate = (resource: ResourceType) => {
    const limitCheck = checkLimit(resource);

    const resourceLabels: Record<ResourceType, string> = {
      maxTrips: "trip",
      maxCollaboratorsPerTrip: "collaborator",
      maxExpensesPerTrip: "expense",
      maxDocumentsPerTrip: "document",
    };

    const resourceLabel = resourceLabels[resource];

    return {
      allowed: limitCheck.allowed,
      limit: limitCheck.limit,
      currentUsage: limitCheck.currentUsage,
      message: limitCheck.allowed
        ? `You can create more ${resourceLabel}s`
        : `You've reached the maximum of ${limitCheck.limit} ${resourceLabel}${limitCheck.limit > 1 ? "s" : ""} on ${plan.name}.`,
      requiredPlan:
        currentTier === "free"
          ? ("pro" as SubscriptionPlan)
          : ("teams" as SubscriptionPlan),
    };
  };

  return {
    tier: currentTier,
    plan,
    checkLimit,
    canCreate,
    usage: getUsage(),
  };
}
