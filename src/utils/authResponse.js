/**
 * Centralized auth response normalization.
 *
 * Single source of truth for parsing all auth-related API responses.
 * All code that reads login/refresh response fields must go through these functions.
 *
 * ── Backend contract (login) ───────────────────────────────────────────
 * {
 *   accessToken: string,
 *   role:        string,
 *   user:        { id, email, role },
 *   accessTokenExpiresAt: string (ISO 8601)
 * }
 *
 * ── Backend contract (refresh) ─────────────────────────────────────────
 * {
 *   accessToken: string,
 *   accessTokenExpiresAt: string (ISO 8601)
 * }
 */

const isDev = import.meta.env.DEV;

/* ── Dev diagnostics ─────────────────────────────────────────────────────── */

const devLog = (message, data) => {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.debug(`[Auth] ${message}`, data);
  }
};

/* ── Core extraction ───────────────────────────────────────────────────── */

const EXTRACT_TOKEN = (data) => {
  if (!data) return null;
  if (typeof data === 'string') return data;
  return data?.accessToken ?? null;
};

const EXTRACT_ROLE = (data) => {
  if (!data) return '';
  return (
    data?.role ||
    data?.Role ||
    data?.user?.role ||
    ''
  );
};

const EXTRACT_USER = (data) => {
  if (!data) return null;
  if (data?.user) return data.user;
  return null;
};

const EXTRACT_EXPIRES_AT = (data) => {
  if (!data) return null;
  return data?.accessTokenExpiresAt ?? null;
};

/* ── Public API ─────────────────────────────────────────────────────────── */

/**
 * Normalizes a login response into a consistent internal contract.
 *
 * @param {object|string} data - raw response data (camelCase already, from axios interceptor)
 * @returns {{ accessToken: string|null, role: string, user: object|null, expiresAt: string|null }}
 */
export const normalizeLoginResponse = (data) => {
  devLog('Login response keys:', data ? Object.keys(data) : null);
  devLog('accessToken present:', !!(data?.accessToken));

  const accessToken = EXTRACT_TOKEN(data);
  const role = EXTRACT_ROLE(data);
  const user = EXTRACT_USER(data);
  const expiresAt = EXTRACT_EXPIRES_AT(data);

  devLog('Normalized login:', {
    accessTokenPresent: !!accessToken,
    role,
    userEmail: user?.email,
    expiresAt
  });

  return { accessToken, role, user, expiresAt };
};

/**
 * Normalizes a refresh response into a consistent internal contract.
 *
 * @param {object} data - raw response data
 * @returns {{ accessToken: string|null, expiresAt: string|null }}
 */
export const normalizeRefreshResponse = (data) => {
  devLog('Refresh response keys:', data ? Object.keys(data) : null);
  devLog('Refresh accessToken present:', !!(data?.accessToken));

  const accessToken = EXTRACT_TOKEN(data);
  const expiresAt = EXTRACT_EXPIRES_AT(data);

  devLog('Normalized refresh:', {
    accessTokenPresent: !!accessToken,
    expiresAt
  });

  return { accessToken, expiresAt };
};

/**
 * Extracts the raw accessToken string from any auth response (login or refresh).
 * Convenience wrapper for callers that only need the token.
 *
 * @param {object} data - raw response data
 * @returns {string|null}
 */
export const extractAccessToken = (data) => {
  const token = EXTRACT_TOKEN(data);
  devLog('extractAccessToken — present:', !!token);
  return token;
};

/**
 * Extracts the role string from any auth response.
 *
 * @param {object} data - raw response data
 * @returns {string}
 */
export const extractRole = (data) => EXTRACT_ROLE(data);

/**
 * Extracts the user object from a login response.
 *
 * @param {object} data - raw response data
 * @returns {object|null}
 */
export const extractUser = (data) => EXTRACT_USER(data);
