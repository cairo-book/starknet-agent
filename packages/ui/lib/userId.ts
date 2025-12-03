/**
 * User ID utility for persistent, anonymous user identification.
 *
 * Generates a UUID on first visit and stores it in localStorage.
 */

const USER_ID_KEY = 'cairo_coder_user_id';

/**
 * Get or create a persistent user ID.
 * Returns the existing ID from localStorage or generates a new UUID.
 */
export const getUserId = (): string => {
  if (typeof window === 'undefined') {
    // Server-side rendering - return empty string
    return '';
  }

  let userId = localStorage.getItem(USER_ID_KEY);

  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem(USER_ID_KEY, userId);
  }

  return userId;
};

/**
 * Clear the stored user ID
 */
export const clearUserId = (): void => {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(USER_ID_KEY);
};
