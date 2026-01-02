import { addToOfflineQueue, cacheTrips, checkNetworkStatus } from '@/services/offline';
import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    orderBy,
    query,
    setDoc,
    Timestamp,
    updateDoc,
    where
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import {
    CollaboratorRole,
    COLLECTIONS,
    CreateInput,
    Expense,
    ExpenseShare,
    InvitationStatus,
    ItineraryItem,
    Trip,
    TripCollaborator,
    TripDocument,
    TripInvitation,
    User,
    UserLocation
} from '../types/database';

// ============================================
// Generic Firestore Helpers
// ============================================

// Convert Firestore Timestamp to Date (with null safety)
export const timestampToDate = (timestamp: Timestamp | null | undefined): Date => {
  if (!timestamp) return new Date();
  return timestamp.toDate();
};

// Convert Date to Firestore Timestamp
export const dateToTimestamp = (date: Date): Timestamp => Timestamp.fromDate(date);

// ============================================
// Users Collection
// ============================================

export const usersCollection = collection(firestore, COLLECTIONS.USERS);

export const createUser = async (userData: CreateInput<User>): Promise<string> => {
  const docRef = doc(usersCollection);
  await setDoc(docRef, {
    ...userData,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getUser = async (userId: string): Promise<User | null> => {
  const docRef = doc(firestore, COLLECTIONS.USERS, userId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() } as User;
};

export const getUserByEmail = async (email: string): Promise<User | null> => {
  const q = query(usersCollection, where('email', '==', email));
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() } as User;
};

export const updateUser = async (userId: string, data: Partial<User>): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.USERS, userId);
  await updateDoc(docRef, data as DocumentData);
};

// ============================================
// Trips Collection
// ============================================

export const tripsCollection = collection(firestore, COLLECTIONS.TRIPS);

export const createTrip = async (tripData: CreateInput<Trip>): Promise<string> => {
  // If offline, queue the creation and cache locally
  const isOnline = await checkNetworkStatus();
  if (!isOnline) {
    const tempId = `local_${Date.now()}`;
    const localTrip: Trip = {
      id: tempId,
      title: (tripData as any).title || 'Untitled Trip',
      startDate: (tripData as any).startDate || new Date(),
      endDate: (tripData as any).endDate || new Date(),
      creatorId: (tripData as any).creatorId || '',
      transportationMode: (tripData as any).transportationMode,
      tripType: (tripData as any).tripType,
      createdAt: new Date(),
    } as Trip;

    // Add to offline queue for sync later
    await addToOfflineQueue({ type: 'create', collection: COLLECTIONS.TRIPS, data: { tempId, tripData } });

    // Cache locally by appending to cached trips
    try {
      const existing = (await import('@/services/offline')).getCachedTrips();
      const cachedTrips = (await existing) || [];
      await cacheTrips([...cachedTrips, localTrip]);
    } catch (err) {
      console.warn('Failed to cache local trip:', err);
    }

    return tempId;
  }

  const docRef = doc(tripsCollection);
  await setDoc(docRef, {
    ...tripData,
    startDate: dateToTimestamp(tripData.startDate as unknown as Date),
    endDate: dateToTimestamp(tripData.endDate as unknown as Date),
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTrip = async (tripId: string): Promise<Trip | null> => {
  const docRef = doc(firestore, COLLECTIONS.TRIPS, tripId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    startDate: timestampToDate(data.startDate),
    endDate: timestampToDate(data.endDate),
    createdAt: timestampToDate(data.createdAt),
  } as Trip;
};

export const getUserTrips = async (userId: string): Promise<Trip[]> => {
  const q = query(tripsCollection, where('creatorId', '==', userId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startDate: timestampToDate(data.startDate),
      endDate: timestampToDate(data.endDate),
      createdAt: timestampToDate(data.createdAt),
    } as Trip;
  });
};

export const updateTrip = async (tripId: string, data: Partial<Trip>): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.TRIPS, tripId);
  // Filter out undefined values - Firebase doesn't accept them
  const updateData: DocumentData = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  if (data.startDate) updateData.startDate = dateToTimestamp(data.startDate);
  if (data.endDate) updateData.endDate = dateToTimestamp(data.endDate);

  const isOnline = await checkNetworkStatus();
  if (!isOnline) {
    // Queue update for later sync
    await addToOfflineQueue({ type: 'update', collection: COLLECTIONS.TRIPS, data: { tripId, updateData } });

    // Optimistically update cached trips
    try {
      const { getCachedTrips, cacheTrips: cacheTripsData } = await import('@/services/offline');
      const cached = (await getCachedTrips()) || [];
      const updated = cached.map((t: any) => (t.id === tripId ? { ...t, ...updateData } : t));
      await cacheTripsData(updated);
    } catch (err) {
      console.warn('Failed to update cached trip locally:', err);
    }
    return;
  }

  await updateDoc(docRef, updateData);
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.TRIPS, tripId);
  const isOnline = await checkNetworkStatus();
  if (!isOnline) {
    await addToOfflineQueue({ type: 'delete', collection: COLLECTIONS.TRIPS, data: { tripId } });
    // Remove from cached trips
    try {
      const { getCachedTrips, cacheTrips: cacheTripsData } = await import('@/services/offline');
      const cached = (await getCachedTrips()) || [];
      const filtered = cached.filter((t: any) => t.id !== tripId);
      await cacheTripsData(filtered);
    } catch (err) {
      console.warn('Failed to remove trip from cache locally:', err);
    }
    return;
  }

  await deleteDoc(docRef);
};

