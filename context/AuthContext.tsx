
import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '../types';
import { apiGetSession, apiLogin, apiLogout, apiRegister, apiResetPassword, apiGetUser, apiSaveSession, STORAGE_KEYS } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string, country: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: (silent?: boolean) => Promise<void>;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isBranchAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      // 1. Get session from LocalStorage for immediate UI rendering
      const session = apiGetSession();
      if (session) {
        setUser(session);

        // 2. Background Check: Verify if any important field changed in Firestore
        try {
          const freshUser = await apiGetUser(session.uid);
          if (freshUser) {
            // Check if any important field changed (role, branchID, country, branchCountry)
            const needsSync =
              freshUser.role !== session.role ||
              freshUser.branchID !== session.branchID ||
              freshUser.country !== session.country ||
              freshUser.branchCountry !== session.branchCountry;

            if (needsSync) {
              console.log("Syncing user profile from server...");
              apiSaveSession(freshUser);
              setUser(freshUser);
            }
          }
        } catch (e) {
          console.warn("Failed to sync session with server", e);
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Realtime listener - sync user data automatically when it changes in Firestore
  useEffect(() => {
    if (!user) return;

    // Import Firestore functions dynamically to avoid circular deps
    let unsubscribe: (() => void) | null = null;
    const userId = user.uid;

    const setupListener = async () => {
      try {
        const { doc, onSnapshot } = await import('firebase/firestore');
        const { db } = await import('../services/firebase');

        const userDocRef = doc(db, 'users', userId);
        unsubscribe = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const freshData = { ...docSnap.data(), uid: userId } as User;

            // Optimization: Only update if anything meaningful changed
            // This prevents infinite re-render loops in components that depend on 'user'
            const sessionStr = localStorage.getItem(STORAGE_KEYS.SESSION);
            const currentDataStr = sessionStr || JSON.stringify(user);
            const freshDataStr = JSON.stringify(freshData);

            if (currentDataStr !== freshDataStr) {
              console.log("User data changed in Firestore, syncing...");
              apiSaveSession(freshData);
              setUser(freshData);
            }
          }
        }, (error) => {
          console.warn("Firestore listener error:", error);
        });
      } catch (e) {
        console.warn("Could not setup realtime listener:", e);
      }
    };

    setupListener();

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [user?.uid]); // Only re-run when user ID changes

  const login = async (email: string, password: string) => {
    setLoading(true);
    try {
      const loggedUser = await apiLogin(email, password);
      setUser(loggedUser);
    } finally {
      setLoading(false);
    }
  };

  const register = async (name: string, email: string, password: string, country: string) => {
    setLoading(true);
    try {
      await apiRegister(name, email, password, country);
    } finally {
      setLoading(false);
    }
  }

  const resetPassword = async (email: string) => {
    setLoading(true);
    try {
      await apiResetPassword(email);
    } finally {
      setLoading(false);
    }
  }

  const logout = async () => {
    await apiLogout();
    setUser(null);
  };

  // Allows manual refresh of user data (e.g., after "Become Seller" approval)
  const refreshProfile = async (silent = false) => {
    if (!user) return;
    if (!silent) setLoading(true);
    try {
      const freshUser = await apiGetUser(user.uid);
      if (freshUser) {
        apiSaveSession(freshUser);
        setUser(freshUser);
      }
    } catch (e) {
      console.error("Failed to refresh profile", e);
    } finally {
      if (!silent) setLoading(false);
    }
  }

  const value = {
    user,
    loading,
    login,
    register,
    resetPassword,
    logout,
    refreshProfile,
    isAuthenticated: !!user,
    isSuperAdmin: user?.role === UserRole.SUPER_ADMIN,
    isBranchAdmin: user?.role === UserRole.BRANCH_ADMIN,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
