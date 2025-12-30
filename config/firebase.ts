import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCcGSx4xWEIRDo-aWaVlKjE2NKIIz70Ekg",
  authDomain: "tripbuddy-3c0fa.firebaseapp.com",
  projectId: "tripbuddy-3c0fa",
  storageBucket: "tripbuddy-3c0fa.firebasestorage.app",
  messagingSenderId: "735825152806",
  appId: "1:735825152806:web:6f898dfadc2a2d2a6e8fe7",
  measurementId: "G-SZB394CW4M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const storage = getStorage(app);
export const firestore = getFirestore(app);

export default app;
