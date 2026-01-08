import { auth, firestore, storage } from "@/config/firebase";
import { User } from "@/types/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    AuthError,
    createUserWithEmailAndPassword, EmailAuthProvider, fetchSignInMethodsForEmail,
    User as FirebaseUser,
    GoogleAuthProvider, reauthenticateWithCredential, sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup, updatePassword, updateProfile
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Platform } from "react-native";
import { GUEST_MODE_KEY } from "./guest-mode";
import { logSecurityEvent, SECURITY_EVENTS } from "./security";
/**
 * Change the user's password after verifying the current password.
 * @param user The current Firebase user object
 * @param currentPassword The user's current password (input)
 * @param newPassword The new password to set
 * @throws Error if the current password is incorrect or update fails
 */
export const changePassword = async (
  user: FirebaseUser,
  currentPassword: string,
  newPassword: string
): Promise<void> => {
  if (!user.email) throw new Error("User email not found");
  // Re-authenticate user with current password
  const credential = EmailAuthProvider.credential(user.email, currentPassword);
  try {
    await reauthenticateWithCredential(user, credential);
    await updatePassword(user, newPassword);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error as AuthError));
  }
};

// Storage keys
const ONBOARDING_COMPLETE_KEY = "@tripbuddy/onboarding_complete";
const WALKTHROUGH_COMPLETE_KEY = "@tripbuddy/walkthrough_complete";

// ============================================
// Error Handling
// ============================================

export const getAuthErrorMessage = (error: AuthError): string => {
  switch (error.code) {
    case "auth/email-already-in-use":
      return "This email is already registered. Please sign in instead.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please contact support.";
    case "auth/weak-password":
      return "Password is too weak. Please use at least 8 characters with uppercase, lowercase, numbers, and special characters.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/user-not-found":
      return "No account found with this email. Please sign up first.";
    case "auth/wrong-password":
      return "Incorrect password. Please try again.";
    case "auth/invalid-credential":
      return "Invalid email or password. Please check and try again.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please try again later.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection.";
    case "auth/popup-closed-by-user":
      return "Sign-in was cancelled. Please try again.";
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled.";
    default:
      return error.message || "An unexpected error occurred. Please try again.";
  }
};

// ============================================
// Email Existence Check
// ============================================

export const checkEmailExists = async (email: string): Promise<boolean> => {
  try {
    const methods = await fetchSignInMethodsForEmail(auth, email);
    return methods.length > 0;
  } catch (error) {
    // If error, assume email doesn't exist to allow signup attempt
    return false;
  }
};

// ============================================
// Email/Password Authentication
// ============================================

export const signUpWithEmail = async (
  email: string,
  password: string,
  name?: string
): Promise<FirebaseUser> => {
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );

  // Update display name if provided
  if (name) {
    await updateProfile(userCredential.user, { displayName: name });
  }

  // Create user document in Firestore (name will be set in onboarding if not provided)
  await createUserDocument(userCredential.user, { name: name || 'User' });

  return userCredential.user;
};

export const signInWithEmail = async (
  email: string,
  password: string
): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInWithEmailAndPassword(
      auth,
      email,
      password
    );
    // Log successful login
    await logSecurityEvent(SECURITY_EVENTS.LOGIN_SUCCESS, {
      userId: userCredential.user.uid,
      email: email,
      method: 'email'
    });
    return userCredential.user;
  } catch (error) {
    // Log failed login attempt
    await logSecurityEvent(SECURITY_EVENTS.LOGIN_FAILURE, {
      email: email,
      method: 'email',
      error: (error as AuthError).code
    });
    throw error;
  }
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
  // Log password reset request
  await logSecurityEvent(SECURITY_EVENTS.PASSWORD_RESET_REQUEST, {
    email: email
  });
};

// ============================================
// Multi-Factor Authentication (MFA)
// ============================================

export const enableMFA = async (user: FirebaseUser, phoneNumber: string): Promise<void> => {
  // Note: Firebase MFA requires additional setup and may need server-side verification
  // This is a basic implementation - in production, implement proper MFA flow
  try {
    // Log MFA enable attempt
    await logSecurityEvent(SECURITY_EVENTS.MFA_ENABLED, {
      userId: user.uid,
      phoneNumber: phoneNumber.substring(0, 5) + '****' // Partial logging for privacy
    });

    // Firebase MFA implementation would go here
    // Requires: PhoneAuthProvider, RecaptchaVerifier, etc.
    console.warn('MFA setup requires additional Firebase configuration');

  } catch (error) {
    await logSecurityEvent(SECURITY_EVENTS.SUSPICIOUS_ACTIVITY, {
      userId: user.uid,
      action: 'mfa_setup_failed',
      error: (error as Error).message
    });
    throw error;
  }
};

