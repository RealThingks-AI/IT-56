// DEPRECATED: Use useUserRole instead for proper role checking via database
// This hook reads from user_metadata which is unreliable and can be manipulated
// Keeping for backward compatibility but will be removed in future versions

import { useUserRole, AppRole } from './useUserRole';

/**
 * @deprecated Use useUserRole instead. This hook is kept for backward compatibility.
 */
export const useRole = () => {
  const { role, isAdmin, isManager, isManagerOrAbove, isLoading } = useUserRole();
  
  return {
    role: role || 'user' as AppRole,
    accountType: 'personal', // Kept for compatibility
    isAdmin,
    isManager,
    isManagerOrAbove,
    isUser: role === 'user',
    isLoading,
  };
};
