import { firestore } from '@/config/firebase';
import { cacheTripsData, getCachedTrips } from '@/services/offline';
import {
    COLLECTIONS,
    Expense,
    ExpenseShare,
    ItineraryItem,
    Trip,
    TripCollaborator,
    TripDocument,
    TripInvitation,
    TripWithDetails,
    User,
} from '@/types/database';
import {
    collection,
    doc,
    getDoc,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    where,
} from 'firebase/firestore';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from './use-auth';

// Helper to convert Firestore Timestamp to Date
const timestampToDate = (timestamp: Timestamp | null): Date | null => {
  if (!timestamp) return null;
  return timestamp.toDate();
};

// ============================================
// Hook: useTrips - Fetch all user's trips
// ============================================
export function useTrips() {
  const { user, isAuthenticated } = useAuth();
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load cached trips on mount (only for authenticated users)
  useEffect(() => {
    if (!isAuthenticated) {
      setTrips([]);
      return;
    }

    const loadCachedTrips = async () => {
      try {
        const cached = await getCachedTrips();
        if (cached && cached.length > 0) {
          setTrips(cached);
        }
      } catch (err) {
        console.log('No cached trips found');
      }
    };
    loadCachedTrips();
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !user) {
      setTrips([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    // Query trips where user is creator
    const createdTripsQuery = query(
      collection(firestore, COLLECTIONS.TRIPS),
      where('creatorId', '==', user.id),
      orderBy('createdAt', 'desc')
    );

    // Query collaborations
    const collabsQuery = query(
      collection(firestore, COLLECTIONS.TRIP_COLLABORATORS),
      where('userId', '==', user.id)
    );

    let createdTrips: Trip[] = [];
    let collaboratorTrips: Trip[] = [];
    let collabTripIds: Set<string> = new Set();

    // Listen to created trips
    const unsubscribeCreated = onSnapshot(
      createdTripsQuery,
      (snapshot) => {
        createdTrips = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            title: data.title,
            startDate: data.startDate?.toDate() || new Date(),
            endDate: data.endDate?.toDate() || new Date(),
            creatorId: data.creatorId,
            transportationMode: data.transportationMode,
            tripType: data.tripType,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Trip;
        });
        mergeTrips();
      },
      (err) => {
        console.error('Error fetching created trips:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    // Listen to collaborations
    const unsubscribeCollabs = onSnapshot(
      collabsQuery,
      async (snapshot) => {
        const newCollabTripIds = new Set(snapshot.docs.map((doc) => doc.data().tripId));
        
        // Remove trips that are no longer in collaborations
        collabTripIds = newCollabTripIds;
        
        // Fetch trip details for each collaboration
        const tripPromises = Array.from(newCollabTripIds).map(async (tripId) => {
          const tripDoc = await getDoc(doc(firestore, COLLECTIONS.TRIPS, tripId));
          if (tripDoc.exists()) {
            const data = tripDoc.data();
            return {
              id: tripDoc.id,
              title: data.title,
              startDate: data.startDate?.toDate() || new Date(),
              endDate: data.endDate?.toDate() || new Date(),
              creatorId: data.creatorId,
              transportationMode: data.transportationMode,
              tripType: data.tripType,
              createdAt: data.createdAt?.toDate() || new Date(),
            } as Trip;
          }
          return null;
        });

        collaboratorTrips = (await Promise.all(tripPromises)).filter((t): t is Trip => t !== null);
        mergeTrips();
      },
      (err) => {
        console.error('Error fetching collaborations:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    function mergeTrips() {
      // Combine created trips and collaborator trips, avoiding duplicates
      const allTrips = [...createdTrips];
      collaboratorTrips.forEach((trip) => {
        if (!allTrips.some((t) => t.id === trip.id)) {
          allTrips.push(trip);
        }
      });
      // Sort by createdAt descending
      allTrips.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      setTrips(allTrips);
      setLoading(false);
      
      // Cache trips for offline access
      if (allTrips.length > 0) {
        cacheTripsData(allTrips).catch((err) => 
          console.log('Failed to cache trips:', err)
        );
      }
    }

    return () => {
      unsubscribeCreated();
      unsubscribeCollabs();
    };
  }, [isAuthenticated, user]);

  const refresh = useCallback(() => {
    // The real-time listeners will automatically refresh
    // This is here for manual refresh triggers (pull-to-refresh)
  }, []);

  return { trips, loading, error, refresh };
}

// ============================================
// Hook: useTrip - Fetch single trip with details
// ============================================
export function useTrip(tripId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [trip, setTrip] = useState<TripWithDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tripId) {
      setTrip(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const tripRef = doc(firestore, COLLECTIONS.TRIPS, tripId);

    const unsubscribe = onSnapshot(
      tripRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          setTrip(null);
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        const tripData: TripWithDetails = {
          id: docSnap.id,
          title: data.title,
          destination: data.destination,
          destinationPlaceId: data.destinationPlaceId,
          destinationLat: data.destinationLat,
          destinationLng: data.destinationLng,
          startDate: data.startDate?.toDate() || new Date(),
          endDate: data.endDate?.toDate() || new Date(),
          creatorId: data.creatorId,
          transportationMode: data.transportationMode,
          tripType: data.tripType,
          budgetRange: data.budgetRange,
          travelerCount: data.travelerCount,
          accommodationType: data.accommodationType,
          createdAt: data.createdAt?.toDate() || new Date(),
        };

        // Fetch creator info
        try {
          const creatorDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, data.creatorId));
          if (creatorDoc.exists()) {
            const creatorData = creatorDoc.data();
            tripData.creator = {
              id: creatorDoc.id,
              name: creatorData.name,
              email: creatorData.email,
              profilePhoto: creatorData.profilePhoto,
              defaultCurrency: creatorData.defaultCurrency,
              createdAt: creatorData.createdAt?.toDate() || new Date(),
            };
          }
        } catch (err) {
          console.warn('Error fetching creator:', err);
        }

        setTrip(tripData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching trip:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, tripId]);

  return { trip, loading, error };
}

// ============================================
// Hook: useTripItinerary - Real-time itinerary items
// ============================================
export function useTripItinerary(tripId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [items, setItems] = useState<ItineraryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tripId) {
      setItems([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.ITINERARY_ITEMS),
      where('tripId', '==', tripId),
      orderBy('startTime', 'asc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const itineraryItems = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            tripId: data.tripId,
            title: data.title,
            description: data.description,
            location: data.location,
            latitude: data.latitude,
            longitude: data.longitude,
            category: data.category,
            startTime: data.startTime?.toDate() || null,
            endTime: data.endTime?.toDate() || null,
            addedBy: data.addedBy,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as ItineraryItem;
        });
        setItems(itineraryItems);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching itinerary:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, tripId]);

  return { items, loading, error };
}

// ============================================
// Hook: useTripExpenses - Real-time expenses
// ============================================
export function useTripExpenses(tripId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tripId) {
      setExpenses([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.EXPENSES),
      where('tripId', '==', tripId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const expenseItems = snapshot.docs.map((doc) => {
          const data = doc.data();
          return {
            id: doc.id,
            tripId: data.tripId,
            title: data.title,
            amount: data.amount,
            currency: data.currency || 'USD',
            paidBy: data.paidBy,
            category: data.category || 'other',
            createdAt: data.createdAt?.toDate() || new Date(),
          } as Expense;
        });
        setExpenses(expenseItems);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching expenses:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, tripId]);

  // Calculate total expenses
  const totalExpenses = expenses.reduce((sum, exp) => sum + exp.amount, 0);

  return { expenses, totalExpenses, loading, error };
}

// ============================================
// Hook: useTripCollaborators - Real-time collaborators
// ============================================
export function useTripCollaborators(tripId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [collaborators, setCollaborators] = useState<(TripCollaborator & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tripId) {
      setCollaborators([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.TRIP_COLLABORATORS),
      where('tripId', '==', tripId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const collabsWithUsers = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const collab: TripCollaborator & { user?: User } = {
              id: docSnap.id,
              tripId: data.tripId,
              userId: data.userId,
              role: data.role,
            };

            // Fetch user info
            try {
              const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, data.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                collab.user = {
                  id: userDoc.id,
                  name: userData.name,
                  email: userData.email,
                  profilePhoto: userData.profilePhoto,
                  defaultCurrency: userData.defaultCurrency,
                  createdAt: userData.createdAt?.toDate() || new Date(),
                };
              }
            } catch (err) {
              console.warn('Error fetching collaborator user:', err);
            }

            return collab;
          })
        );

        setCollaborators(collabsWithUsers);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching collaborators:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, tripId]);

  return { collaborators, loading, error };
}

