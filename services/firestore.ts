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
    COLLECTIONS,
    CreateInput,
    Expense,
    ExpenseShare,
    ItineraryItem,
    Trip,
    TripCollaborator,
    TripDocument,
    User,
    UserLocation,
} from '../types/database';

// ============================================
// Generic Firestore Helpers
// ============================================

// Convert Firestore Timestamp to Date
export const timestampToDate = (timestamp: Timestamp): Date => timestamp.toDate();

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
  const updateData: DocumentData = { ...data };
  if (data.startDate) updateData.startDate = dateToTimestamp(data.startDate);
  if (data.endDate) updateData.endDate = dateToTimestamp(data.endDate);
  await updateDoc(docRef, updateData);
};

export const deleteTrip = async (tripId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.TRIPS, tripId);
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

export const createExpense = async (data: CreateInput<Expense>): Promise<string> => {
  const docRef = await addDoc(expensesCollection, {
    ...data,
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
