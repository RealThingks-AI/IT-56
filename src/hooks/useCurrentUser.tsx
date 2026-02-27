import { useAuth } from "@/contexts/AuthContext";
import { useSessionStore } from "@/stores/useSessionStore";

export interface CurrentUser {
  id: string;
  authUserId: string;
  email: string;
  name: string | null;
  role: string | null;
}

/**
 * Simplified user data hook — reads from auth context + session store.
 * Zero database calls.
 */
export function useCurrentUser() {
  const { user } = useAuth();
  const storeName = useSessionStore((s) => s.name);
  const storeEmail = useSessionStore((s) => s.email);
  const storeRole = useSessionStore((s) => s.role);
  const status = useSessionStore((s) => s.status);

  const data: CurrentUser | null = user ? {
    id: user.id,
    authUserId: user.id,
    email: storeEmail || user.email || '',
    name: storeName || user.user_metadata?.name || user.email?.split('@')[0] || null,
    role: storeRole,
  } : null;

  return {
    data,
    isLoading: status !== "ready",
    error: null,
  };
}
