// ============================================
// Subscription Types for TripBuddy
// ============================================

export type SubscriptionPlan = 'free' | 'pro' | 'teams';

export type BillingCycle = 'monthly' | 'yearly';

export type SubscriptionStatus = 'active' | 'canceled' | 'expired' | 'past_due' | 'trialing';

// ============================================
// Plan Features & Limits
// ============================================

export interface PlanLimits {
  maxTrips: number;
  maxCollaboratorsPerTrip: number;
  maxExpensesPerTrip: number;
  maxDocumentsPerTrip: number;
  maxTeamMembers: number;
  offlineEditEnabled: boolean;
  aiSuggestionsEnabled: boolean;
  documentScanningEnabled: boolean;
  routeOptimizationEnabled: boolean;
  customThemesEnabled: boolean;
  advancedExportsEnabled: boolean;
  realTimeLocationEnabled: boolean;
  autoSplitExpensesEnabled: boolean;
  teamDashboardEnabled: boolean;
  sharedTemplatesEnabled: boolean;
  roleBased: boolean;
  prioritySupport: boolean;
  earlyAccess: boolean;
  bulkExportEnabled: boolean;
}

export interface PlanPricing {
  monthly: number;
  yearly: number;
  currency: string;
}

export interface PlanInfo {
  id: SubscriptionPlan;
  name: string;
  description: string;
  targetUsers: string;
  pricing: PlanPricing | null; // null for free plan
  limits: PlanLimits;
  features: string[];
  badge?: string;
  popular?: boolean;
}

// ============================================
// Plan Definitions
// ============================================

export const PLAN_LIMITS: Record<SubscriptionPlan, PlanLimits> = {
  free: {
    maxTrips: 3,
    maxCollaboratorsPerTrip: 2,
    maxExpensesPerTrip: 10,
    maxDocumentsPerTrip: 5,
    maxTeamMembers: 1,
    offlineEditEnabled: false,
    aiSuggestionsEnabled: false,
    documentScanningEnabled: false,
    routeOptimizationEnabled: false,
    customThemesEnabled: false,
    advancedExportsEnabled: false,
    realTimeLocationEnabled: false,
    autoSplitExpensesEnabled: false,
    teamDashboardEnabled: false,
    sharedTemplatesEnabled: false,
    roleBased: false,
    prioritySupport: false,
    earlyAccess: false,
    bulkExportEnabled: false,
  },
  pro: {
    maxTrips: Infinity,
    maxCollaboratorsPerTrip: Infinity,
    maxExpensesPerTrip: Infinity,
    maxDocumentsPerTrip: Infinity,
    maxTeamMembers: 1,
    offlineEditEnabled: true,
    aiSuggestionsEnabled: true,
    documentScanningEnabled: true,
    routeOptimizationEnabled: true,
    customThemesEnabled: true,
    advancedExportsEnabled: true,
    realTimeLocationEnabled: true,
    autoSplitExpensesEnabled: true,
    teamDashboardEnabled: false,
    sharedTemplatesEnabled: false,
    roleBased: false,
    prioritySupport: true,
    earlyAccess: true,
    bulkExportEnabled: false,
  },
  teams: {
    maxTrips: Infinity,
    maxCollaboratorsPerTrip: Infinity,
    maxExpensesPerTrip: Infinity,
    maxDocumentsPerTrip: Infinity,
    maxTeamMembers: 10,
    offlineEditEnabled: true,
    aiSuggestionsEnabled: true,
    documentScanningEnabled: true,
    routeOptimizationEnabled: true,
    customThemesEnabled: true,
    advancedExportsEnabled: true,
    realTimeLocationEnabled: true,
    autoSplitExpensesEnabled: true,
    teamDashboardEnabled: true,
    sharedTemplatesEnabled: true,
    roleBased: true,
    prioritySupport: true,
    earlyAccess: true,
    bulkExportEnabled: true,
  },
};