export const disableMFA = async (user: FirebaseUser): Promise<void> => {
  try {
    // Log MFA disable
    await logSecurityEvent(SECURITY_EVENTS.MFA_DISABLED, {
      userId: user.uid
    });

    // Firebase MFA disable implementation
    console.warn('MFA disable requires Firebase Admin SDK on server-side');

  } catch (error) {
    throw error;
  }
};

// ============================================
// Google Authentication
// ============================================

export const signInWithGoogle = async (): Promise<FirebaseUser | null> => {
  if (Platform.OS === "web") {
    const provider = new GoogleAuthProvider();
    provider.addScope("profile");
    provider.addScope("email");

    const result = await signInWithPopup(auth, provider);

    // Create or update user document
    await createUserDocument(result.user);

    return result.user;
  } else {
    // For native platforms, we'll need expo-auth-session
    // This is handled in the component level with makeRedirectUri
    throw new Error(
      "Google Sign-In on native requires expo-auth-session setup"
    );
  }
};

// ============================================
// User Document Management
// ============================================

export const createUserDocument = async (
  firebaseUser: FirebaseUser,
  additionalData?: Partial<User>
): Promise<void> => {
  const userDocRef = doc(firestore, "users", firebaseUser.uid);
  const docSnap = await getDoc(userDocRef);

  if (!docSnap.exists()) {
    const userData = {
      name: additionalData?.name || firebaseUser.displayName || "User",
      email: firebaseUser.email || "",
      profilePhoto: firebaseUser.photoURL || null,
      defaultCurrency: additionalData?.defaultCurrency || "USD",
      homeCountry: additionalData?.homeCountry || null,
      onboardingComplete: false,
      walkthroughComplete: false,
      createdAt: Timestamp.now(),
      ...additionalData,
    };

    await setDoc(userDocRef, userData);
  }
};

export const getUserDocument = async (
  userId: string
): Promise<User | null> => {
  const docRef = doc(firestore, "users", userId);
  const docSnap = await getDoc(docRef);

  if (!docSnap.exists()) return null;

  const data = docSnap.data();
  return {
    id: docSnap.id,
    name: data.name,
    email: data.email,
    profilePhoto: data.profilePhoto,
    defaultCurrency: data.defaultCurrency || "USD",
    homeCountry: data.homeCountry,
    onboardingComplete: data.onboardingComplete || false,
    walkthroughComplete: data.walkthroughComplete || false,
    createdAt: data.createdAt?.toDate() || new Date(),
  } as User;
};

export const updateUserDocument = async (
  userId: string,
  data: Partial<User>
): Promise<void> => {
  const userDocRef = doc(firestore, "users", userId);
  await updateDoc(userDocRef, data as Record<string, unknown>);
};

// ============================================
// Profile Photo Upload
// ============================================

export const uploadProfilePhoto = async (
  userId: string,
  uri: string
): Promise<string> => {
  // Convert URI to blob
  const response = await fetch(uri);
  const blob = await response.blob();

  // Upload to Firebase Storage
  const photoRef = ref(storage, `profile-photos/${userId}`);
  await uploadBytes(photoRef, blob);

  // Get download URL
  const downloadUrl = await getDownloadURL(photoRef);

  // Update user document with photo URL
  await updateUserDocument(userId, { profilePhoto: downloadUrl });

  return downloadUrl;
};

// ============================================
// Onboarding State Management
// ============================================

export const checkOnboardingComplete = async (
  userId: string
): Promise<boolean> => {
  try {
    const userDoc = await getUserDocument(userId);
    return userDoc?.onboardingComplete || false;
  } catch {
    return false;
  }
};

export const setOnboardingComplete = async (userId: string): Promise<void> => {
  await updateUserDocument(userId, { onboardingComplete: true });
  await AsyncStorage.setItem(ONBOARDING_COMPLETE_KEY, "true");
};

export const checkWalkthroughComplete = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(WALKTHROUGH_COMPLETE_KEY);
    return value === "true";
  } catch {
    return false;
  }
};

export const setWalkthroughComplete = async (): Promise<void> => {
  await AsyncStorage.setItem(WALKTHROUGH_COMPLETE_KEY, "true");
};

export const resetOnboardingState = async (): Promise<void> => {
  await AsyncStorage.removeItem(ONBOARDING_COMPLETE_KEY);
  await AsyncStorage.removeItem(WALKTHROUGH_COMPLETE_KEY);
  await AsyncStorage.removeItem(GUEST_MODE_KEY);
};
