import { getAuth } from 'firebase/auth';
import { addDoc, collection } from 'firebase/firestore';
import { firestore } from '../config/firebase';
import { checkGuestMode } from './guest-mode';

// ============================================
// Security Logging Service
// ============================================

export interface SecurityEvent {
  event: string;
  details: Record<string, any>;
  timestamp: Date;
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
}

export const logSecurityEvent = async (
  event: string,
  details: Record<string, any> = {}
): Promise<void> => {
  try {
    // Only log security events for authenticated users (not guest mode)
    const auth = getAuth();
    if (!auth.currentUser) {
      console.warn(`Security Event (not logged - unauthenticated): ${event}`, details);
      return;
    }

    // Check if user is in guest mode
    const isGuest = await checkGuestMode();
    if (isGuest) {
      console.warn(`Security Event (not logged - guest mode): ${event}`, details);
      return;
    }

    const logEntry: SecurityEvent = {
      event,
      details,
      timestamp: new Date(),
      userId: details.userId || auth.currentUser.uid, // Use current user if not specified
      userAgent: 'React Native App', // Client-side limitation
      ipAddress: 'client-side', // Would need server-side for real IP
    };

    // Store in Firestore security_logs collection
    try {
      await addDoc(collection(firestore, 'security_logs'), {
        ...logEntry,
        timestamp: logEntry.timestamp, // Firestore will convert to Timestamp
      });
    } catch (firestoreError: any) {
      // If it's a permissions error, log locally but don't throw
      if (firestoreError.code === 'permission-denied') {
        console.warn(`Security Event (permissions denied - logged locally only): ${event}`, details);
        return;
      }
      // Re-throw other Firestore errors
      throw firestoreError;
    }

    // In production, also send to external logging service
    console.warn(`Security Event: ${event}`, details);
  } catch (error) {
    // Re-throw Firestore errors that were meant to be re-thrown
    if ((error as any)?.code && typeof (error as any).code === 'string') {
      throw error;
    }
    // Fail silently for other errors to avoid breaking app flow
    console.error('Failed to log security event:', error);
  }
};

// Predefined security events
export const SECURITY_EVENTS = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILURE: 'login_failure',
  LOGOUT: 'logout',
  PASSWORD_RESET_REQUEST: 'password_reset_request',
  PASSWORD_CHANGE: 'password_change',
  PROFILE_UPDATE: 'profile_update',
  TRIP_ACCESS_DENIED: 'trip_access_denied',
  FILE_ACCESS_DENIED: 'file_access_denied',
  SUSPICIOUS_ACTIVITY: 'suspicious_activity',
  MFA_ENABLED: 'mfa_enabled',
  MFA_DISABLED: 'mfa_disabled',
} as const;