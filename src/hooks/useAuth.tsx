import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

type AppRole = 'admin' | 'productor' | 'cliente';

interface Profile {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  dni: string | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  avatar_url: string | null;
  marketing_consent: boolean;
  preferred_contact: string;
  account_status: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  loading: boolean;
  rolesLoaded: boolean;
  isAdmin: boolean;
  isProductor: boolean;
  isCliente: boolean;
  isAccountActive: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  completeInvitePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getDefaultDashboard: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);

  const fetchProfile = async (userId: string) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      
      if (data) {
        setProfile(data as Profile);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    try {
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId);
      
      if (error) {
        console.error('Error fetching roles:', error);
        return [];
      }
      
      if (data && data.length > 0) {
        const fetchedRoles = data.map(r => r.role as AppRole);
        setRoles(fetchedRoles);
        return fetchedRoles;
      }
      return [];
    } catch (error) {
      console.error('Error fetching roles:', error);
      return [];
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await Promise.all([fetchProfile(user.id), fetchRoles(user.id)]);
    }
  };

  const getDefaultDashboard = (): string => {
    if (roles.includes('admin')) return '/admin';
    if (roles.includes('productor')) return '/productor';
    return '/login';
  };

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        
        if (!mounted) return;

        if (initialSession?.user) {
          setSession(initialSession);
          setUser(initialSession.user);
          
          await Promise.all([
            fetchProfile(initialSession.user.id),
            fetchRoles(initialSession.user.id)
          ]);
        }
        
        if (mounted) {
          setRolesLoaded(true);
          setLoading(false);
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          setRolesLoaded(true);
          setLoading(false);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;

        setSession(newSession);
        setUser(newSession?.user ?? null);
        
        if (newSession?.user) {
          await Promise.all([
            fetchProfile(newSession.user.id),
            fetchRoles(newSession.user.id)
          ]);
          setRolesLoaded(true);
        } else {
          setProfile(null);
          setRoles([]);
          setRolesLoaded(true);
        }
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    setRolesLoaded(false);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    
    if (!error) {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      if (currentUser) {
        await fetchRoles(currentUser.id);
        await fetchProfile(currentUser.id);
        setRolesLoaded(true);
      }
    }
    
    return { error };
  };

  const completeInvitePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error };
    }

    await supabase.auth.refreshSession();
    const uid = data.user?.id ?? user?.id;
    if (uid) {
      await Promise.all([fetchProfile(uid), fetchRoles(uid)]);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setRolesLoaded(true);
  };

  const isAdmin = roles.includes('admin');
  const isProductor = roles.includes('productor');
  const isCliente = roles.includes('cliente');
  const isAccountActive = profile?.account_status === 'active' || isAdmin;

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      loading,
      rolesLoaded,
      isAdmin,
      isProductor,
      isCliente,
      isAccountActive,
      signIn,
      completeInvitePassword,
      signOut,
      refreshProfile,
      getDefaultDashboard
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
