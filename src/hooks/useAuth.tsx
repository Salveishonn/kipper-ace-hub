import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { resolvePostAuthDestination } from '@/lib/authRouting';

type AppRole = 'admin' | 'productor';

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

export type ProducerApplicationSummary = {
  id: string;
  email: string;
  full_name: string;
  status: string;
  created_at: string;
  approved_at: string | null;
} | null;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  roles: AppRole[];
  producerApplication: ProducerApplicationSummary;
  loading: boolean;
  rolesLoaded: boolean;
  authError: string | null;
  isAdmin: boolean;
  isProductor: boolean;
  isAccountActive: boolean;
  isPendingApplicant: boolean;
  isRejectedApplicant: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  completeInvitePassword: (password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  getDefaultDashboard: () => string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/** Max time we allow the profile/role lookup to run before unblocking the UI. */
const USER_DATA_TIMEOUT_MS = 10000;

const AUTH_ERROR_MESSAGE =
  'No pudimos verificar el acceso de tu cuenta. Recargá la página o intentá nuevamente en unos minutos.';

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [producerApplication, setProducerApplication] =
    useState<ProducerApplicationSummary>(null);
  const [loading, setLoading] = useState(true);
  const [rolesLoaded, setRolesLoaded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  /** Throws on query errors; a missing profile resolves to null (it must not block the UI). */
  const fetchProfile = async (userId: string): Promise<Profile | null> => {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(`Error fetching profile: ${error.message}`);
    }
    return (data as Profile | null) ?? null;
  };

  /** Throws on query errors; a user without rows simply has no roles. */
  const fetchRoles = async (userId: string): Promise<AppRole[]> => {
    const { data, error } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);

    if (error) {
      throw new Error(`Error fetching roles: ${error.message}`);
    }
    return (data ?? []).map((r) => r.role as AppRole);
  };

  const fetchProducerApplication = async (): Promise<ProducerApplicationSummary> => {
    const { data, error } = await supabase.rpc('get_my_producer_application');
    if (!error) {
      const row = Array.isArray(data) ? data[0] : data;
      return (row as ProducerApplicationSummary) ?? null;
    }

    const { data: rows, error: selErr } = await supabase
      .from('producer_applications')
      .select('id, email, full_name, status, created_at, approved_at')
      .order('created_at', { ascending: false })
      .limit(1);

    if (selErr) {
      // Pending applicants without SELECT yet should not hard-fail auth.
      console.warn('producer application lookup:', selErr.message);
      return null;
    }
    return (rows?.[0] as ProducerApplicationSummary) ?? null;
  };

  /**
   * Loads profile + roles for an authenticated user.
   * Guaranteed to finish: RLS errors, missing rows, network failures and
   * timeouts all land in catch/finally, so `rolesLoaded`/`loading` always resolve.
   */
  const loadUserData = async (userId: string) => {
    setRolesLoaded(false);
    setAuthError(null);
    try {
      const [profileData, rolesData, applicationData] = await withTimeout(
        Promise.all([fetchProfile(userId), fetchRoles(userId), fetchProducerApplication()]),
        USER_DATA_TIMEOUT_MS,
        'Profile/role lookup',
      );
      setProfile(profileData);
      setRoles(rolesData);
      setProducerApplication(applicationData);
    } catch (error) {
      console.error('Error loading user data:', error);
      setProfile(null);
      setRoles([]);
      setProducerApplication(null);
      setAuthError(AUTH_ERROR_MESSAGE);
    } finally {
      // rolesLoaded means "the role lookup finished", not "the user has a role".
      setRolesLoaded(true);
      setLoading(false);
    }
  };

  /** Anonymous / signed-out resting state: nothing pending, nothing loaded. */
  const applySignedOutState = () => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setRoles([]);
    setProducerApplication(null);
    setAuthError(null);
    setRolesLoaded(true);
    setLoading(false);
  };

  const refreshProfile = async () => {
    if (!user) return;
    try {
      const [profileData, rolesData, applicationData] = await Promise.all([
        fetchProfile(user.id),
        fetchRoles(user.id),
        fetchProducerApplication(),
      ]);
      setProfile(profileData);
      setRoles(rolesData);
      setProducerApplication(applicationData);
    } catch (error) {
      console.error('Error refreshing profile:', error);
    }
  };

  const getDefaultDashboard = (): string => {
    return resolvePostAuthDestination({
      user,
      roles,
      accountStatus: profile?.account_status,
      application: producerApplication
        ? { status: producerApplication.status, email: producerApplication.email }
        : null,
    });
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
          await loadUserData(initialSession.user.id);
        } else {
          // No session: initialization is complete for an anonymous visitor.
          applySignedOutState();
        }
      } catch (error) {
        console.error('Auth initialization error:', error);
        if (mounted) {
          applySignedOutState();
          setAuthError(AUTH_ERROR_MESSAGE);
        }
      }
    };

    initializeAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        if (!mounted) return;
        // Startup is handled by initializeAuth above.
        if (event === 'INITIAL_SESSION') return;

        setSession(newSession);
        setUser(newSession?.user ?? null);

        if (event === 'SIGNED_OUT' || !newSession?.user) {
          applySignedOutState();
          return;
        }

        const userId = newSession.user.id;
        // IMPORTANT: never await Supabase queries inside this callback.
        // supabase-js holds its auth lock while dispatching auth events, and
        // .from() queries call getSession() internally — awaiting them here
        // deadlocks and leaves the app on a spinner forever.
        setTimeout(() => {
          if (mounted) void loadUserData(userId);
        }, 0);
      }
    );

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const signIn = async (email: string, password: string) => {
    setRolesLoaded(false);
    setAuthError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      // A failed attempt must not leave the app waiting for roles.
      setRolesLoaded(true);
      return { error };
    }

    // onAuthStateChange (SIGNED_IN) loads profile/roles and re-sets rolesLoaded.
    return { error: null };
  };

  const completeInvitePassword = async (password: string) => {
    const { data, error } = await supabase.auth.updateUser({ password });
    if (error) {
      return { error };
    }

    await supabase.auth.refreshSession();
    const uid = data.user?.id ?? user?.id;
    if (uid) {
      await loadUserData(uid);
    }
    return { error: null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    applySignedOutState();
  };

  const isAdmin = roles.includes('admin');
  const isProductor = roles.includes('productor');
  const isAccountActive = profile?.account_status === 'active' || isAdmin;
  const isPendingApplicant =
    !isAdmin &&
    !isProductor &&
    !!producerApplication &&
    ['pending', 'nuevo', 'en_revision', 'aprobado', 'invitado'].includes(producerApplication.status);
  const isRejectedApplicant =
    !isAdmin &&
    !isProductor &&
    (producerApplication?.status === 'rechazado' || profile?.account_status === 'suspended');

  return (
    <AuthContext.Provider value={{
      user,
      session,
      profile,
      roles,
      producerApplication,
      loading,
      rolesLoaded,
      authError,
      isAdmin,
      isProductor,
      isAccountActive,
      isPendingApplicant,
      isRejectedApplicant,
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
