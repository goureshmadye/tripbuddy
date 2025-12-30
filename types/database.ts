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
  createdAt: Date;
}

export interface Trip {
  id: string;
  title: string;
  startDate: Date;
  endDate: Date;
  creatorId: string;
  transportationMode?: string | null;
  tripType?: string | null;
  createdAt: Date;
}

export type CollaboratorRole = 'viewer' | 'editor' | 'owner';

export interface TripCollaborator {
  id: string;
  tripId: string;
  userId: string;
  role: CollaboratorRole;
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
  createdAt: Date;
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

export const COLLECTIONS = {
  USERS: 'users',
  TRIPS: 'trips',
  TRIP_COLLABORATORS: 'tripCollaborators',
  ITINERARY_ITEMS: 'itineraryItems',
  USER_LOCATIONS: 'userLocations',
  EXPENSES: 'expenses',
  EXPENSE_SHARES: 'expenseShares',
  DOCUMENTS: 'documents',
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
