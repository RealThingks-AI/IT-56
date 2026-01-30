import React, { createContext, useContext, ReactNode } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';

/**
 * Simplified OrganisationContext for single-company internal IT Hub
 * 
 * This is now a thin wrapper around useCurrentUser for backwards compatibility.
 * The organisation data comes from the user's org in the database.
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
const DEFAULT_ACTIVE_TOOLS = ['helpdesk', 'assets', 'subscriptions', 'updates', 'monitoring', 'reports', 'audit'];

const OrganisationContext = createContext<OrganisationContextType | undefined>(undefined);

export const OrganisationProvider = ({ children }: { children: ReactNode }) => {
  const { data: currentUser, isLoading, error, refetch } = useCurrentUser();

  // Build organisation from user data (already fetched via useCurrentUser)
  const organisation: Organisation = {
    id: currentUser?.organisationId || null,
    name: currentUser?.organisation?.name || DEFAULT_ORG_NAME,
    logo_url: currentUser?.organisation?.logo_url || undefined,
    active_tools: currentUser?.organisation?.active_tools || DEFAULT_ACTIVE_TOOLS,
    plan: currentUser?.organisation?.plan || 'enterprise',
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
