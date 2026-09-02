import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';
import * as authApi from '../api/auth';
import type { Profile } from '../api/auth';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  isLoading: boolean;
  signInWithPhone: (phone: string, password: string) => Promise<any>;
  signUpWithPhone: (phone: string, password: string, fullName: string) => Promise<any>;
  signUpWithEmail: (email: string, password: string, fullName: string) => Promise<any>;
  signInWithEmail: (email: string, password: string) => Promise<any>;
  signOut: typeof authApi.signOut;
  linkEmail: typeof authApi.linkEmail;
  updateLanguage: typeof authApi.updateLanguage;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const userRef = useRef<User | null>(null);

  useEffect(() => {
    userRef.current = user;
  }, [user]);

  const loadProfileQuietly = useCallback(async (_u?: User) => {
    try {
      const p = await authApi.getProfile();
      setProfile(p);
    } catch (e) {
      console.error("Profile load error:", e);
    }
  }, []);

  const applySessionUser = useCallback((nextUser: User | null) => {
    setUser(nextUser);
    if (nextUser) {
      setTimeout(() => loadProfileQuietly(nextUser), 0);
    } else {
      setProfile(null);
    }
  }, [loadProfileQuietly]);

  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    const data = await authApi.signInWithPhone(phone, password);
    if (data.session?.user) {
      applySessionUser(data.session.user);
      setIsLoading(false);
    }
    return data;
  }, [applySessionUser]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const data = await authApi.signInWithEmail(email, password);
    if (data.session?.user) {
      applySessionUser(data.session.user);
      setIsLoading(false);
    }
    return data;
  }, [applySessionUser]);

  const signUpWithPhone = useCallback(async (phone: string, password: string, fullName: string) => {
    const data = await authApi.signUpWithPhone(phone, password, fullName);
    if (data.session?.user) {
      applySessionUser(data.session.user);
      setIsLoading(false);
    }
    return data;
  }, [applySessionUser]);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    const data = await authApi.signUpWithEmail(email, password, fullName);
    if (data.session?.user) {
      applySessionUser(data.session.user);
      setIsLoading(false);
    }
    return data;
  }, [applySessionUser]);



  const signOut = useCallback(async () => {
    try {
      await authApi.signOut();
    } catch (e) {
      console.warn('Sign out API error (user may already be deleted):', e);
    }
    // We don't manually clear user state here anymore.
    // The SIGNED_OUT event listener below will handle it cleanly!
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          applySessionUser(session.user);
        }
      } catch (err) {
        console.error("Session load error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT') {
        // If Supabase fires SIGNED_OUT (whether from explicit sign out or
        // a background token refresh failure), we MUST clear the user state.
        // Otherwise, the UI gets trapped in a zombie state where it thinks 
        // the user is logged in, but all database requests fail with 401s.
        setUser(null);
        setProfile(null);
        setIsLoading(false);
        return;
      }

      // Keep the current user during token refresh / init so the setup page
      // is not bounced to the homepage while the session is still valid.
      if (session?.user) {
        applySessionUser(session.user);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [applySessionUser]);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      signInWithPhone,
      signUpWithPhone,
      signUpWithEmail,
      signInWithEmail,
      signOut,
      linkEmail: authApi.linkEmail,
      updateLanguage: authApi.updateLanguage,
    }}>
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
