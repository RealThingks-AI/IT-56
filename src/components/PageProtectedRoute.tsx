import { Navigate } from "react-router-dom";
import { usePageAccess } from "@/hooks/usePageAccess";
import { Loader2 } from "lucide-react";

interface PageProtectedRouteProps {
  children: React.ReactNode;
  route: string;
}

/**
 * Simplified PageProtectedRoute for single-company internal use
 * 
 * No longer depends on OrganisationContext loading state
 */
export function PageProtectedRoute({ children, route }: PageProtectedRouteProps) {
  const { hasAccess, isLoading } = usePageAccess(route);

  // Wait for permissions to load
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Only redirect if explicitly denied (not undefined/loading)
  if (hasAccess === false) {
    return <Navigate to="/access-denied" replace />;
  }

  return <>{children}</>;
}
