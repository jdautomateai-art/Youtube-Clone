import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, googleProvider } from './config';
import { handleFirestoreError, OperationType } from './errors';
import { UserProfile } from '../types';

interface AuthContextType {
  user: FirebaseUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (displayName: string, bio: string) => Promise<void>;
  authError: string | null;
  clearAuthError: () => void;
  showSignInModal: boolean;
  setShowSignInModal: (show: boolean) => void;
  signInPromptReason: string;
  triggerSignInPrompt: (reason?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const [showSignInModal, setShowSignInModal] = useState(false);
  const [signInPromptReason, setSignInPromptReason] = useState('Sign in to interact with videos and save content.');

  const triggerSignInPrompt = (reason?: string) => {
    if (reason) setSignInPromptReason(reason);
    setShowSignInModal(true);
  };

  const clearAuthError = () => setAuthError(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          const userSnap = await getDoc(userRef);
          const now = new Date().toISOString();
          if (userSnap.exists()) {
            const data = userSnap.data() as UserProfile;
            setProfile(data);
            // Update last active
            await updateDoc(userRef, { lastActive: now });
          } else {
            const newProfile: UserProfile = {
              id: currentUser.uid,
              displayName: currentUser.displayName || currentUser.email?.split('@')[0] || 'User',
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || `https://api.dicebear.com/7.x/bottts/svg?seed=${currentUser.uid}`,
              bio: '',
              createdAt: now,
              lastActive: now,
            };
            await setDoc(userRef, newProfile);
            setProfile(newProfile);
          }
        } catch (err) {
          console.error('Error fetching/creating profile:', err);
          handleFirestoreError(err, OperationType.GET, `users/${currentUser.uid}`);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      setShowSignInModal(false);
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-blocked') {
        setAuthError('The sign-in popup was blocked by your browser. Please allow popups or use "Open in new tab" above.');
      } else if (err.code === 'auth/popup-closed-by-user') {
        setAuthError('Sign-in was cancelled before completion. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setAuthError('This domain is not yet authorized in Firebase Console. Please add it to your Firebase authorized domains, or use the "Open in new tab" button.');
      } else {
        setAuthError(err.message || 'Failed to sign in with Google. If running inside a preview frame, click "Open in new tab" above.');
      }
    }
  };

  const signOut = async () => {
    try {
      await firebaseSignOut(auth);
      setProfile(null);
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  const updateUserProfile = async (displayName: string, bio: string) => {
    if (!user) throw new Error('Must be signed in');
    const userRef = doc(db, 'users', user.uid);
    try {
      await updateDoc(userRef, {
        displayName: displayName.trim().slice(0, 80),
        bio: bio.trim().slice(0, 500),
        lastActive: new Date().toISOString()
      });
      setProfile((prev) => prev ? { ...prev, displayName: displayName.trim().slice(0, 80), bio: bio.trim().slice(0, 500) } : null);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        signOut,
        updateUserProfile,
        authError,
        clearAuthError,
        showSignInModal,
        setShowSignInModal,
        signInPromptReason,
        triggerSignInPrompt
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