// ============================================
// Trip Collaborators Collection
// ============================================

export const collaboratorsCollection = collection(firestore, COLLECTIONS.TRIP_COLLABORATORS);

export const addCollaborator = async (data: CreateInput<TripCollaborator>): Promise<string> => {
  const docRef = await addDoc(collaboratorsCollection, data);
  return docRef.id;
};

export const getTripCollaborators = async (tripId: string): Promise<TripCollaborator[]> => {
  const q = query(collaboratorsCollection, where('tripId', '==', tripId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TripCollaborator);
};

export const getUserCollaborations = async (userId: string): Promise<TripCollaborator[]> => {
  const q = query(collaboratorsCollection, where('userId', '==', userId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as TripCollaborator);
};

export const removeCollaborator = async (collaboratorId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.TRIP_COLLABORATORS, collaboratorId);
  await deleteDoc(docRef);
};

export const updateCollaboratorRole = async (collaboratorId: string, role: CollaboratorRole): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.TRIP_COLLABORATORS, collaboratorId);
  await updateDoc(docRef, { role });
};

export const getCollaboratorByUserAndTrip = async (userId: string, tripId: string): Promise<TripCollaborator | null> => {
  const q = query(
    collaboratorsCollection, 
    where('tripId', '==', tripId), 
    where('userId', '==', userId)
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  return { id: docSnap.id, ...docSnap.data() } as TripCollaborator;
};

// ============================================
// Trip Invitations Collection
// ============================================

export const invitationsCollection = collection(firestore, COLLECTIONS.TRIP_INVITATIONS);

// Generate a unique invite code
const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'TRIP-';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

export const createInvitation = async (data: {
  tripId: string;
  invitedEmail: string;
  invitedBy: string;
  inviterName?: string;
  tripTitle?: string;
  role: CollaboratorRole;
  expiresInDays?: number;
}): Promise<{ id: string; inviteCode: string; existingUserId: string | null }> => {
  // Check if there's already a pending invitation for this email and trip
  const existingInvite = await getPendingInvitationByEmail(data.tripId, data.invitedEmail);
  if (existingInvite) {
    throw new Error('An invitation has already been sent to this email address.');
  }

  // Check if user is already a collaborator
  const existingUser = await getUserByEmail(data.invitedEmail);
  if (existingUser) {
    const existingCollab = await getCollaboratorByUserAndTrip(existingUser.id, data.tripId);
    if (existingCollab) {
      throw new Error('This user is already a member of this trip.');
    }
  }

  const inviteCode = generateInviteCode();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + (data.expiresInDays || 7));

  const docRef = await addDoc(invitationsCollection, {
    tripId: data.tripId,
    invitedEmail: data.invitedEmail.toLowerCase().trim(),
    invitedUserId: existingUser?.id || null,
    invitedBy: data.invitedBy,
    role: data.role,
    status: 'pending' as InvitationStatus,
    inviteCode,
    expiresAt: dateToTimestamp(expiresAt),
    createdAt: Timestamp.now(),
    respondedAt: null,
  });

  return { id: docRef.id, inviteCode, existingUserId: existingUser?.id || null };
};

