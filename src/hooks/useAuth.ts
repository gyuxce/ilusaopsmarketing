import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

function getMockUserId(email: string): string {
  return `mock-${String(email || 'user').trim().toLowerCase()}`;
}

interface Session {
  user: {
    id: string;
    email: string;
  };
}

interface UserProfile {
  id?: string;
  name: string;
  email?: string;
  role: string;
  department: string;
  status?: string;
}

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const fetchingProfile = useRef(false);

  const fetchProfile = async (userId: string, userEmail: string) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, department')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile(data);
      } else {
        const fallbackName = userEmail ? userEmail.split('@')[0] : 'Ilusa Member';
        const newUser = {
          id: userId,
          name: fallbackName,
          email: userEmail || `user-${userId}@ilusa.co`,
          role: 'Staff',
          department: 'Ops',
          status: 'Active',
        };
        try {
          const { data: insertedUser } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .maybeSingle();
          setUserProfile(insertedUser || newUser);
        } catch {
          setUserProfile(newUser);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
      fetchingProfile.current = false;
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession as any);
      if (currentSession && !fetchingProfile.current) {
        fetchingProfile.current = true;
        fetchProfile(currentSession.user.id, currentSession.user.email ?? '');
      } else if (!currentSession) {
        setLoading(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession as any);
      if (currentSession) {
        if (!fetchingProfile.current) {
          fetchingProfile.current = true;
          fetchProfile(currentSession.user.id, currentSession.user.email ?? '');
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setLoading(false);
    return { data, error };
  };

  const logout = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Logout error:', error);
    setSession(null);
    setUserProfile(null);
    setLoading(false);
    return { error };
  };

  return {
    session,
    user: session?.user ?? null,
    userProfile,
    loading,
    login,
    logout,
  };
}
