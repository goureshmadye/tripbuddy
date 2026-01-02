import {
    addDoc,
    collection,
    deleteDoc,
    doc,
    getDoc,
    getDocs,
    limit,
    onSnapshot,
    orderBy,
    query,
    Timestamp,
    Unsubscribe,
    updateDoc,
    where,
    writeBatch,
} from 'firebase/firestore';
import { firestore } from '../config/firebase';
import {
    COLLECTIONS,
    Notification,
    NotificationType
} from '../types/database';
import { dateToTimestamp, timestampToDate } from './firestore';

// ============================================
// Notifications Collection
// ============================================

export const notificationsCollection = collection(firestore, COLLECTIONS.NOTIFICATIONS);

// Convert Firestore document to Notification
const docToNotification = (docSnap: { id: string; data: () => Record<string, unknown> }): Notification => {
  const data = docSnap.data();
  return {
    id: docSnap.id,
    userId: data.userId as string,
    type: data.type as NotificationType,
    title: data.title as string,
    message: data.message as string,
    read: data.read as boolean,
    tripId: data.tripId as string | null,
    expenseId: data.expenseId as string | null,
    itineraryId: data.itineraryId as string | null,
    invitationId: data.invitationId as string | null,
    actorId: data.actorId as string | null,
    actorName: data.actorName as string | null,
    groupKey: data.groupKey as string | null,
    createdAt: timestampToDate(data.createdAt as Timestamp),
    readAt: data.readAt ? timestampToDate(data.readAt as Timestamp) : null,
  };
};

// ============================================
// Create Notifications
// ============================================

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  tripId?: string;
  expenseId?: string;
  itineraryId?: string;
  invitationId?: string;
  actorId?: string;
  actorName?: string;
  groupKey?: string;
}

export const createNotification = async (data: CreateNotificationInput): Promise<string> => {
  // Check for duplicate notifications with the same groupKey in the last hour
  if (data.groupKey) {
    const oneHourAgo = new Date();
    oneHourAgo.setHours(oneHourAgo.getHours() - 1);
    
    const q = query(
      notificationsCollection,
      where('userId', '==', data.userId),
      where('groupKey', '==', data.groupKey),
      where('createdAt', '>=', dateToTimestamp(oneHourAgo)),
      limit(1)
    );
    
    const existing = await getDocs(q);
    if (!existing.empty) {
      // Update the existing notification instead of creating a new one
      const existingDoc = existing.docs[0];
      await updateDoc(doc(firestore, COLLECTIONS.NOTIFICATIONS, existingDoc.id), {
        message: data.message,
        createdAt: Timestamp.now(),
        read: false,
        readAt: null,
      });
      return existingDoc.id;
    }
  }

  const docRef = await addDoc(notificationsCollection, {
    // Filter out undefined values - Firebase doesn't accept them
    userId: data.userId,
    type: data.type,
    title: data.title,
    message: data.message,
    read: false,
    createdAt: Timestamp.now(),
    readAt: null,
    ...(data.tripId !== undefined && { tripId: data.tripId }),
    ...(data.expenseId !== undefined && { expenseId: data.expenseId }),
    ...(data.itineraryId !== undefined && { itineraryId: data.itineraryId }),
    ...(data.invitationId !== undefined && { invitationId: data.invitationId }),
    ...(data.actorId !== undefined && { actorId: data.actorId }),
    ...(data.actorName !== undefined && { actorName: data.actorName }),
    ...(data.groupKey !== undefined && { groupKey: data.groupKey }),
  });
  
  return docRef.id;
};

// Create multiple notifications at once (for notifying multiple users)
export const createBulkNotifications = async (
  userIds: string[],
  data: Omit<CreateNotificationInput, 'userId'>
): Promise<void> => {
  const batch = writeBatch(firestore);
  
  for (const userId of userIds) {
    const docRef = doc(notificationsCollection);
    batch.set(docRef, {
      // Filter out undefined values - Firebase doesn't accept them
      userId,
      type: data.type,
      title: data.title,
      message: data.message,
      read: false,
      createdAt: Timestamp.now(),
      readAt: null,
      ...(data.tripId !== undefined && { tripId: data.tripId }),
      ...(data.expenseId !== undefined && { expenseId: data.expenseId }),
      ...(data.itineraryId !== undefined && { itineraryId: data.itineraryId }),
      ...(data.invitationId !== undefined && { invitationId: data.invitationId }),
      ...(data.actorId !== undefined && { actorId: data.actorId }),
      ...(data.actorName !== undefined && { actorName: data.actorName }),
      ...(data.groupKey !== undefined && { groupKey: data.groupKey }),
    });
  }
  
  await batch.commit();
};