export const getInvitation = async (invitationId: string): Promise<TripInvitation | null> => {
  const docRef = doc(firestore, COLLECTIONS.TRIP_INVITATIONS, invitationId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    expiresAt: timestampToDate(data.expiresAt),
    createdAt: timestampToDate(data.createdAt),
    respondedAt: data.respondedAt ? timestampToDate(data.respondedAt) : null,
  } as TripInvitation;
};

export const getInvitationByCode = async (inviteCode: string): Promise<TripInvitation | null> => {
  // Normalize the code: uppercase, trim, and ensure TRIP- prefix
  let normalizedCode = inviteCode.trim().toUpperCase();
  
  // If user entered just the code without prefix, add it
  if (!normalizedCode.startsWith('TRIP-')) {
    // Try with the TRIP- prefix first
    normalizedCode = 'TRIP-' + normalizedCode;
  }
  
  // First try with the normalized code (with TRIP- prefix)
  let q = query(invitationsCollection, where('inviteCode', '==', normalizedCode));
  let snapshot = await getDocs(q);
  
  // If not found and user entered without prefix, also try the original uppercase version
  if (snapshot.empty && !inviteCode.trim().toUpperCase().startsWith('TRIP-')) {
    // Maybe the code was stored without prefix (edge case)
    q = query(invitationsCollection, where('inviteCode', '==', inviteCode.trim().toUpperCase()));
    snapshot = await getDocs(q);
  }
  
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    expiresAt: timestampToDate(data.expiresAt),
    createdAt: timestampToDate(data.createdAt),
    respondedAt: data.respondedAt ? timestampToDate(data.respondedAt) : null,
  } as TripInvitation;
};

export const getTripInvitations = async (tripId: string): Promise<TripInvitation[]> => {
  const q = query(
    invitationsCollection, 
    where('tripId', '==', tripId),
    orderBy('createdAt', 'desc')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      expiresAt: timestampToDate(data.expiresAt),
      createdAt: timestampToDate(data.createdAt),
      respondedAt: data.respondedAt ? timestampToDate(data.respondedAt) : null,
    } as TripInvitation;
  });
};

