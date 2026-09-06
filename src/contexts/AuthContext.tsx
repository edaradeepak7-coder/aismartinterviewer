'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

const AuthContext = createContext<any>({});

/** Read the CSRF token from the cookie set by middleware */
function getCsrfToken(): string {
  if (typeof document === 'undefined') return '';
  const match = document.cookie.match(/(?:^|;\s*)csrf_token=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<any>(null);
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'candidate' | 'recruiter' | 'admin' | 'institution_admin' | 'org_admin' | null>(null);
  const supabase = createClient();

  const fetchUserRole = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
      if (data?.role) {
        // Map DB roles to sidebar roles
        const roleMap: Record<string, 'candidate' | 'recruiter' | 'admin'> = {
          candidate: 'candidate',
          recruiter: 'recruiter',
          super_admin: 'admin',
          admin: 'admin',
          institution_admin: 'admin',
          org_admin: 'admin',
          placement_officer: 'admin',
          evaluator: 'recruiter',
          faculty: 'recruiter',
        };
        setUserRole(data.role);
        return roleMap[data.role] ?? 'candidate';
      }
    } catch {}
    return 'candidate';
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchUserRole(session.user.id);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Email/Password Sign Up
  const signUp = async (email: string, password: string, metadata = {}) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: (metadata as any)?.fullName || '',
          avatar_url: (metadata as any)?.avatarUrl || ''
        },
        emailRedirectTo: `${window.location.origin}/auth/callback`
      }
    });
    if (error) throw error;
    return data;
  };

  // Email/Password Sign In
  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    if (error) throw error;
    return data;
  };

  // Sign Out — clears session and CSRF state
  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setUserRole(null);
    try { sessionStorage.removeItem('__login_guard__'); } catch {}
  };

  // Send Password Reset Email
  const sendPasswordResetEmail = async (email: string) => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || (typeof window !== 'undefined' ? window.location.origin : '');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${siteUrl}/auth/callback?next=/reset-password`,
    });
    if (error) throw error;
  };

  // Update Password (after reset link clicked)
  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
  };

  // Get Current User
  const getCurrentUser = async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  };

  // Check if Email is Verified
  const isEmailVerified = () => {
    return user?.email_confirmed_at !== null;
  };

  // Get User Profile from Database
  const getUserProfile = async () => {
    if (!user) return null;
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    if (error) throw error;
    return data;
  };

  // Get sidebar role from DB role
  const getSidebarRole = (): 'candidate' | 'recruiter' | 'admin' => {
    const roleMap: Record<string, 'candidate' | 'recruiter' | 'admin'> = {
      candidate: 'candidate',
      recruiter: 'recruiter',
      super_admin: 'admin',
      admin: 'admin',
      institution_admin: 'admin',
      org_admin: 'admin',
      placement_officer: 'admin',
      evaluator: 'recruiter',
      faculty: 'recruiter',
    };
    return roleMap[userRole ?? 'candidate'] ?? 'candidate';
  };

  const value = {
    user,
    session,
    loading,
    userRole,
    getSidebarRole,
    signUp,
    signIn,
    signOut,
    sendPasswordResetEmail,
    updatePassword,
    getCurrentUser,
    isEmailVerified,
    getUserProfile,
    getCsrfToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
