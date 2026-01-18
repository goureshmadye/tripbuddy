import { auth, firestore } from "@/config/firebase";
import {
    checkOnboardingComplete,
    checkWalkthroughComplete,
    getAuthErrorMessage,
    resetOnboardingState,
    resetPassword as resetPasswordService,
    setOnboardingComplete as setOnboardingCompleteService,
    setWalkthroughComplete as setWalkthroughCompleteService,
    signInWithEmail as signInWithEmailService,
    signInWithGoogleCredential as signInWithGoogleCredentialService,
    signInWithGoogle as signInWithGoogleService,
    signUpWithEmail as signUpWithEmailService,
    updateUserDocument,
    uploadProfilePhoto as uploadProfilePhotoService,
} from "@/services/auth";
import {
    getTrip,
    getUserPendingInvitations,
    updateInvitationUserId,
} from "@/services/firestore";
import { checkGuestMode, setGuestMode } from "@/services/guest-mode";
import { notifyTripInvitation } from "@/services/notifications";
import {
    cacheUserSession,
    clearCachedSession,
    getCachedUser,
} from "@/services/offline";
import { User } from "@/types/database";
import {
    AuthError,
    User as FirebaseUser,
    onAuthStateChanged,
    signOut,
} from "firebase/auth";
import { doc, onSnapshot, setDoc, Timestamp } from "firebase/firestore";
import React, {
    createContext,
    ReactNode,
    useContext,
    useEffect,
    useState,
} from "react";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  isOnboardingComplete: boolean;
  isWalkthroughComplete: boolean;
  isGuestMode: boolean;
  isAuthenticated: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    name?: string,
  ) => Promise<void>;
  signInWithGoogle: (idToken?: string) => Promise<void>;
  signOutUser: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  refreshUser: () => Promise<void>;
  updateProfile: (data: Partial<User>) => Promise<void>;
  uploadProfilePhoto: (uri: string) => Promise<string>;
  completeOnboarding: () => Promise<void>;
  completeWalkthrough: () => Promise<void>;
  resetWalkthrough: () => Promise<void>;
  enableGuestMode: () => Promise<void>;
  disableGuestMode: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check for pending invitations when a new user signs up