export const getPendingInvitationByEmail = async (tripId: string, email: string): Promise<TripInvitation | null> => {
  const q = query(
    invitationsCollection,
    where('tripId', '==', tripId),
    where('invitedEmail', '==', email.toLowerCase().trim()),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  if (snapshot.empty) return null;
  const docSnap = snapshot.docs[0];
  const data = docSnap.data();
  return {
    id: docSnap.id,
    ...data,
    expiresAt: timestampToDate(data.expiresAt),
    createdAt: timestampToDate(data.createdAt),
    respondedAt: data.respondedAt ? timestampToDate(data.respondedAt) : null,
  } as TripInvitation;
};

export const getUserPendingInvitations = async (email: string): Promise<TripInvitation[]> => {
  const q = query(
    invitationsCollection,
    where('invitedEmail', '==', email.toLowerCase().trim()),
    where('status', '==', 'pending')
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => {
    const data = docSnap.data();
    return {
      id: docSnap.id,
      ...data,
      expiresAt: timestampToDate(data.expiresAt),
      createdAt: timestampToDate(data.createdAt),
      respondedAt: data.respondedAt ? timestampToDate(data.respondedAt) : null,
    } as TripInvitation;
  });
};

export const acceptInvitation = async (invitationId: string, userId: string): Promise<string> => {
  const invitation = await getInvitation(invitationId);
  if (!invitation) {
    throw new Error('Invitation not found.');
  }

  if (invitation.status !== 'pending') {
    throw new Error('This invitation has already been responded to.');
  }

  if (new Date() > invitation.expiresAt) {
    // Mark as expired
    await updateDoc(doc(firestore, COLLECTIONS.TRIP_INVITATIONS, invitationId), {
      status: 'expired' as InvitationStatus,
    });
    throw new Error('This invitation has expired.');
  }

  // Check if user is already a collaborator
  const existingCollab = await getCollaboratorByUserAndTrip(userId, invitation.tripId);
  if (existingCollab) {
    throw new Error('You are already a member of this trip.');
  }

  // Add as collaborator
  const collaboratorId = await addCollaborator({
    tripId: invitation.tripId,
    userId: userId,
    role: invitation.role,
  });

  // Update invitation status
  await updateDoc(doc(firestore, COLLECTIONS.TRIP_INVITATIONS, invitationId), {
    status: 'accepted' as InvitationStatus,
    invitedUserId: userId,
    respondedAt: Timestamp.now(),
  });

  return collaboratorId;
};

export const declineInvitation = async (invitationId: string): Promise<void> => {
  const invitation = await getInvitation(invitationId);
  if (!invitation) {
    throw new Error('Invitation not found.');
  }

  if (invitation.status !== 'pending') {
    throw new Error('This invitation has already been responded to.');
  }

  await updateDoc(doc(firestore, COLLECTIONS.TRIP_INVITATIONS, invitationId), {
    status: 'declined' as InvitationStatus,
    respondedAt: Timestamp.now(),
  });
};

export const cancelInvitation = async (invitationId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.TRIP_INVITATIONS, invitationId);
  await deleteDoc(docRef);
};

// Update the invitedUserId when a user signs up with the invited email
export const updateInvitationUserId = async (invitationId: string, userId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.TRIP_INVITATIONS, invitationId);
  await updateDoc(docRef, { invitedUserId: userId });
};

export const resendInvitation = async (invitationId: string): Promise<string> => {
  const invitation = await getInvitation(invitationId);
  if (!invitation) {
    throw new Error('Invitation not found.');
  }

  // Generate new code and extend expiry
  const newInviteCode = generateInviteCode();
  const newExpiresAt = new Date();
  newExpiresAt.setDate(newExpiresAt.getDate() + 7);

  await updateDoc(doc(firestore, COLLECTIONS.TRIP_INVITATIONS, invitationId), {
    inviteCode: newInviteCode,
    expiresAt: dateToTimestamp(newExpiresAt),
    status: 'pending' as InvitationStatus,
    respondedAt: null,
  });

  return newInviteCode;
};

// ============================================
// Itinerary Items Collection
// ============================================

export const itineraryCollection = collection(firestore, COLLECTIONS.ITINERARY_ITEMS);

export const createItineraryItem = async (data: CreateInput<ItineraryItem>): Promise<string> => {
  const docRef = await addDoc(itineraryCollection, {
    ...data,
    startTime: data.startTime ? dateToTimestamp(data.startTime as unknown as Date) : null,
    endTime: data.endTime ? dateToTimestamp(data.endTime as unknown as Date) : null,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTripItinerary = async (tripId: string): Promise<ItineraryItem[]> => {
  const q = query(itineraryCollection, where('tripId', '==', tripId), orderBy('startTime', 'asc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      startTime: data.startTime ? timestampToDate(data.startTime) : null,
      endTime: data.endTime ? timestampToDate(data.endTime) : null,
      createdAt: timestampToDate(data.createdAt),
    } as ItineraryItem;
  });
};

export const updateItineraryItem = async (itemId: string, data: Partial<ItineraryItem>): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.ITINERARY_ITEMS, itemId);
  const updateData: DocumentData = { ...data };
  if (data.startTime) updateData.startTime = dateToTimestamp(data.startTime);
  if (data.endTime) updateData.endTime = dateToTimestamp(data.endTime);
  await updateDoc(docRef, updateData);
};

