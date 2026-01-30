import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCallback, useMemo } from "react";

/**
 * Simplified page access hook for single-company internal use
 * 
 * Removed organisation dependency - permission checks now only depend on user role
 */

// Permission cache utilities
const PERMISSION_CACHE_KEY = 'page-permissions-cache';
const PERMISSION_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

interface PermissionCache {
  userId: string;
  permissions: Record<string, boolean>;
  timestamp: number;
}

function getPermissionCache(userId: string): Record<string, boolean> | null {
  try {
    const cached = localStorage.getItem(PERMISSION_CACHE_KEY);
    if (!cached) return null;
    
    const data: PermissionCache = JSON.parse(cached);
    
    // Check if cache is for current user and not expired
    if (data.userId === userId && Date.now() - data.timestamp < PERMISSION_CACHE_TTL) {
      return data.permissions;
    }
    
    // Cache expired or wrong user
    return null;
  } catch {
    return null;
  }
}

function setPermissionCache(userId: string, permissions: Record<string, boolean>) {
  try {
    const data: PermissionCache = {
      userId,
      permissions,
      timestamp: Date.now(),
    };
    localStorage.setItem(PERMISSION_CACHE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors
  }
}

function updatePermissionCache(userId: string, route: string, hasAccess: boolean) {
  try {
    const existing = getPermissionCache(userId);
    const permissions = existing || {};
    permissions[route] = hasAccess;
    setPermissionCache(userId, permissions);
  } catch {
    // Ignore storage errors
  }
}

export function usePageAccess(route: string) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get cached permission for instant initial value
  const cachedPermission = useMemo(() => {
    if (!user?.id) return undefined;
    const cache = getPermissionCache(user.id);
    return cache?.[route];
  }, [user?.id, route]);

  const { data: hasAccess, isLoading, error } = useQuery({
    queryKey: ["page-access", route, user?.id],
    queryFn: async () => {
      if (!user?.id) return false;
      
      const { data, error } = await supabase.rpc("check_page_access", { 
        _route: route 
      });
      
      if (error) {
        console.error("Error checking page access:", error);
        return cachedPermission ?? false; // Return cached on error
      }
      
      const result = data as boolean;
      
      // Update cache with new result
      updatePermissionCache(user.id, route, result);
      
      return result;
    },
    enabled: !!user?.id,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    initialData: cachedPermission, // Use cache for instant render
    refetchOnMount: cachedPermission !== undefined ? false : true, // Don't refetch if cached
  });

  const invalidateAccess = useCallback(() => {
    // Clear localStorage cache
    try {
      localStorage.removeItem(PERMISSION_CACHE_KEY);
    } catch { /* ignore */ }
    queryClient.invalidateQueries({ queryKey: ["page-access"] });
  }, [queryClient]);

  return { 
    // Return cached value immediately if available, else query result
    // Don't default to false - let undefined indicate "still loading"
    hasAccess: hasAccess ?? cachedPermission, 
    // Show loading if query is running OR if we have no data yet
    isLoading: isLoading || (hasAccess === undefined && cachedPermission === undefined),
    error: error as Error | null,
    invalidateAccess,
  };
}

// Hook to check multiple routes at once - uses batch RPC for efficiency
export function useMultiplePageAccess(routes: string[]) {
  const { user } = useAuth();

  // Get cached permissions for instant initial values
  const cachedPermissions = useMemo(() => {
    if (!user?.id || routes.length === 0) return {};
    const cache = getPermissionCache(user.id);
    if (!cache) return {};
    
    // Return only cached routes
    const result: Record<string, boolean> = {};
    routes.forEach(route => {
      if (route in cache) {
        result[route] = cache[route];
      }
    });
    return result;
  }, [user?.id, routes]);

  // Check if all routes are cached
  const allCached = useMemo(() => {
    return routes.every(route => route in cachedPermissions);
  }, [routes, cachedPermissions]);

  const results = useQuery({
    queryKey: ["page-access-multiple", routes.join(","), user?.id],
    queryFn: async () => {
      if (!user?.id || routes.length === 0) return {};
      
      // Use batch RPC function for single database call
      const { data, error } = await supabase.rpc("check_multiple_routes_access", { 
        _routes: routes 
      });
      
      if (error) {
        console.error("Error checking multiple page access:", error);
        // Fallback to cached data if available, else deny all
        if (Object.keys(cachedPermissions).length > 0) {
          return cachedPermissions;
        }
        return routes.reduce((acc, route) => ({ ...acc, [route]: false }), {} as Record<string, boolean>);
      }
      
      // Convert array result to map
      const accessMap: Record<string, boolean> = {};
      if (Array.isArray(data)) {
        data.forEach((item: { route: string; has_access: boolean }) => {
          accessMap[item.route] = item.has_access;
        });
      }
      
      // Update cache with all results
      if (user?.id) {
        const existingCache = getPermissionCache(user.id) || {};
        setPermissionCache(user.id, { ...existingCache, ...accessMap });
      }
      
      return accessMap;
    },
    enabled: !!user?.id && routes.length > 0,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes cache retention
    initialData: allCached ? cachedPermissions : undefined, // Use full cache if available
    refetchOnMount: allCached ? false : true, // Skip refetch if all cached
  });

  return {
    // Merge cached with fetched data (fetched takes priority)
    accessMap: { ...cachedPermissions, ...(results.data ?? {}) },
    // Only show loading if no cache available
    isLoading: Object.keys(cachedPermissions).length === 0 && results.isLoading,
  };
}
