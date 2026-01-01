// Database Types for TripBuddy (Firestore)

// ============================================
// 4.1 Core Tables (Collections)
// ============================================

export interface User {
  id: string;
  name: string;
  email: string;
  profilePhoto?: string | null;
  defaultCurrency: string;
  homeCountry?: string | null;
  onboardingComplete?: boolean;
  walkthroughComplete?: boolean;
  createdAt: Date;
}

export interface Trip {
  id: string;
  title: string;
  destination?: string | null;
  destinationPlaceId?: string | null;
  destinationLat?: number | null;
  destinationLng?: number | null;
  startDate: Date;
  endDate: Date;
  creatorId: string;
  currency?: string | null;
  transportationMode?: string | null;
  tripType?: string | null;
  budgetRange?: string | null;
  travelerCount?: string | null;
  accommodationType?: string | null;
  createdAt: Date;
}

export type CollaboratorRole = 'viewer' | 'editor' | 'owner';

export interface TripCollaborator {
  id: string;
  tripId: string;
  userId: string;
  role: CollaboratorRole;
}

export type InvitationStatus = 'pending' | 'accepted' | 'declined' | 'expired';

export interface TripInvitation {
  id: string;
  tripId: string;
  invitedEmail: string;
  invitedUserId?: string | null; // Set when user exists in system
  invitedBy: string; // User ID of inviter
  role: CollaboratorRole;
  status: InvitationStatus;
  inviteCode: string; // Unique code for joining
  expiresAt: Date;
  createdAt: Date;
  respondedAt?: Date | null;
}

// ============================================
// 4.2 Itinerary & Logistics
// ============================================

export type ItineraryCategory = 'activity' | 'food' | 'transport' | 'accommodation' | 'sightseeing' | 'other';

export interface ItineraryItem {
  id: string;
  tripId: string;
  title: string;
  description?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  category?: ItineraryCategory | string | null;
  startTime?: Date | null;
  endTime?: Date | null;
  addedBy: string;
  createdAt: Date;
}

export interface UserLocation {
  id: string; // composite: `${userId}_${tripId}`
  userId: string;
  tripId: string;
  latitude: number;
  longitude: number;
  lastUpdated: Date;
}

// ============================================
// 4.3 Financials & Assets
// ============================================

export interface Expense {
  id: string;
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category?: 'food' | 'transport' | 'accommodation' | 'activities' | 'shopping' | 'other';
  createdAt: Date;
  updatedAt: Date;
}

export interface ExpenseShare {
  id: string;
  expenseId: string;
  userId: string;
  shareAmount: number;
}

export type DocumentType = 'flight' | 'hotel' | 'activity' | 'other';

export interface TripDocument {
  id: string;
  tripId: string;
  uploadedBy: string;
  fileUrl: string; // Link to Firebase Storage
  label?: string | null;
  type?: DocumentType | string | null;
  createdAt: Date;
}

// ============================================
// Firestore Collection Names
// ============================================

// ============================================
// 4.4 Notifications
// ============================================

export type NotificationType = 
  | 'collaborator_added'
  | 'collaborator_removed'
  | 'collaborator_role_changed'
  | 'trip_invitation'
  | 'invitation_accepted'
  | 'expense_added'
  | 'expense_updated'
  | 'itinerary_added'
  | 'itinerary_updated'
  | 'trip_updated'
  | 'system'
  | 'reminder';

export interface Notification {
  id: string;
  userId: string; // Recipient user ID
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  // Related entity references
  tripId?: string | null;
  expenseId?: string | null;
  itineraryId?: string | null;
  invitationId?: string | null;
  // Actor who triggered the notification
  actorId?: string | null;
  actorName?: string | null;
  // Metadata for grouping similar notifications
  groupKey?: string | null;
  // Timestamps
  createdAt: Date;
  readAt?: Date | null;
}

export const COLLECTIONS = {
  USERS: 'users',
  TRIPS: 'trips',
  TRIP_COLLABORATORS: 'tripCollaborators',
  TRIP_INVITATIONS: 'tripInvitations',
  ITINERARY_ITEMS: 'itineraryItems',
  USER_LOCATIONS: 'userLocations',
  EXPENSES: 'expenses',
  EXPENSE_SHARES: 'expenseShares',
  DOCUMENTS: 'documents',
  NOTIFICATIONS: 'notifications',
} as const;

// ============================================
// Utility Types
// ============================================

// Trip with related data
export interface TripWithDetails extends Trip {
  creator?: User;
  collaborators?: (TripCollaborator & { user?: User })[];
  itineraryItems?: ItineraryItem[];
  expenses?: Expense[];
  documents?: TripDocument[];
}

// Expense with split details
export interface ExpenseWithShares extends Expense {
  paidByUser?: User;
  shares?: (ExpenseShare & { user?: User })[];
}

// Coordinates type for location calculations
export interface Coordinates {
  latitude: number;
  longitude: number;
}

// Firestore converter helper types
export type WithId<T> = T & { id: string };
export type CreateInput<T> = Omit<T, 'id' | 'createdAt'>;
export type UpdateInput<T> = Partial<Omit<T, 'id' | 'createdAt'>>;

// ============================================
// Utility Functions
// ============================================

// Calculate distance between two points using Haversine formula
export function calculateDistance(point1: Coordinates, point2: Coordinates): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(point2.latitude - point1.latitude);
  const dLon = toRadians(point2.longitude - point1.longitude);
  
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(point1.latitude)) * Math.cos(toRadians(point2.latitude)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}