export const deleteItineraryItem = async (itemId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.ITINERARY_ITEMS, itemId);
  await deleteDoc(docRef);
};

// ============================================
// User Locations Collection
// ============================================

export const locationsCollection = collection(firestore, COLLECTIONS.USER_LOCATIONS);

export const updateUserLocation = async (
  userId: string,
  tripId: string,
  latitude: number,
  longitude: number
): Promise<void> => {
  const docId = `${userId}_${tripId}`;
  const docRef = doc(firestore, COLLECTIONS.USER_LOCATIONS, docId);
  await setDoc(docRef, {
    userId,
    tripId,
    latitude,
    longitude,
    lastUpdated: Timestamp.now(),
  });
};

export const getTripUserLocations = async (tripId: string): Promise<UserLocation[]> => {
  const q = query(locationsCollection, where('tripId', '==', tripId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      lastUpdated: timestampToDate(data.lastUpdated),
    } as UserLocation;
  });
};

// ============================================
// Expenses Collection
// ============================================

export const expensesCollection = collection(firestore, COLLECTIONS.EXPENSES);

export const createExpense = async (data: {
  tripId: string;
  title: string;
  amount: number;
  currency: string;
  paidBy: string;
  category?: string;
}): Promise<string> => {
  const docRef = await addDoc(expensesCollection, {
    tripId: data.tripId,
    title: data.title,
    amount: data.amount,
    currency: data.currency,
    paidBy: data.paidBy,
    category: data.category || 'other',
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTripExpenses = async (tripId: string): Promise<Expense[]> => {
  const q = query(expensesCollection, where('tripId', '==', tripId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
    } as Expense;
  });
};

export const updateExpense = async (expenseId: string, data: Partial<Expense>): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.EXPENSES, expenseId);
  await updateDoc(docRef, data as DocumentData);
};

export const deleteExpense = async (expenseId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.EXPENSES, expenseId);
  await deleteDoc(docRef);
};

// ============================================
// Expense Shares Collection
// ============================================

export const sharesCollection = collection(firestore, COLLECTIONS.EXPENSE_SHARES);

export const createExpenseShare = async (data: CreateInput<ExpenseShare>): Promise<string> => {
  const docRef = await addDoc(sharesCollection, data);
  return docRef.id;
};

export const getExpenseShares = async (expenseId: string): Promise<ExpenseShare[]> => {
  const q = query(sharesCollection, where('expenseId', '==', expenseId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }) as ExpenseShare);
};

export const deleteExpenseShares = async (expenseId: string): Promise<void> => {
  const shares = await getExpenseShares(expenseId);
  await Promise.all(shares.map((share) => deleteDoc(doc(firestore, COLLECTIONS.EXPENSE_SHARES, share.id))));
};

// ============================================
// Documents Collection
// ============================================

export const documentsCollection = collection(firestore, COLLECTIONS.DOCUMENTS);

export const createDocument = async (data: CreateInput<TripDocument>): Promise<string> => {
  const docRef = await addDoc(documentsCollection, {
    ...data,
    createdAt: Timestamp.now(),
  });
  return docRef.id;
};

export const getTripDocuments = async (tripId: string): Promise<TripDocument[]> => {
  const q = query(documentsCollection, where('tripId', '==', tripId), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((doc) => {
    const data = doc.data();
    return {
      id: doc.id,
      ...data,
      createdAt: timestampToDate(data.createdAt),
    } as TripDocument;
  });
};

export const deleteDocument = async (documentId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.DOCUMENTS, documentId);
  await deleteDoc(docRef);
};
