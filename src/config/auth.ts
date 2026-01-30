// Centralized auth configuration for redirect URLs
export const AUTH_CONFIG = {
  // Primary production domain
  productionUrl: 'https://it.realthingks.com',
  
  // Auth-related paths
  resetPasswordPath: '/reset-password-confirm',
  
  /**
   * Returns the production URL for email redirects.
   * Always uses production to ensure emails work regardless of where triggered.
   */
  getRedirectUrl: (): string => {
    return 'https://it.realthingks.com';
  },
  
  /**
   * Gets the full redirect URL for password reset
   */
  getPasswordResetRedirectUrl: (): string => {
    return 'https://it.realthingks.com/reset-password-confirm';
  },
  
  /**
   * Gets the redirect URL for email confirmation after signup
   */
  getSignupRedirectUrl: (): string => {
    return 'https://it.realthingks.com';
  }
};
