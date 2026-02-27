import { useSessionStore } from "@/stores/useSessionStore";

export type AppRole = "admin" | "manager" | "user" | "viewer";

interface UserRoleResult {
  role: AppRole | null;
  isAdmin: boolean;
  isManager: boolean;
  isUser: boolean;
  isViewer: boolean;
  isAdminOrAbove: boolean;
  isManagerOrAbove: boolean;
  isLoading: boolean;
  error: Error | null;
}

export function useUserRole(): UserRoleResult {
  const role = useSessionStore((s) => s.role);
  const status = useSessionStore((s) => s.status);

  return {
    role,
    isAdmin: role === "admin",
    isManager: role === "manager",
    isUser: role === "user",
    isViewer: role === "viewer",
    isAdminOrAbove: role === "admin",
    isManagerOrAbove: role === "admin" || role === "manager",
    isLoading: status !== "ready",
    error: null,
  };
}
