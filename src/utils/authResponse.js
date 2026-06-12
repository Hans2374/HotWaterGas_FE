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
  const accessToken = EXTRACT_TOKEN(data);
  const role = EXTRACT_ROLE(data);
  const user = EXTRACT_USER(data);
  const expiresAt = EXTRACT_EXPIRES_AT(data);

  return { accessToken, role, user, expiresAt };
};

/**
 * Normalizes a refresh response into a consistent internal contract.
 *
 * @param {object} data - raw response data
 * @returns {{ accessToken: string|null, expiresAt: string|null }}
 */
export const normalizeRefreshResponse = (data) => {
  const accessToken = EXTRACT_TOKEN(data);
  const expiresAt = EXTRACT_EXPIRES_AT(data);

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
  return EXTRACT_TOKEN(data);
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
