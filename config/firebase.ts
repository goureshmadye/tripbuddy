import { getApp, getApps, initializeApp } from "firebase/app";
import {
    Auth,
    browserLocalPersistence,
    getAuth,
    initializeAuth,
} from "firebase/auth";

// @ts-ignore
import { getReactNativePersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { Platform } from "react-native";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

// Initialize Firebase - check if already initialized
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

import { SecureStoreAdapter } from "@/utils/secure-store-adapter";

// ... imports

// Initialize Firebase Auth with persistence based on platform
let auth: Auth;
if (Platform.OS === "web") {
  auth = getAuth(app);
  // For web, set persistence
  auth.setPersistence(browserLocalPersistence);
} else {
  // For React Native, use initializeAuth with secure persistence
  try {
    auth = initializeAuth(app, {
      persistence: getReactNativePersistence(SecureStoreAdapter),
    });
  } catch (error: any) {
    // If already initialized, just get the existing instance
    if (error.code === "auth/already-initialized") {
      auth = getAuth(app);
    } else {
      throw error;
    }
  }
}

export { auth };

export const storage = getStorage(app);
export const firestore = getFirestore(app);

export default app;
