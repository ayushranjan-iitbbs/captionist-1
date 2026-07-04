'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  onAuthStateChanged,
  signOut as fbSignOut,
  signInWithCustomToken,
  type User as FirebaseUser,
} from 'firebase/auth';
import { auth } from '@/lib/firebaseClient';
import type { AppUser } from '@/types';

interface AuthCtx {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  loading: boolean;
  signInWithToken: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthCtx>({} as AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const syncToken = useCallback(async (fbUser: FirebaseUser | null) => {
    if (fbUser) {
      const token = await fbUser.getIdToken();
      document.cookie = `idToken=${token}; path=/; max-age=3600; samesite=lax`;
    } else {
      document.cookie = 'idToken=; path=/; max-age=0';
    }
  }, []);

  const fetchAppUser = useCallback(async (fbUser: FirebaseUser | null) => {
    if (!fbUser) {
      setUser(null);
      return;
    }
    const token = await fbUser.getIdToken();
    const res = await fetch('/api/me', { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) {
      const data = await res.json();
      setUser(data.user);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      await syncToken(fbUser);
      await fetchAppUser(fbUser);
      setLoading(false);
    });
    return () => unsub();
  }, [syncToken, fetchAppUser]);


  const signInWithToken = async (token: string) => {
    const cred = await signInWithCustomToken(auth, token);
    await fetchAppUser(cred.user);
  };

  const signOut = async () => {
    await fbSignOut(auth);
    setUser(null);
  };

  const refresh = async () => {
    await fetchAppUser(auth.currentUser);
  };

  return (
    <AuthContext.Provider
      value={{ firebaseUser, user, loading, signInWithToken, signOut, refresh }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
