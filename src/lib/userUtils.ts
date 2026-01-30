/**
 * Utility functions for displaying user information consistently across the app.
 * Handles cases where the database name field might contain an email address.
 */

export type AppRole = "admin" | "manager" | "user" | "viewer";

export type UserLike = {
  name?: string | null;
  email?: string | null;
} | null | undefined;

/**
 * Map old/legacy roles to standardized app roles.
 * Use this to normalize roles from the database.
 */
export const normalizeRole = (role: string | null | undefined): AppRole => {
  switch (role) {
    case "owner":
    case "admin":
      return "admin";
    case "manager":
      return "manager";
    case "staff":
    case "user":
      return "user";
    case "viewer":
      return "viewer";
    default:
      return "user";
  }
};

/**
 * Get a display-friendly name for a user.
 * - If name exists and is NOT an email format, return the name
 * - If name is an email or missing, extract username from email (before @)
 * - Returns null if no user data available
 */
export const getUserDisplayName = (user: UserLike): string | null => {
  if (!user) return null;
  
  // Check if name exists and is NOT an email format
  if (user.name && !user.name.includes('@')) {
    return user.name;
  }
  
  // If name is an email or missing, extract username from email and format nicely
  if (user.email) {
    const username = user.email.split('@')[0];
    // Replace dots/underscores/hyphens with spaces and title case each word
    return username
      .replace(/[._-]/g, ' ')
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  return null;
};

/**
 * Get initials for a user avatar.
 * Uses the display name to generate 1-2 character initials.
 */
export const getUserInitials = (user: UserLike): string => {
  const displayName = getUserDisplayName(user);
  if (!displayName) return '?';
  
  // Split by space and get first letter of each word
  const parts = displayName.split(/[\s._-]+/).filter(Boolean);
  
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  
  // For single word names, take first 2 chars or just first
  return displayName.slice(0, 2).toUpperCase();
};
