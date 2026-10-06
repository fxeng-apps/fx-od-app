/* oxlint-disable react/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../config/firebase';
import type { UserProfile, UserRole } from '../types/user';
import { signInWithGoogle, signOutUser, fetchUserProfileByUid } from '../services/firebase/authService';
import { requestAndSaveFCMToken, setupForegroundNotificationListener } from '../services/firebase/fcmService';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  activeRole: UserRole | null;
  loading: boolean;
  error: string | null;
  loginWithGoogle: () => Promise<UserProfile>;
  logout: () => Promise<void>;
  switchActiveRole: (role: UserRole) => void;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activeRole, setActiveRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const refreshUserProfile = async () => {
    if (auth.currentUser) {
      const profile = await fetchUserProfileByUid(auth.currentUser.uid);
      if (profile) {
        setUserProfile(profile);
        if (!activeRole) setActiveRole(profile.role);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setLoading(true);
      setError(null);
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const profile = await fetchUserProfileByUid(fbUser.uid);
          if (profile && profile.isActive && !profile.isDeleted) {
            setUserProfile(profile);
            setActiveRole(profile.role);

            // Initialize FCM Token & Foreground Notification Listener asynchronously
            requestAndSaveFCMToken(profile.uid).catch((err) =>
              console.error('FCM Token registration error:', err)
            );
          } else {
            // Profile not found or inactive
            setUserProfile(null);
            setActiveRole(null);
          }
        } catch (err) {
          console.error('Error loading user profile on auth state change:', err);
          setError(err instanceof Error ? err.message : 'Authentication Error');
        }
      } else {
        setFirebaseUser(null);
        setUserProfile(null);
        setActiveRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to FCM Foreground Notification Messages
  useEffect(() => {
    if (!userProfile?.uid) return;

    let isMounted = true;
    let unsubListener: (() => void) | undefined;

    setupForegroundNotificationListener(({ title, message }) => {
      console.log(`[FCM_FOREGROUND] Notification: ${title} - ${message}`);
    }).then((unsub) => {
      if (!isMounted) {
        if (unsub) unsub();
      } else {
        unsubListener = unsub;
      }
    });

    return () => {
      isMounted = false;
      if (unsubListener) unsubListener();
    };
  }, [userProfile?.uid]);

  const handleGoogleLogin = async (): Promise<UserProfile> => {
    setLoading(true);
    setError(null);
    try {
      const profile = await signInWithGoogle();
      setUserProfile(profile);
      setActiveRole(profile.role);

      // Trigger FCM Token registration on Google Sign-In
      requestAndSaveFCMToken(profile.uid).catch((err) =>
        console.error('FCM Token registration error:', err)
      );

      return profile;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in with Google';
      setError(msg);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    setLoading(true);
    try {
      await signOutUser(userProfile);
      setUserProfile(null);
      setActiveRole(null);
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  const switchActiveRole = (role: UserRole) => {
    setActiveRole(role);
  };

  return (
    <AuthContext.Provider
      value={{
        firebaseUser,
        userProfile,
        activeRole,
        loading,
        error,
        loginWithGoogle: handleGoogleLogin,
        logout: handleLogout,
        switchActiveRole,
        refreshUserProfile,
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
