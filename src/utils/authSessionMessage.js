/**
 * Temporary session message displayed on the login page after an auth failure.
 * Stored in sessionStorage so it survives page refreshes on the login route
 * but is cleared once displayed.
 */
const SESSION_MESSAGE_KEY = 'hotwatergas.auth.sessionMessage';

export const SESSION_MESSAGES = {
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_TOKEN: 'Your session is invalid. Please log in again.',
  AUTH_REQUIRED: null,
  AUTH_FAILED: 'Authentication failed. Please log in again.',
};

export const storeSessionMessage = (code) => {
  const message = SESSION_MESSAGES[code] ?? SESSION_MESSAGES.AUTH_FAILED;
  if (message) {
    try {
      sessionStorage.setItem(SESSION_MESSAGE_KEY, message);
    } catch {
      // sessionStorage unavailable (e.g., private browsing restrictions)
    }
  }
};

export const consumeSessionMessage = () => {
  try {
    const message = sessionStorage.getItem(SESSION_MESSAGE_KEY);
    if (message) {
      sessionStorage.removeItem(SESSION_MESSAGE_KEY);
    }
    return message ?? null;
  } catch {
    return null;
  }
};
