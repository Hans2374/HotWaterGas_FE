/**
 * Centralized axios client.
 *
 * Responsibilities:
 *   - Attach Authorization header on every request
 *   - Convert PascalCase response keys to camelCase
 *   - Detect 401 responses and trigger silent token refresh
 *   - Retry the original request once after a successful refresh
 *   - Coordinate refresh across concurrent 401s via the single-refresh queue
 *
 * The refresh token itself is never read by this file — it lives in an HttpOnly
 * cookie managed entirely by the backend.
 */

import axios from 'axios';
import {
  getAccessToken
} from '../utils/tokenManager';
import { executeWithRefreshLock } from '../utils/refreshQueue';
import { dispatchTokenUpdated } from '../utils/authEventBridge';
import { normalizeRefreshResponse } from '../utils/authResponse';

/* ── Axios instances ─────────────────────────────────────────────────────── */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5140';

/**
 * Main client — used by all API service files.
 * Has request/response interceptors including the silent-refresh logic.
 */
const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

/**
 * Bare axios instance for the refresh call only.
 * Does NOT use axiosClient's interceptors (avoids potential loops).
 */
const refreshAxios = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' }
});

/* ── Refresh token flow ──────────────────────────────────────────────────── */

/**
 * Calls POST /api/auth/refresh.
 * The backend validates the HttpOnly refresh cookie and returns a new access token.
 * On success, the new token is stored via tokenManager.
 *
 * @returns {Promise<{ accessToken: string }>} resolved with new token on success
 * @throws {Error} on network failure or non-2xx response
 */
const refreshAccessToken = async () => {
  const response = await refreshAxios.post('/api/auth/refresh');
  const { accessToken } = normalizeRefreshResponse(response.data);

  if (!accessToken) {
    throw new Error('Refresh response missing access token');
  }

  if (import.meta.env.DEV) {
    // eslint-disable-next-line no-console
    console.debug('[Auth.Refresh] Refresh succeeded, token stored at:', new Date().toISOString());
  }

  dispatchTokenUpdated();
  return { accessToken };
};

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/** True when this specific error already carries the retry sentinel. */
const isRetriedRequest = (error) =>
  error?.config?._retry === true;

/** True when the response is a 401. */
const isUnauthorizedResponse = (error) =>
  error?.response?.status === 401;

/** Strips internal _retry / _refreshQueue sentinel keys from a cloned config. */
const cloneConfigForRetry = (config) => {
  const clone = { ...config };
  delete clone._retry;
  delete clone._refreshQueue;
  return clone;
};

/** Convert PascalCase object keys to camelCase recursively. */
const toCamelCase = (obj) => {
  if (obj === null || obj === undefined || typeof obj !== 'object') {
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(toCamelCase);
  }
  return Object.keys(obj).reduce((acc, key) => {
    const camelKey = key.charAt(0).toLowerCase() + key.slice(1);
    acc[camelKey] = toCamelCase(obj[key]);
    return acc;
  }, {});
};

/* ── Request interceptor ─────────────────────────────────────────────────── */

axiosClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    if (import.meta.env.DEV) {
      // eslint-disable-next-line no-console
      console.debug('[Auth] Request interceptor — Authorization header attached:', {
        hasToken: !!token,
        method: config.method?.toUpperCase(),
        url: config.url
      });
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/* ── Response interceptor ─────────────────────────────────────────────────── */

axiosClient.interceptors.response.use(
  (response) => {
    if (response.data) {
      response.data = toCamelCase(response.data);
    }
    return response;
  },
  async (error) => {
    const originalConfig = error?.config;

    if (!originalConfig) {
      return Promise.reject(error);
    }

    if (!isUnauthorizedResponse(error)) {
      return Promise.reject(error);
    }

    // ── Second 401 (already retried once) ──────────────────────────────
    // This means the refresh itself failed or the new token was also rejected.
    // Hand off to the auth context via event bridge, then redirect.
    if (isRetriedRequest(error)) {
      window.dispatchEvent(
        new CustomEvent('hotwatergas:auth:expired', {
          detail: { reason: 'REFRESH_REJECTED' }
        })
      );
      return Promise.reject(error);
    }

    // ── First 401 — attempt silent refresh ─────────────────────────────
    originalConfig._retry = true;

    try {
      await executeWithRefreshLock(refreshAccessToken);

      // Refresh succeeded. Retry the original request with the updated token.
      const clonedConfig = cloneConfigForRetry(originalConfig);
      const retryToken = getAccessToken();
      if (retryToken) {
        clonedConfig.headers.Authorization = `Bearer ${retryToken}`;
      }
      return axiosClient(clonedConfig);
    } catch (refreshError) {
      // eslint-disable-next-line no-console
      console.debug('[Auth.Refresh] Refresh failed:', refreshError?.message || 'Unknown error');
      // Refresh failed. Dispatch event so AuthContext can log out.
      window.dispatchEvent(
        new CustomEvent('hotwatergas:auth:expired', {
          detail: { reason: 'REFRESH_FAILED' }
        })
      );
      return Promise.reject(refreshError);
    }
  }
);

export default axiosClient;