// ============================================
// Hook: useTripDocuments - Real-time documents
// ============================================
export function useTripDocuments(tripId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [documents, setDocuments] = useState<TripDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tripId) {
      setDocuments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.DOCUMENTS),
      where('tripId', '==', tripId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            tripId: data.tripId,
            uploadedBy: data.uploadedBy,
            fileUrl: data.fileUrl,
            label: data.label,
            type: data.type,
            createdAt: data.createdAt?.toDate() || new Date(),
          } as TripDocument;
        });
        setDocuments(docs);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching documents:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, tripId]);

  return { documents, loading, error };
}

// ============================================
// Hook: useItineraryItem - Single itinerary item
// ============================================
export function useItineraryItem(itemId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [item, setItem] = useState<ItineraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !itemId) {
      setItem(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const itemRef = doc(firestore, COLLECTIONS.ITINERARY_ITEMS, itemId);

    const unsubscribe = onSnapshot(
      itemRef,
      (docSnap) => {
        if (!docSnap.exists()) {
          setItem(null);
          setLoading(false);
          return;
        }

        const data = docSnap.data();
        setItem({
          id: docSnap.id,
          tripId: data.tripId,
          title: data.title,
          description: data.description,
          location: data.location,
          latitude: data.latitude,
          longitude: data.longitude,
          category: data.category,
          startTime: data.startTime?.toDate() || null,
          endTime: data.endTime?.toDate() || null,
          addedBy: data.addedBy,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching itinerary item:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, itemId]);

  return { item, loading, error };
}

// ============================================
// Hook: useExpenseShares - Get shares for an expense
// ============================================
export function useExpenseShares(expenseId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [shares, setShares] = useState<(ExpenseShare & { user?: User })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !expenseId) {
      setShares([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.EXPENSE_SHARES),
      where('expenseId', '==', expenseId)
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const sharesWithUsers = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const share: ExpenseShare & { user?: User } = {
              id: docSnap.id,
              expenseId: data.expenseId,
              userId: data.userId,
              shareAmount: data.shareAmount,
            };

            // Fetch user info
            try {
              const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, data.userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                share.user = {
                  id: userDoc.id,
                  name: userData.name,
                  email: userData.email,
                  profilePhoto: userData.profilePhoto,
                  defaultCurrency: userData.defaultCurrency,
                  createdAt: userData.createdAt?.toDate() || new Date(),
                };
              }
            } catch (err) {
              console.warn('Error fetching share user:', err);
            }

            return share;
          })
        );

        setShares(sharesWithUsers);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching expense shares:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, expenseId]);

  return { shares, loading, error };
}

