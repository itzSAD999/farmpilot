import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
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

  // Load profile in the background — never blocks rendering
  const loadProfileQuietly = useCallback(async (_u?: User) => {
    try {
      const p = await authApi.getProfile();
      setProfile(p);
    } catch (e) {
      console.error("Profile load error:", e);
    }
  }, []);

  // Wrapped sign-in functions that set user IMMEDIATELY from the response,
  // so ProtectedRoute sees the user before navigation happens.
  const signInWithPhone = useCallback(async (phone: string, password: string) => {
    const data = await authApi.signInWithPhone(phone, password);
    if (data.session?.user) {
      setUser(data.session.user);
      setIsLoading(false);
      loadProfileQuietly(data.session.user);
    }
    return data;
  }, [loadProfileQuietly]);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const data = await authApi.signInWithEmail(email, password);
    if (data.session?.user) {
      setUser(data.session.user);
      setIsLoading(false);
      loadProfileQuietly(data.session.user);
    }
    return data;
  }, [loadProfileQuietly]);

  const signUpWithPhone = useCallback(async (phone: string, password: string, fullName: string) => {
    const data = await authApi.signUpWithPhone(phone, password, fullName);
    if (data.session?.user) {
      setUser(data.session.user);
      setIsLoading(false);
      loadProfileQuietly(data.session.user);
    }
    return data;
  }, [loadProfileQuietly]);

  const signUpWithEmail = useCallback(async (email: string, password: string, fullName: string) => {
    const data = await authApi.signUpWithEmail(email, password, fullName);
    if (data.session?.user) {
      setUser(data.session.user);
      setIsLoading(false);
      loadProfileQuietly(data.session.user);
    }
    return data;
  }, [loadProfileQuietly]);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      if (!mounted) return;
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (session?.user) {
          if (mounted) {
            setUser(session.user);
            setIsLoading(false);
          }
          // Load profile in background — don't block rendering
          loadProfileQuietly(session.user);
        }
      } catch (err) {
        console.error("Session load error:", err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    loadSession();

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
      } else if (session?.user) {
        setUser(session.user);
        // Profile loading is fire-and-forget, never blocks state updates
        loadProfileQuietly(session.user);
      }
      setIsLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      isLoading,
      signInWithPhone,
      signUpWithPhone,
      signUpWithEmail,
      signInWithEmail,
      signOut: authApi.signOut,
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