// ============================================
// Read Notifications
// ============================================

export const getNotification = async (notificationId: string): Promise<Notification | null> => {
  const docRef = doc(firestore, COLLECTIONS.NOTIFICATIONS, notificationId);
  const docSnap = await getDoc(docRef);
  if (!docSnap.exists()) return null;
  return docToNotification({ id: docSnap.id, data: () => docSnap.data() });
};

export const getUserNotifications = async (
  userId: string,
  maxCount: number = 50
): Promise<Notification[]> => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => 
    docToNotification({ id: docSnap.id, data: () => docSnap.data() })
  );
};

export const getUnreadNotificationCount = async (userId: string): Promise<number> => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    where('read', '==', false)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.size;
};

// ============================================
// Real-time Subscriptions
// ============================================

export const subscribeToNotifications = (
  userId: string,
  onUpdate: (notifications: Notification[]) => void,
  onError?: (error: Error) => void,
  maxCount: number = 50
): Unsubscribe => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(maxCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const notifications = snapshot.docs.map((docSnap) =>
        docToNotification({ id: docSnap.id, data: () => docSnap.data() })
      );
      onUpdate(notifications);
    },
    (error) => {
      console.error('Error subscribing to notifications:', error);
      onError?.(error);
    }
  );
};

export const subscribeToUnreadCount = (
  userId: string,
  onUpdate: (count: number) => void,
  onError?: (error: Error) => void
): Unsubscribe => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    where('read', '==', false)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      onUpdate(snapshot.size);
    },
    (error) => {
      console.error('Error subscribing to unread count:', error);
      onError?.(error);
    }
  );
};

// ============================================
// Update Notifications
// ============================================

export const markNotificationAsRead = async (notificationId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.NOTIFICATIONS, notificationId);
  await updateDoc(docRef, {
    read: true,
    readAt: Timestamp.now(),
  });
};

export const markAllNotificationsAsRead = async (userId: string): Promise<void> => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    where('read', '==', false)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(firestore);
  
  snapshot.docs.forEach((docSnap) => {
    batch.update(docSnap.ref, {
      read: true,
      readAt: Timestamp.now(),
    });
  });
  
  await batch.commit();
};

// ============================================
// Delete Notifications
// ============================================

export const deleteNotification = async (notificationId: string): Promise<void> => {
  const docRef = doc(firestore, COLLECTIONS.NOTIFICATIONS, notificationId);
  await deleteDoc(docRef);
};

export const deleteAllNotifications = async (userId: string): Promise<void> => {
  const q = query(
    notificationsCollection,
    where('userId', '==', userId)
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(firestore);
  
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  
  await batch.commit();
};

// Delete old read notifications (cleanup - older than 30 days)
export const deleteOldNotifications = async (userId: string, daysOld: number = 30): Promise<void> => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysOld);
  
  const q = query(
    notificationsCollection,
    where('userId', '==', userId),
    where('read', '==', true),
    where('createdAt', '<', dateToTimestamp(cutoffDate))
  );
  
  const snapshot = await getDocs(q);
  const batch = writeBatch(firestore);
  
  snapshot.docs.forEach((docSnap) => {
    batch.delete(docSnap.ref);
  });
  
  await batch.commit();
};

// ============================================
// Notification Triggers (Helper Functions)
// ============================================

export interface NotifyCollaboratorsInput {
  tripId: string;
  tripTitle: string;
  excludeUserId?: string; // Exclude the actor from notifications
  type: NotificationType;
  title: string;
  message: string;
  actorId?: string;
  actorName?: string;
  expenseId?: string;
  itineraryId?: string;
}

