import { auth, firestore } from '@/config/firebase';
import { User } from '@/types/database';
import { onAuthStateChanged, signOut, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc, Timestamp } from 'firebase/firestore';
import React, { createContext, ReactNode, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signOutUser: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      
      if (fbUser) {
        // Set up real-time listener for user document
        const userDocRef = doc(firestore, 'users', fbUser.uid);
        
        const unsubscribeUser = onSnapshot(userDocRef, async (docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            setUser({
              id: docSnap.id,
              name: data.name || fbUser.displayName || 'User',
              email: data.email || fbUser.email || '',
              profilePhoto: data.profilePhoto || fbUser.photoURL,
              defaultCurrency: data.defaultCurrency || 'USD',
              createdAt: data.createdAt?.toDate() || new Date(),
            });
          } else {
            // Create user document if it doesn't exist
            const newUser: Omit<User, 'id'> = {
              name: fbUser.displayName || 'User',
              email: fbUser.email || '',
              profilePhoto: fbUser.photoURL || null,
              defaultCurrency: 'USD',
              createdAt: new Date(),
            };
            
            await setDoc(userDocRef, {
              ...newUser,
              createdAt: Timestamp.now(),
            });
            
            setUser({ id: fbUser.uid, ...newUser });
          }
          setLoading(false);
        }, (error) => {
          console.error('Error listening to user document:', error);
          setLoading(false);
        });

        return () => unsubscribeUser();
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  const signOutUser = async () => {
    try {
      await signOut(auth);
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
      throw error;
    }
  };

  const refreshUser = async () => {
    if (!firebaseUser) return;
    
    const userDocRef = doc(firestore, 'users', firebaseUser.uid);
    const docSnap = await getDoc(userDocRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      setUser({
        id: docSnap.id,
        name: data.name,
        email: data.email,
        profilePhoto: data.profilePhoto,
        defaultCurrency: data.defaultCurrency || 'USD',
        createdAt: data.createdAt?.toDate() || new Date(),
      });
    }
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signOutUser, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