// ============================================
// Hook: useTripInvitations - Real-time invitations
// ============================================
export function useTripInvitations(tripId: string | undefined) {
  const { isAuthenticated } = useAuth();
  const [invitations, setInvitations] = useState<(TripInvitation & { inviterName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !tripId) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.TRIP_INVITATIONS),
      where('tripId', '==', tripId),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const invitesWithDetails = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const invite: TripInvitation & { inviterName?: string } = {
              id: docSnap.id,
              tripId: data.tripId,
              invitedEmail: data.invitedEmail,
              invitedUserId: data.invitedUserId,
              invitedBy: data.invitedBy,
              role: data.role,
              status: data.status,
              inviteCode: data.inviteCode,
              expiresAt: data.expiresAt?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              respondedAt: data.respondedAt?.toDate() || null,
            };

            // Fetch inviter info
            try {
              const userDoc = await getDoc(doc(firestore, COLLECTIONS.USERS, data.invitedBy));
              if (userDoc.exists()) {
                invite.inviterName = userDoc.data().name;
              }
            } catch (err) {
              console.warn('Error fetching inviter:', err);
            }

            return invite;
          })
        );

        setInvitations(invitesWithDetails);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching invitations:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, tripId]);

  // Filter by status
  const pendingInvitations = invitations.filter(inv => inv.status === 'pending');
  const respondedInvitations = invitations.filter(inv => inv.status !== 'pending');

  return { invitations, pendingInvitations, respondedInvitations, loading, error };
}

// ============================================
// Hook: useUserInvitations - Invitations for current user
// ============================================
export function useUserInvitations() {
  const { user, isAuthenticated } = useAuth();
  const [invitations, setInvitations] = useState<(TripInvitation & { tripTitle?: string; inviterName?: string })[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !user?.email) {
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const q = query(
      collection(firestore, COLLECTIONS.TRIP_INVITATIONS),
      where('invitedEmail', '==', user.email.toLowerCase()),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        const invitesWithDetails = await Promise.all(
          snapshot.docs.map(async (docSnap) => {
            const data = docSnap.data();
            const invite: TripInvitation & { tripTitle?: string; inviterName?: string } = {
              id: docSnap.id,
              tripId: data.tripId,
              invitedEmail: data.invitedEmail,
              invitedUserId: data.invitedUserId,
              invitedBy: data.invitedBy,
              role: data.role,
              status: data.status,
              inviteCode: data.inviteCode,
              expiresAt: data.expiresAt?.toDate() || new Date(),
              createdAt: data.createdAt?.toDate() || new Date(),
              respondedAt: data.respondedAt?.toDate() || null,
            };

            // Fetch trip and inviter info
            try {
              const [tripDoc, userDoc] = await Promise.all([
                getDoc(doc(firestore, COLLECTIONS.TRIPS, data.tripId)),
                getDoc(doc(firestore, COLLECTIONS.USERS, data.invitedBy)),
              ]);
              
              if (tripDoc.exists()) {
                invite.tripTitle = tripDoc.data().title;
              }
              if (userDoc.exists()) {
                invite.inviterName = userDoc.data().name;
              }
            } catch (err) {
              console.warn('Error fetching invite details:', err);
            }

            return invite;
          })
        );

        // Filter out expired invitations
        const validInvites = invitesWithDetails.filter(
          inv => new Date() < inv.expiresAt
        );

        setInvitations(validInvites);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching user invitations:', err);
        setError(err as Error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthenticated, user?.email]);

  return { invitations, loading, error };
}
