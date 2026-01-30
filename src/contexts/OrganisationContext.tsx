import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';

/**
 * Simplified OrganisationContext for single-company internal IT Hub
 * 
 * This replaces the previous dynamic multi-tenant architecture.
 * The org_id is still fetched from database for insert operations,
 * but we don't wait for it to load before rendering the app.
 */

interface Organisation {
  id: string | null;
  name: string;
  slug?: string;
  logo_url?: string;
  active_tools: string[];
  plan: string;
}

interface OrganisationContextType {
  organisation: Organisation;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// Default values for single-company internal use
const DEFAULT_ORG_NAME = 'RT-IT-Hub';
const DEFAULT_ACTIVE_TOOLS = ['helpdesk', 'assets', 'subscriptions', 'updates', 'monitoring'];

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export const OrganisationProvider = ({ children }: { children: ReactNode }) => {
  const { user, loading: authLoading } = useAuth();

  // Fetch the actual org_id from database (needed for inserts)
  // But we don't block rendering on this
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['user-organisation', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;

      const { data, error } = await supabase
        .from('users')
        .select('organisation_id')
        .eq('auth_user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error fetching organisation:', error);
        return null;
      }

      return data?.organisation_id || null;
    },
    enabled: !!user?.id && !authLoading,
    staleTime: 30 * 60 * 1000, // 30 minutes - org rarely changes
    gcTime: 60 * 60 * 1000,   // 1 hour cache retention
  });

  const organisation: Organisation = {
    id: data || null,
    name: DEFAULT_ORG_NAME,
    active_tools: DEFAULT_ACTIVE_TOOLS,
    plan: 'enterprise',
  };

  const handleRefetch = async () => {
    await refetch();
  };

  return (
    <OrganisationContext.Provider value={{ 
      organisation, 
      // Never block on loading - app should work even while fetching org
      loading: false,
      error: error as Error | null, 
      refetch: handleRefetch 
    }}>
      {children}
    </OrganisationContext.Provider>
  );
};

export const useOrganisation = () => {
  const context = useContext(OrganisationContext);
  if (context === undefined) {
    throw new Error('useOrganisation must be used within an OrganisationProvider');
  }
  return context;
};
