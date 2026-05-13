/**
 * Lightweight cross-tab auth synchronization.
 *
 * Uses the BroadcastChannel API (modern browsers) with localStorage event
 * as a fallback (Safari < 15.4).  Each tab listens for auth-change events
 * dispatched by other tabs and updates its local state accordingly.
 *
 * Events broadcast:
 *   AUTH_LOGOUT  – a logout occurred in another tab; this tab should clear its session.
 *   AUTH_TOKEN_UPDATED – a new token was set in another tab; this tab should sync.
 *
 * Broadcasts are also sent when this tab performs the action, so all tabs
 * (including the originator) stay in sync.
 */

const CHANNEL_NAME = 'hotwatergas-auth-channel';
const STORAGE_KEY_PREFIX = 'hotwatergas.auth.';

const CHANNELS = {
  LOGOUT: `${STORAGE_KEY_PREFIX}logout`,
  TOKEN_UPDATED: `${STORAGE_KEY_PREFIX}tokenUpdated`
};

let channel = null;
let listeners = {};

/* ── BroadcastChannel (preferred) ────────────────────────────────────────── */
const supportsBroadcastChannel = () => typeof BroadcastChannel !== 'undefined';

const getChannel = () => {
  if (!channel && supportsBroadcastChannel()) {
    channel = new BroadcastChannel(CHANNEL_NAME);
    channel.onmessage = (event) => {
      const { type } = event.data;
      if (listeners[type]) {
        listeners[type].forEach((cb) => cb(event.data));
      }
    };
  }
  return channel;
};

/* ── Public API ──────────────────────────────────────────────────────────── */

/**
 * Subscribe to an auth channel event.
 * @param {'logout' | 'tokenUpdated'} eventType
 * @param {(data: object) => void} callback
 * @returns {() => void} unsubscribe function
 */
export const subscribeToAuthEvent = (eventType, callback) => {
  const key = CHANNELS[eventType.toUpperCase()];
  if (!key) return () => {};

  if (!listeners[key]) listeners[key] = [];

  if (supportsBroadcastChannel()) {
    getChannel();
    listeners[key].push(callback);
  } else {
    const handler = (e) => {
      if (e.key === key && e.newValue) {
        try {
          callback(JSON.parse(e.newValue));
        } catch {
          callback({});
        }
      }
    };
    window.addEventListener('storage', handler);
    listeners[key].push(handler);
  }

  return () => {
    listeners[key] = (listeners[key] || []).filter((cb) => cb !== callback);
    if (!listeners[key]?.length) delete listeners[key];
  };
};

/**
 * Broadcast a logout event to all other tabs.
 */
export const broadcastLogout = () => {
  const payload = { ts: Date.now() };

  if (supportsBroadcastChannel()) {
    getChannel()?.postMessage({ type: CHANNELS.LOGOUT, ...payload });
  }

  try {
    sessionStorage.setItem(CHANNELS.LOGOUT, JSON.stringify(payload));
    sessionStorage.removeItem(CHANNELS.LOGOUT);
  } catch {
    // sessionStorage quota exceeded or private browsing – non-critical
  }
};

/**
 * Broadcast a token-update event to all other tabs.
 */
export const broadcastTokenUpdated = () => {
  const payload = { ts: Date.now() };

  if (supportsBroadcastChannel()) {
    getChannel()?.postMessage({ type: CHANNELS.TOKEN_UPDATED, ...payload });
  }

  try {
    sessionStorage.setItem(CHANNELS.TOKEN_UPDATED, JSON.stringify(payload));
    sessionStorage.removeItem(CHANNELS.TOKEN_UPDATED);
  } catch {
    // non-critical
  }
};
