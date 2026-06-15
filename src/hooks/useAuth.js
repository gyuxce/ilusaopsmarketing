import { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';

function getMockUserId(email) {
  return `mock-${String(email || 'user').trim().toLowerCase()}`;
}

export function useAuth() {
  const [session, setSession] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId, userEmail) => {
    if (!isSupabaseConfigured || !supabase) {
      setUserProfile({
        name: userEmail ? userEmail.split('@')[0] : 'User (Mock)',
        role: 'Admin',
        department: 'Ops'
      });
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email, role, department')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        setUserProfile(data);
      } else {
        // Backfill deployments that have not installed the auth trigger yet.
        const fallbackName = userEmail ? userEmail.split('@')[0] : 'Ilusa Member';
        const newUser = {
          id: userId,
          name: fallbackName,
          email: userEmail || `user-${userId}@ilusa.co`,
          role: 'Staff',
          department: 'Ops',
          status: 'Active'
        };
        
        try {
          const { data: insertedUser, error: insertErr } = await supabase
            .from('users')
            .insert([newUser])
            .select()
            .maybeSingle();
            
          if (insertedUser) {
            setUserProfile(insertedUser);
          } else {
            throw insertErr || new Error('Profile registration returned no data.');
          }
        } catch (insertCatch) {
          console.error('Auto-register threw:', insertCatch);
          setUserProfile(newUser);
        }
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Mock mode session check
      const timer = setTimeout(() => {
        const mockSession = localStorage.getItem('mock_session');
        if (mockSession) {
          const email = localStorage.getItem('mock_user_email') || 'pratama@ilusa.co';
          const userId = getMockUserId(email);
          setSession({ user: { id: userId, email } });
          fetchProfile(userId, email);
        } else {
          setLoading(false);
        }
      }, 0);
      return () => clearTimeout(timer);
    }

    // Get current session
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      if (currentSession) {
        fetchProfile(currentSession.user.id, currentSession.user.email);
      } else {
        setLoading(false);
      }
    });

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession);
      if (currentSession) {
        fetchProfile(currentSession.user.id, currentSession.user.email);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  }, []);

  const login = async (email, password) => {
    if (!isSupabaseConfigured || !supabase) {
      // Mock login always succeeds
      localStorage.setItem('mock_session', 'true');
      localStorage.setItem('mock_user_email', email);
      const userId = getMockUserId(email);
      const mockSess = { user: { id: userId, email } };
      setSession(mockSess);
      await fetchProfile(userId, email);
      return { data: { session: mockSess }, error: null };
    }

    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) {
      setLoading(false);
    } else if (data?.session) {
      setSession(data.session);
      await fetchProfile(data.session.user.id, data.session.user.email);
    }
    
    return { data, error };
  };

  const logout = async () => {
    if (!isSupabaseConfigured || !supabase) {
      localStorage.removeItem('mock_session');
      localStorage.removeItem('mock_user_email');
      setSession(null);
      setUserProfile(null);
      return { error: null };
    }

    setLoading(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Logout error:', error);
    }
    setSession(null);
    setUserProfile(null);
    setLoading(false);
    return { error };
  };

  return {
    session,
    user: session?.user || null,
    userProfile,
    loading,
    login,
    logout,
  };
}