// Get all collaborator user IDs for a trip
export const getTripCollaboratorIds = async (tripId: string): Promise<string[]> => {
  const q = query(
    collection(firestore, COLLECTIONS.TRIP_COLLABORATORS),
    where('tripId', '==', tripId)
  );
  
  const snapshot = await getDocs(q);
  return snapshot.docs.map((docSnap) => docSnap.data().userId as string);
};

// Notify all collaborators of a trip
export const notifyTripCollaborators = async (input: NotifyCollaboratorsInput): Promise<void> => {
  const collaboratorIds = await getTripCollaboratorIds(input.tripId);
  
  // Filter out the actor if specified
  const recipientIds = input.excludeUserId
    ? collaboratorIds.filter((id) => id !== input.excludeUserId)
    : collaboratorIds;
  
  if (recipientIds.length === 0) return;
  
  await createBulkNotifications(recipientIds, {
    type: input.type,
    title: input.title,
    message: input.message,
    tripId: input.tripId,
    actorId: input.actorId,
    actorName: input.actorName,
    expenseId: input.expenseId,
    itineraryId: input.itineraryId,
    groupKey: `${input.type}_${input.tripId}`,
  });
};

// ============================================
// Pre-built Notification Creators
// ============================================

export const notifyCollaboratorAdded = async (
  userId: string,
  tripId: string,
  tripTitle: string,
  inviterName: string,
  inviterId: string
): Promise<void> => {
  await createNotification({
    userId,
    type: 'collaborator_added',
    title: 'Added to Trip',
    message: `${inviterName} added you to "${tripTitle}"`,
    tripId,
    actorId: inviterId,
    actorName: inviterName,
    groupKey: `collaborator_added_${tripId}_${userId}`,
  });
};

export const notifyCollaboratorRemoved = async (
  userId: string,
  tripTitle: string,
  removerName: string,
  removerId: string
): Promise<void> => {
  await createNotification({
    userId,
    type: 'collaborator_removed',
    title: 'Removed from Trip',
    message: `${removerName} removed you from "${tripTitle}"`,
    actorId: removerId,
    actorName: removerName,
  });
};

export const notifyExpenseAdded = async (
  tripId: string,
  tripTitle: string,
  expenseId: string,
  expenseTitle: string,
  amount: string,
  actorId: string,
  actorName: string
): Promise<void> => {
  await notifyTripCollaborators({
    tripId,
    tripTitle,
    excludeUserId: actorId,
    type: 'expense_added',
    title: 'New Expense',
    message: `${actorName} added "${expenseTitle}" (${amount}) to ${tripTitle}`,
    actorId,
    actorName,
    expenseId,
  });
};

export const notifyItineraryAdded = async (
  tripId: string,
  tripTitle: string,
  itineraryId: string,
  itemTitle: string,
  actorId: string,
  actorName: string
): Promise<void> => {
  await notifyTripCollaborators({
    tripId,
    tripTitle,
    excludeUserId: actorId,
    type: 'itinerary_added',
    title: 'New Activity',
    message: `${actorName} added "${itemTitle}" to ${tripTitle}`,
    actorId,
    actorName,
    itineraryId,
  });
};

export const notifyTripInvitation = async (
  userId: string,
  tripId: string,
  tripTitle: string,
  inviterName: string,
  inviterId: string,
  invitationId: string
): Promise<void> => {
  await createNotification({
    userId,
    type: 'trip_invitation',
    title: 'Trip Invitation',
    message: `${inviterName} invited you to join "${tripTitle}"`,
    tripId,
    invitationId,
    actorId: inviterId,
    actorName: inviterName,
    groupKey: `trip_invitation_${tripId}_${userId}`,
  });
};

export const notifyInvitationAccepted = async (
  inviterId: string,
  tripId: string,
  tripTitle: string,
  accepterName: string,
  accepterId: string
): Promise<void> => {
  await createNotification({
    userId: inviterId,
    type: 'invitation_accepted',
    title: 'Invitation Accepted',
    message: `${accepterName} accepted your invitation to "${tripTitle}"`,
    tripId,
    actorId: accepterId,
    actorName: accepterName,
    groupKey: `invitation_accepted_${tripId}_${accepterId}`,
  });
};

export const notifySystemMessage = async (
  userId: string,
  title: string,
  message: string
): Promise<void> => {
  await createNotification({
    userId,
    type: 'system',
    title,
    message,
  });
};
