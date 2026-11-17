import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel
} from '@microsoft/signalr';

import { getAccessToken, isTokenExpired } from '../utils/tokenManager';
import { refreshAccessToken } from '../api/axiosClient';
import { executeWithRefreshLock } from '../utils/refreshQueue';

/**
 * The SignalR client for the AI generation hub.
 *
 * ── The contract this client speaks ─────────────────────────────────────────
 * The backend's hub (`AiGenerationHub`) is mapped at `/hubs/ai-generation`
 * and it publishes **one** notification method, `AiJobChanged`, carrying
 * **metadata only**: the job id, the status, the stage, the attempt
 * count, the progress message, the update and completion timestamps and
 * the error code.
 *
 * The payload never carries the translated description, the edited
 * draft, the persisted result, the evidence, a Steam payload, an
 * upstream body, a token, a credential, a connection detail, an
 * exception or a stack trace. **The client therefore never treats the
 * notification as the source of the job** — every notification triggers
 * a REST fetch, and REST is authoritative.
 *
 * ── The access token ────────────────────────────────────────────────────────
 * A browser's WebSocket API cannot set an `Authorization` header, so
 * `@microsoft/signalr` appends the token as an `access_token` query
 * parameter instead. The backend reads it **only** on the hub's own path
 * and moves it into the bearer header, so the existing JWT validation
 * stays authoritative.
 *
 * The token is fetched through an `accessTokenFactory`, which is called
 * for the negotiate request and for every WebSocket handshake. That
 * factory **refreshes an expired token itself**: the Axios interceptor
 * only runs for requests made through `axiosClient`, and a SignalR
 * handshake never passes through it. Without the explicit refresh, a
 * reconnect with an expired token would fail the handshake and the
 * connection would never recover.
 *
 * The refresh goes through the **shared** single-flight queue
 * (`executeWithRefreshLock`), so a SignalR-triggered refresh and an
 * Axios-interceptor refresh can never race and invalidate each other's
 * token.
 *
 * ── The .NET 8 constraint ───────────────────────────────────────────────────
 * The backend validates the bearer token **once**, at connection
 * establishment. An established connection cannot refresh its identity in
 * place. The approved design is therefore: a **fresh token** is acquired
 * for every connection establishment and every reconnection, and the
 * existing `hotwatergas:auth:expired` event handles the logout path.
 * No .NET 11 authentication-refresh API is used or assumed.
 *
 * ── Logging ─────────────────────────────────────────────────────────────────
 * This module logs **nothing**. The SignalR client is configured at
 * `LogLevel.None`, and no token, query string, draft, generation result
 * or sensitive payload is ever written to the console.
 */

/** The hub's route. It is the backend's own constant. */
export const AI_JOB_HUB_PATH = '/hubs/ai-generation';

/** The one notification method the hub publishes. */
export const AI_JOB_HUB_NOTIFICATION_METHOD = 'AiJobChanged';

/**
 * The reconnect backoff, in seconds.
 *
 * A zero-delay first attempt reconnects immediately, then the delays
 * grow. The sequence is bounded: the client never reconnects forever,
 * and the REST polling fallback covers the window in which no
 * connection exists.
 */
export const AI_JOB_RECONNECT_DELAYS = [0, 2, 5, 10, 30];

/**
 * The base URL of the .NET backend.
 *
 * The same value the Axios client uses, so the hub and the REST API
 * always address the same origin.
 */
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:7140';

/**
 * The absolute hub URL.
 *
 * @returns {string}
 */
export const aiJobHubUrl = () => `${API_BASE_URL}${AI_JOB_HUB_PATH}`;

/**
 * Acquire a usable access token for the hub handshake.
 *
 * The order is fixed:
 *
 *   1. read the current access token;
 *   2. check whether it is missing or expired, using the existing token
 *      utilities;
 *   3. if it is missing or expired, refresh it through the shared
 *      single-flight queue;
 *   4. read and return the fresh token;
 *   5. fail safely when no usable token is available.
 *
 * @returns {Promise<string>} The access token.
 * @throws {Error} When no usable token could be obtained.
 */
export const resolveHubAccessToken = async () => {
  const token = getAccessToken();

  if (!token || isTokenExpired(token)) {
    // The refresh goes through the SHARED single-flight queue, so a
    // SignalR reconnect and an Axios-interceptor refresh can never
    // race. The second refresh would invalidate the first token.
    await executeWithRefreshLock(refreshAccessToken);
  }

  const fresh = getAccessToken();

  if (!fresh) {
    throw new Error('No access token available for the SignalR connection.');
  }

  return fresh;
};

/**
 * Build a hub connection.
 *
 * The connection is configured with:
 *
 *   * **WebSockets** as the preferred transport, with Server-Sent
 *     Events and Long Polling as fallbacks, so the client still works
 *     behind a proxy that blocks WebSockets;
 *   * **negotiation enabled** (`skipNegotiation: false`), because the
 *     backend's hub-path-restricted query-token gate expects the
 *     negotiate handshake the SignalR protocol performs;
 *   * **automatic reconnect** on the approved backoff;
 *   * **no logging at all**, so no token, query string or payload can
 *     reach the console.
 *
 * @param {object} [options]
 * @param {(notification: object) => void} [options.onNotification] Called with the metadata payload.
 * @param {() => void} [options.onReconnected] Called after a reconnect.
 * @param {(state: string) => void} [options.onStateChange] Called on every state change.
 * @returns {object} The hub connection.
 */
export const createAiJobHubConnection = ({
  onNotification,
  onReconnected,
  onStateChange
} = {}) => {
  const connection = new HubConnectionBuilder()
    .withUrl(aiJobHubUrl(), {
      // The browser cannot set an Authorization header on a WebSocket
      // handshake, so the token travels as the `access_token` query
      // parameter. The backend accepts it on the hub path only.
      accessTokenFactory: resolveHubAccessToken,
      // WebSockets are the preferred transport. Server-Sent Events and
      // Long Polling are the fallbacks, so the client still works
      // behind a proxy that blocks WebSockets.
      transport: HttpTransportType.WebSockets
        | HttpTransportType.ServerSentEvents
        | HttpTransportType.LongPolling
    })
    .withAutomaticReconnect(AI_JOB_RECONNECT_DELAYS)
    .configureLogging(LogLevel.None)
    .build();

  if (typeof onNotification === 'function') {
    connection.on(AI_JOB_HUB_NOTIFICATION_METHOD, (payload) => {
      onNotification(payload);
    });
  }

  if (typeof onStateChange === 'function') {
    connection.onreconnecting(() => {
      onStateChange('Reconnecting');
    });

    connection.onreconnected(() => {
      onStateChange('Reconnected');
      if (typeof onReconnected === 'function') {
        onReconnected();
      }
    });

    connection.onclose((error) => {
      // The error object is never inspected or logged: it may carry
      // connection details, and the connection detail is exactly what
      // must not be exposed.
      void error;
      onStateChange('Disconnected');
    });
  }

  return connection;
};