const checkPendingInvitationsForNewUser = async (
  userId: string,
  email: string,
) => {
  try {
    const pendingInvitations = await getUserPendingInvitations(email);

    for (const invitation of pendingInvitations) {
      // Update the invitation with the new user's ID
      await updateInvitationUserId(invitation.id, userId);

      // Get trip details for the notification
      const trip = await getTrip(invitation.tripId);

      // Send notification to the new user about their pending invitation
      await notifyTripInvitation(
        userId,
        invitation.tripId,
        trip?.title || "Trip",
        "Someone", // We don't have inviter name readily available
        invitation.invitedBy,
        invitation.id,
      );
    }

    if (pendingInvitations.length > 0) {
      console.log(
        `Sent ${pendingInvitations.length} pending invitation notifications to new user ${userId}`,
      );
    }
  } catch (error) {
    console.error("Error checking pending invitations for new user:", error);
  }
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);
  const [isWalkthroughComplete, setIsWalkthroughComplete] = useState(false);
  const [isGuestMode, setIsGuestMode] = useState(false);

  // Computed property: user is authenticated if they have a Firebase user and are NOT in guest mode
  const isAuthenticated = !!firebaseUser && !isGuestMode;

  // Check walkthrough and guest mode status on mount
  useEffect(() => {
    checkWalkthroughComplete().then(setIsWalkthroughComplete);
    checkGuestMode().then(setIsGuestMode);

    // Load cached user for offline access
    getCachedUser().then((cachedUser) => {
      if (cachedUser && !user) {
        setUser(cachedUser);
      }
    });
  }, []);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);

      if (fbUser) {
        // Check if user is in guest mode
        const guestMode = await checkGuestMode();
        setIsGuestMode(guestMode);

        if (!guestMode) {
          // Check onboarding status
          checkOnboardingComplete(fbUser.uid).then(setIsOnboardingComplete);

          // Set up real-time listener for user document
          const userDocRef = doc(firestore, "users", fbUser.uid);

          const unsubscribeUser = onSnapshot(
            userDocRef,
            async (docSnap) => {
              if (docSnap.exists()) {
                const data = docSnap.data();
                const userData: User = {
                  id: docSnap.id,
                  name: data.name || fbUser.displayName || "User",
                  email: data.email || fbUser.email || "",
                  profilePhoto: data.profilePhoto || fbUser.photoURL,
                  defaultCurrency: data.defaultCurrency || "USD",
                  homeCountry: data.homeCountry || null,
                  onboardingComplete: data.onboardingComplete || false,
                  walkthroughComplete: data.walkthroughComplete || false,
                  createdAt: data.createdAt?.toDate() || new Date(),
                  subscriptionTier: data.subscriptionTier || "free",
                  upiId: data.upiId || null,
                };
                setUser(userData);
                setIsOnboardingComplete(data.onboardingComplete || false);

                // Cache user session for offline access
                cacheUserSession(userData).catch(console.error);
              } else {
                // Create user document if it doesn't exist
                const newUser: Omit<User, "id"> = {
                  name: fbUser.displayName || "User",
                  email: fbUser.email || "",
                  profilePhoto: fbUser.photoURL || null,
                  defaultCurrency: "USD",
                  homeCountry: null,
                  onboardingComplete: false,
                  walkthroughComplete: false,
                  createdAt: new Date(),
                  subscriptionTier: "free",
                };

                await setDoc(userDocRef, {
                  ...newUser,
                  createdAt: Timestamp.now(),
                });

                setUser({ id: fbUser.uid, ...newUser });
                setIsOnboardingComplete(false);

                // Check for pending invitations for this email and send notifications
                if (newUser.email) {
                  checkPendingInvitationsForNewUser(
                    fbUser.uid,
                    newUser.email,
                  ).catch(console.error);
                }
              }
              setLoading(false);
            },
            (error) => {
              // Only log if it's not a permission error (which is expected when signing out)
              if (error.code !== "permission-denied") {
                console.error("Error listening to user document:", error);
              }
              setLoading(false);
            },
          );

          return () => unsubscribeUser();
        } else {
          // Guest mode - don't set up user document listener
          setUser(null);
          setIsOnboardingComplete(false);
          setLoading(false);
        }
      } else {
        setUser(null);
        setIsOnboardingComplete(false);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    try {
      await signInWithEmailService(email, password);
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      throw new Error(message);
    }
  };

  const signUpWithEmail = async (
    email: string,
    password: string,
    name?: string,
  ) => {
    try {
      await signUpWithEmailService(email, password, name);
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      throw new Error(message);
    }
  };

  const signInWithGoogle = async (idToken?: string) => {
    try {
      if (idToken) {
        await signInWithGoogleCredentialService(idToken);
      } else {
        await signInWithGoogleService();
      }
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      throw new Error(message);
    }
  };

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setIsOnboardingComplete(false);
    } catch (error) {
      console.error("Error signing out:", error);
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    try {
      await resetPasswordService(email);
    } catch (error) {
      const message = getAuthErrorMessage(error as AuthError);
      throw new Error(message);
    }
  };

  const refreshUser = async () => {
    if (!firebaseUser) return;

    const userDocRef = doc(firestore, "users", firebaseUser.uid);
    const docSnap = await new Promise<typeof user>((resolve) => {
      const unsubscribe = onSnapshot(userDocRef, (snap) => {
        unsubscribe();
        if (snap.exists()) {
          const data = snap.data();
          resolve({
            id: snap.id,
            name: data.name,
            email: data.email,
            profilePhoto: data.profilePhoto,
            defaultCurrency: data.defaultCurrency || "USD",
            homeCountry: data.homeCountry || null,
            onboardingComplete: data.onboardingComplete || false,
            walkthroughComplete: data.walkthroughComplete || false,
            createdAt: data.createdAt?.toDate() || new Date(),
            subscriptionTier: data.subscriptionTier || "free",
          });
        } else {
          resolve(null);
        }
      });
    });

    if (docSnap) {
      setUser(docSnap);
      setIsOnboardingComplete(docSnap.onboardingComplete || false);
    }
  };

  const updateProfile = async (data: Partial<User>) => {
    if (!firebaseUser) throw new Error("No authenticated user");
    await updateUserDocument(firebaseUser.uid, data);
  };

  const uploadProfilePhoto = async (uri: string): Promise<string> => {
    if (!firebaseUser) throw new Error("No authenticated user");
    return uploadProfilePhotoService(firebaseUser.uid, uri);
  };

  const completeOnboarding = async () => {
    if (!firebaseUser) throw new Error("No authenticated user");
    await setOnboardingCompleteService(firebaseUser.uid);
    setIsOnboardingComplete(true);
  };

  const completeWalkthrough = async () => {
    await setWalkthroughCompleteService();
    setIsWalkthroughComplete(true);
  };

  const resetWalkthrough = async () => {
    await resetOnboardingState();
    setIsWalkthroughComplete(false);
    setIsOnboardingComplete(false);
    setIsGuestMode(false);
  };

  const enableGuestMode = async () => {
    await setGuestMode(true);
    setIsGuestMode(true);
    // Clear user data and cached session for privacy when entering guest mode
    setUser(null);
    await clearCachedSession();
  };

  const disableGuestMode = async () => {
    await setGuestMode(false);
    setIsGuestMode(false);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        user,
        loading,
        isOnboardingComplete,
        isWalkthroughComplete,
        isGuestMode,
        isAuthenticated,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        signOutUser,
        resetPassword,
        refreshUser,
        updateProfile,
        uploadProfilePhoto,
        completeOnboarding,
        completeWalkthrough,
        resetWalkthrough,
        enableGuestMode,
        disableGuestMode,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
