import { createContext, useContext, useEffect, useState, useRef } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useSessionStore } from "@/stores/useSessionStore";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  authError: string | null;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Reduced timeout for faster perceived performance
const AUTH_INIT_TIMEOUT_MS = 2000;

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  
  // Track if we've already initialized to prevent race conditions
  const initializedRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Prevent double initialization
    if (initializedRef.current) return;
    initializedRef.current = true;

    // Clear timeout helper
    const clearTimeoutIfSet = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };

    // Set up timeout fallback (will be cleared on success)
    timeoutRef.current = setTimeout(() => {
      if (loading) {
        console.warn('Auth initialization timed out');
        setLoading(false);
        setAuthError('Authentication initialization timed out');
      }
    }, AUTH_INIT_TIMEOUT_MS);

    // Get initial session FIRST, then set up listener
    supabase.auth.getSession()
      .then(({ data: { session: initialSession }, error }) => {
        // Clear timeout immediately - we got a response
        clearTimeoutIfSet();
        
        if (error) {
          console.error('Failed to get session:', error);
          setAuthError(error.message);
        }
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        setLoading(false);
      })
      .catch((err) => {
        clearTimeoutIfSet();
        console.error('Auth initialization error:', err);
        setAuthError(err.message || 'Failed to initialize authentication');
        setLoading(false);
      });

    // Set up auth state listener for FUTURE changes only
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, newSession) => {
        console.log('Auth state change:', event);
        
        // Only update state for actual changes, not initial session
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
          setSession(newSession);
          setUser(newSession?.user ?? null);
          setAuthError(null);
        } else if (event === 'SIGNED_OUT') {
          setSession(null);
          setUser(null);
        }
        // Ignore INITIAL_SESSION - we handle it via getSession()
      }
    );

    return () => {
      clearTimeoutIfSet();
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    try {
      // Clear session store on sign-out
      useSessionStore.getState().clear();
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error("Error signing out:", error);
      Object.keys(localStorage).forEach(key => {
        if (key.startsWith('sb-') || key.includes('supabase')) {
          localStorage.removeItem(key);
        }
      });
      setUser(null);
      setSession(null);
    } finally {
      navigate("/login");
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, authError, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
