import { create } from "zustand";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/hooks/useUserRole";

const CACHE_KEY = "session-store-cache";
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

interface CachedSession {
  role: AppRole;
  name: string | null;
  email: string | null;
  userId: string;
  uiSettings: Record<string, any> | null;
  timestamp: number;
}

interface SessionState {
  role: AppRole | null;
  name: string | null;
  email: string | null;
  uiSettings: Record<string, any> | null;
  status: "idle" | "loading" | "ready";
  retries: number;
  bootstrap: () => Promise<void>;
  clear: () => void;
}

const MAX_RETRIES = 3;

// Hydrate from localStorage on module load for instant render
function hydrateFromCache(): Partial<SessionState> {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return {};
    const cached: CachedSession = JSON.parse(raw);
    if (Date.now() - cached.timestamp > CACHE_TTL) {
      localStorage.removeItem(CACHE_KEY);
      return {};
    }
    // Verify the cached user matches current auth
    const authStorage = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (authStorage) {
      try {
        const authData = JSON.parse(localStorage.getItem(authStorage) || '{}');
        const currentUserId = authData?.user?.id;
        if (currentUserId && currentUserId !== cached.userId) {
          localStorage.removeItem(CACHE_KEY);
          return {};
        }
      } catch { /* ignore */ }
    }
    return {
      role: cached.role,
      name: cached.name,
      email: cached.email,
      uiSettings: cached.uiSettings,
      status: "ready" as const,
    };
  } catch {
    return {};
  }
}

const hydrated = hydrateFromCache();

export const useSessionStore = create<SessionState>((set, get) => ({
  role: hydrated.role ?? null,
  name: hydrated.name ?? null,
  email: hydrated.email ?? null,
  uiSettings: hydrated.uiSettings ?? null,
  status: hydrated.status ?? "idle",
  retries: 0,

  bootstrap: async () => {
    const current = get();
    if (current.status === "loading" || current.status === "ready") return;
    if (current.retries >= MAX_RETRIES) return;

    set({ status: "loading" });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn("Bootstrap: no access token yet, staying idle for retry");
        set({ status: "idle", retries: current.retries + 1 });
        return;
      }

      const { data, error } = await supabase.rpc("bootstrap_session");

      if (error) {
        console.error("Bootstrap session error:", error);
        set({ status: "idle", retries: current.retries + 1 });
        return;
      }

      const result = data as { role: string | null; permissions: Record<string, boolean>; name: string | null; email: string | null; ui_settings: Record<string, any> | null } | null;

      if (result && result.role) {
        set({
          role: (result.role as AppRole),
          name: result.name || null,
          email: result.email || null,
          uiSettings: result.ui_settings || null,
          status: "ready",
          retries: 0,
        });

        // Cache to localStorage for instant render on refresh
        try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
            role: result.role,
            name: result.name,
            email: result.email,
            uiSettings: result.ui_settings,
            userId: session.user.id,
            timestamp: Date.now(),
          }));
        } catch { /* ignore */ }
      } else {
        console.warn("Bootstrap: role is null, will retry");
        set({ status: "idle", retries: current.retries + 1 });
      }
    } catch (err) {
      console.error("Bootstrap failed:", err);
      set({ status: "idle", retries: current.retries + 1 });
    }
  },

  clear: () => {
    set({ role: null, name: null, email: null, uiSettings: null, status: "idle", retries: 0 });
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch { /* ignore */ }
  },
}));
