import React, {
  createContext,
  useState,
  useEffect,
  useCallback,
  useRef
} from 'react';
import { logout as logoutApi } from '../api/authApi';
import axiosClient from '../api/axiosClient';
import {
  getAccessToken,
  setAccessToken,
  clearAccessToken,
  decodeToken,
  getSecondsUntilExpiry,
  isTokenExpired
} from '../utils/tokenManager';
import { clearRefreshQueue } from '../utils/refreshQueue';
import {
  subscribeToAuthEvent,
  broadcastLogout,
  broadcastTokenUpdated
} from '../utils/multiTabSync';
import { normalizeRefreshResponse } from '../utils/authResponse';
import {
  AUTH_EXPIRED_LISTENER,
  AUTH_TOKEN_UPDATED_LISTENER
} from '../utils/authEventBridge';

export const AuthContext = createContext();

/**
 * Window in seconds before expiry when proactive refresh kicks in.
 * Refreshing 2 minutes early gives a comfortable safety margin.
 */
const REFRESH_THRESHOLD_SECONDS = 120;

/* ── Derived state helpers ─────────────────────────────────────────────────── */

const deriveStateFromToken = (token) => {
  const parsed = decodeToken(token);
  return {
    role: parsed.role || '',
    userId: parsed.userId || '',
    username: parsed.username || '',
    email: parsed.email || '',
    displayName: parsed.displayName || ''
  };
};

/* ── Provider ─────────────────────────────────────────────────────────────── */

