/**
 * Auth failure event bridge.
 *
 * Allows the axios error interceptor (non-React code) to signal auth failures
 * to the AuthContext without creating a hard dependency between the two layers.
 *
 * Flow:
 *   axios interceptor  →  dispatchCustomEvent('auth:expired')  →  window
 *   AuthContext         →  window.addEventListener('auth:expired')  →  triggers logout + redirect
 */
const AUTH_EXPIRED_EVENT = 'hotwatergas:auth:expired';
const AUTH_TOKEN_UPDATED_EVENT = 'hotwatergas:auth:tokenUpdated';

export const dispatchAuthExpired = (reason) => {
  window.dispatchEvent(
    new CustomEvent(AUTH_EXPIRED_EVENT, {
      detail: { reason }
    })
  );
};

export const dispatchTokenUpdated = () => {
  window.dispatchEvent(
    new CustomEvent(AUTH_TOKEN_UPDATED_EVENT)
  );
};

export const AUTH_EXPIRED_LISTENER = AUTH_EXPIRED_EVENT;
export const AUTH_TOKEN_UPDATED_LISTENER = AUTH_TOKEN_UPDATED_EVENT;
