/**
 * Centralized token management.
 *
 * All token read/write must go through these functions.
 * The access token lives in localStorage.
 * The refresh token is never accessible to the frontend (HttpOnly cookie, backend-only).
 */

const TOKEN_KEY = 'token';

/* ── JWT claim name constants (matches backend issuer) ─────────────────────── */
const ROLE_CLAIM = 'http://schemas.microsoft.com/ws/2008/06/identity/claims/role';
const USER_ID_CLAIM = 'UserId';
const EMAIL_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress';
const NAME_CLAIM = 'http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name';
const EXP_CLAIM = 'exp';

/* ── JWT decoding ──────────────────────────────────────────────────────────── */
const decodeBase64Url = (value) => {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return atob(padded);
};

const parsePayload = (token) => {
  try {
    const payloadPart = token.split('.')[1];
    if (!payloadPart) return null;
    return JSON.parse(decodeBase64Url(payloadPart));
  } catch {
    return null;
  }
};

/* ── Public: token CRUD ────────────────────────────────────────────────────── */

export const getAccessToken = () => localStorage.getItem(TOKEN_KEY);

export const setAccessToken = (token) => {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
};

export const clearAccessToken = () => localStorage.removeItem(TOKEN_KEY);

/* ── Public: token expiry ─────────────────────────────────────────────────── */

/**
 * Returns the numeric `exp` claim from the current token, or null if not present / unparseable.
 */
export const getTokenExpiry = (token) => {
  const payload = parsePayload(token || getAccessToken());
  if (!payload) return null;
  const exp = payload[EXP_CLAIM] || payload.exp;
  return typeof exp === 'number' ? exp : null;
};

/**
 * Returns true when the current token has already expired.
 */
export const isTokenExpired = (token) => {
  const exp = getTokenExpiry(token);
  if (exp === null) return true;
  return Date.now() >= exp * 1000;
};

/**
 * Returns the number of seconds until the current token expires.
 * Returns a negative value if already expired.
 */
export const getSecondsUntilExpiry = (token) => {
  const exp = getTokenExpiry(token);
  if (exp === null) return 0;
  return exp - Math.floor(Date.now() / 1000);
};

/**
 * Returns true when the current token is within the proactive-refresh window.
 * Callers should refresh before this returns true to avoid a 401.
 */
export const shouldRefreshToken = (token, refreshThresholdSeconds = 120) => {
  const remaining = getSecondsUntilExpiry(token);
  return remaining <= refreshThresholdSeconds;
};

/* ── Public: JWT payload decoding ────────────────────────────────────────── */

/**
 * Returns the decoded JWT payload as a plain object, or an empty object on failure.
 */
export const decodeToken = (token) => {
  const payload = parsePayload(token);
  if (!payload) return {};
  return {
    role: payload[ROLE_CLAIM] || payload.role || payload.Role || '',
    userId: payload[USER_ID_CLAIM] || payload.userId || payload.sub || '',
    username:
      payload[NAME_CLAIM] ||
      payload.name ||
      payload.Name ||
      (payload[EMAIL_CLAIM] || payload.email || payload.Email
        ? (payload[EMAIL_CLAIM] || payload.email || payload.Email).split('@')[0]
        : ''),
    email: payload[EMAIL_CLAIM] || payload.email || payload.Email || ''
  };
};