export const PLANS: PlanInfo[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'Perfect for solo travelers or casual trips',
    targetUsers: 'Solo travelers or casual trips',
    pricing: null,
    limits: PLAN_LIMITS.free,
    features: [
      'Up to 3 trips',
      'Up to 2 collaborators per trip',
      'Basic itinerary builder (Day, List, Map views)',
      '10 expense entries per trip',
      '5 document uploads per trip',
      'Offline access (read-only)',
      'Basic map routing and bookmarks',
    ],
  },
  {
    id: 'pro',
    name: 'TripBuddy Pro',
    description: 'For frequent travelers, families, and groups',
    targetUsers: 'Frequent travelers, families, and groups',
    pricing: {
      monthly: 4.99,
      yearly: 39,
      currency: 'USD',
    },
    limits: PLAN_LIMITS.pro,
    features: [
      'Everything in Free, plus:',
      'Unlimited collaborators',
      'Unlimited expense tracking',
      'Auto-split expense reports',
      'Full offline access with sync',
      'Real-time group location sharing',
      'Unlimited document uploads',
      'Document scanning',
      'AI-powered itinerary suggestions',
      'Route optimization',
      'Custom trip themes',
      'Export to PDF & Calendar',
      'Priority support',
      'Early access to new features',
    ],
    badge: 'Most Popular',
    popular: true,
  },
  {
    id: 'teams',
    name: 'TripBuddy Teams',
    description: 'For travel groups, tour operators, and agencies',
    targetUsers: 'Small travel groups, tour operators, agencies',
    pricing: {
      monthly: 9.99,
      yearly: 99,
      currency: 'USD',
    },
    limits: PLAN_LIMITS.teams,
    features: [
      'Everything in Pro, plus:',
      'Manage up to 10 team members',
      'Shared trip templates',
      'Team dashboard with calendar view',
      'Role-based permissions (Viewer, Editor)',
      'Bulk export and backup tools',
    ],
    badge: 'Best for Teams',
  },
];

// ============================================
// User Subscription
// ============================================

export interface UserSubscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
  // Payment provider info
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
}

// ============================================
// Feature Gating Types
// ============================================

export type GatedFeature = 
  | 'unlimited_collaborators'
  | 'unlimited_expenses'
  | 'unlimited_documents'
  | 'offline_edit'
  | 'ai_suggestions'
  | 'document_scanning'
  | 'route_optimization'
  | 'custom_themes'
  | 'advanced_exports'
  | 'realtime_location'
  | 'auto_split_expenses'
  | 'team_dashboard'
  | 'shared_templates'
  | 'role_based_access'
  | 'bulk_export'
  | 'priority_support';

export interface FeatureAccess {
  allowed: boolean;
  reason?: string;
  requiredPlan?: SubscriptionPlan;
  currentUsage?: number;
  limit?: number;
}

// Map features to the minimum plan required
export const FEATURE_REQUIREMENTS: Record<GatedFeature, SubscriptionPlan> = {
  unlimited_collaborators: 'pro',
  unlimited_expenses: 'pro',
  unlimited_documents: 'pro',
  offline_edit: 'pro',
  ai_suggestions: 'pro',
  document_scanning: 'pro',
  route_optimization: 'pro',
  custom_themes: 'pro',
  advanced_exports: 'pro',
  realtime_location: 'pro',
  auto_split_expenses: 'pro',
  team_dashboard: 'teams',
  shared_templates: 'teams',
  role_based_access: 'teams',
  bulk_export: 'teams',
  priority_support: 'pro',
};

// ============================================
// Usage Tracking
// ============================================

export interface TripUsage {
  tripId: string;
  collaboratorCount: number;
  expenseCount: number;
  documentCount: number;
}

export interface UsageStats {
  plan: SubscriptionPlan;
  limits: PlanLimits;
  tripUsage: Record<string, TripUsage>;
  teamMemberCount: number;
}

// ============================================
// Subscription Events
// ============================================

export type SubscriptionEventType = 
  | 'subscription_created'
  | 'subscription_updated'
  | 'subscription_canceled'
  | 'subscription_renewed'
  | 'plan_upgraded'
  | 'plan_downgraded'
  | 'payment_failed'
  | 'payment_succeeded';

export interface SubscriptionEvent {
  id: string;
  userId: string;
  type: SubscriptionEventType;
  previousPlan?: SubscriptionPlan;
  newPlan?: SubscriptionPlan;
  metadata?: Record<string, unknown>;
  createdAt: Date;
}
