import { auth, firestore, storage } from "@/config/firebase";
import { User } from "@/types/database";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    AuthError,
    createUserWithEmailAndPassword,
    fetchSignInMethodsForEmail,
    User as FirebaseUser,
    GoogleAuthProvider,
    sendPasswordResetEmail,
    signInWithEmailAndPassword,
    signInWithPopup,
    updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, Timestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Platform } from "react-native";

// Storage keys
const ONBOARDING_COMPLETE_KEY = "@tripbuddy/onboarding_complete";
const WALKTHROUGH_COMPLETE_KEY = "@tripbuddy/walkthrough_complete";
const GUEST_MODE_KEY = "@tripbuddy/guest_mode";

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
  const userCredential = await signInWithEmailAndPassword(
    auth,
    email,
    password
  );
  return userCredential.user;
};

export const resetPassword = async (email: string): Promise<void> => {
  await sendPasswordResetEmail(auth, email);
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

// ============================================
// Guest Mode Management
// ============================================

export const setGuestMode = async (enabled: boolean): Promise<void> => {
  if (enabled) {
    await AsyncStorage.setItem(GUEST_MODE_KEY, "true");
  } else {
    await AsyncStorage.removeItem(GUEST_MODE_KEY);
  }
};

export const checkGuestMode = async (): Promise<boolean> => {
  try {
    const value = await AsyncStorage.getItem(GUEST_MODE_KEY);
    return value === "true";
  } catch {
    return false;
  }
};