export const AuthProvider = ({ children }) => {
  const [token, setTokenState] = useState(null);
  const [role, setRole] = useState('');
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  /**
   * True during the initial session-restoration handshake on app mount.
   * Protected routes use this to avoid premature redirects on browser-refresh.
   */
  const [isInitializing, setIsInitializing] = useState(true);
  /**
   * Tracks whether the AuthContext itself is performing a silent refresh.
   * Used to suppress redundant proactive timers during that window.
   */
  const isRefreshingRef = useRef(false);
  const proactiveTimerRef = useRef(null);

  /* ── Proactive refresh scheduler ───────────────────────────────────────── */

  const cancelProactiveRefresh = useCallback(() => {
    if (proactiveTimerRef.current) {
      clearTimeout(proactiveTimerRef.current);
      proactiveTimerRef.current = null;
    }
  }, []);

  const scheduleProactiveRefresh = useCallback(() => {
    cancelProactiveRefresh();

    const currentToken = getAccessToken();
    if (!currentToken) return;

    if (isTokenExpired(currentToken)) return;

    const secondsRemaining = getSecondsUntilExpiry(currentToken);
    const refreshIn = secondsRemaining - REFRESH_THRESHOLD_SECONDS;

    // Token already within the refresh window
    if (refreshIn <= 0) return;

    proactiveTimerRef.current = setTimeout(() => {
      if (!getAccessToken() || isRefreshingRef.current) return;
      isRefreshingRef.current = true;

      axiosClient
        .post('/api/auth/refresh')
        .then((response) => {
          const { accessToken } = normalizeRefreshResponse(response.data);
          if (accessToken) {
            setAccessToken(accessToken);
            setTokenState(accessToken);
            broadcastTokenUpdated();
          }
        })
        .catch(() => {
          // Proactive refresh failure is logged silently; the next
          // API request will trigger the reactive 401 flow.
        })
        .finally(() => {
          isRefreshingRef.current = false;
          scheduleProactiveRefresh();
        });
    }, refreshIn * 1000);
  }, [cancelProactiveRefresh]);

  /* ── Session restoration on mount ──────────────────────────────────────── */

  useEffect(() => {
    const storedToken = getAccessToken();

    if (!storedToken) {
      setIsInitializing(false);
      return;
    }

    if (!isTokenExpired(storedToken)) {
      // Token is still valid — restore session immediately.
      const derived = deriveStateFromToken(storedToken);
      setTokenState(storedToken);
      setRole(derived.role);
      setUserId(derived.userId);
      setUsername(derived.username);
      setEmail(derived.email);
      setDisplayName(derived.displayName);
      setIsInitializing(false);
      scheduleProactiveRefresh();
      return;
    }

    // Token has expired — attempt silent refresh to restore the session.
    axiosClient
      .post('/api/auth/refresh')
      .then((response) => {
        const { accessToken } = normalizeRefreshResponse(response.data);
        if (accessToken) {
          setAccessToken(accessToken);
          const derived = decodeToken(accessToken);
          setTokenState(accessToken);
          setRole(derived.role);
          setUserId(derived.userId);
          setUsername(derived.username);
          setEmail(derived.email);
          setDisplayName(derived.displayName);
        }
      })
      .catch(() => {
        // Silent refresh failed — clear the expired token.
        clearAccessToken();
        setTokenState(null);
      })
      .finally(() => {
        setIsInitializing(false);
        scheduleProactiveRefresh();
      });
  }, [scheduleProactiveRefresh]);

  /* ── Cross-tab sync listeners ───────────────────────────────────────────── */

  useEffect(() => {
    const unsubLogout = subscribeToAuthEvent('logout', () => {
      cancelProactiveRefresh();
      clearRefreshQueue();
      clearAccessToken();
      setTokenState(null);
      setRole('');
      setUserId('');
      setUsername('');
      setEmail('');
      setDisplayName('');
    });

    const unsubTokenUpdated = subscribeToAuthEvent('tokenUpdated', () => {
      const currentToken = getAccessToken();
      if (!currentToken) return;
      const derived = deriveStateFromToken(currentToken);
      setTokenState(currentToken);
      setRole(derived.role);
      setUserId(derived.userId);
      setUsername(derived.username);
      setEmail(derived.email);
      setDisplayName(derived.displayName);
      scheduleProactiveRefresh();
    });

    const handleExpired = () => {
      cancelProactiveRefresh();
      clearRefreshQueue();
      clearAccessToken();
      setTokenState(null);
      setRole('');
      setUserId('');
      setUsername('');
      setEmail('');
      setDisplayName('');
    };

    window.addEventListener(AUTH_EXPIRED_LISTENER, handleExpired);

    const handleInterceptorTokenUpdate = () => {
      const currentToken = getAccessToken();
      if (!currentToken) return;
      const derived = deriveStateFromToken(currentToken);
      setTokenState(currentToken);
      setRole(derived.role);
      setUserId(derived.userId);
      setUsername(derived.username);
      setEmail(derived.email);
      setDisplayName(derived.displayName);
      scheduleProactiveRefresh();
    };

    window.addEventListener(AUTH_TOKEN_UPDATED_LISTENER, handleInterceptorTokenUpdate);

    return () => {
      unsubLogout();
      unsubTokenUpdated();
      window.removeEventListener(AUTH_EXPIRED_LISTENER, handleExpired);
      window.removeEventListener(AUTH_TOKEN_UPDATED_LISTENER, handleInterceptorTokenUpdate);
    };
  }, [cancelProactiveRefresh, scheduleProactiveRefresh]);

  /* ── Cleanup on unmount ─────────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      cancelProactiveRefresh();
    };
  }, [cancelProactiveRefresh]);

  /* ── Public methods ─────────────────────────────────────────────────────── */

  /**
   * Stores a new access token and all derived identity fields.
   * Call this on successful login.
   */
  const setToken = useCallback(
    (newToken, newRole = '') => {
      if (!newToken) return;
      setAccessToken(newToken);
      setTokenState(newToken);
      const derived = deriveStateFromToken(newToken);
      const resolvedRole = newRole || derived.role;
      setRole(resolvedRole);
      setUserId(derived.userId);
      setUsername(derived.username);
      setEmail(derived.email);
      setDisplayName(derived.displayName);
      scheduleProactiveRefresh();
      broadcastTokenUpdated();
    },
    [scheduleProactiveRefresh]
  );

  /**
   * Updates just the access token in state and storage.
   * Called by the axios interceptor after a silent refresh.
   */
  const setAccessTokenOnly = useCallback(
    (newToken) => {
      if (!newToken) return;
      setAccessToken(newToken);
      setTokenState(newToken);
      const derived = deriveStateFromToken(newToken);
      setUserId(derived.userId);
      setUsername(derived.username);
      setEmail(derived.email);
      setDisplayName(derived.displayName);
      scheduleProactiveRefresh();
    },
    [scheduleProactiveRefresh]
  );

  /**
   * Clears all auth state. Calls the backend logout endpoint, broadcasts
   * to other tabs, and resets the proactive refresh timer.
   */
  const handleLogout = useCallback(async () => {
    cancelProactiveRefresh();
    clearRefreshQueue();
    clearAccessToken();
    setTokenState(null);
    setRole('');
    setUserId('');
    setUsername('');
    setEmail('');
    setDisplayName('');
    broadcastLogout();

    try {
      await logoutApi();
    } catch {
      // Backend logout failure is non-critical — local session is already cleared.
    }
  }, [cancelProactiveRefresh]);

  const value = {
    token,
    role,
    userId,
    username,
    email,
    displayName,
    isAdmin: role === 'Admin',
    setToken,
    setAccessTokenOnly,
    logout: handleLogout,
    isAuthenticated: !!token,
    isLoading: false,
    isInitializing
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
