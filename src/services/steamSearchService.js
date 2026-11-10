import axiosClient from '../api/axiosClient';
import {
  STEAM_SEARCH_ENDPOINT,
  buildSteamSearchRequest,
  describeSteamSearchError,
  normalizeSearchResponse
} from '../utils/steamSearchRequest';

/**
 * Steam Store Search — admin product form.
 *
 * The endpoint is `POST /api/admin/products/search-steam-games`.
 *
 * The request shaping and the error classification live in
 * `utils/steamSearchRequest.js`, which has no dependencies and can be
 * tested offline. This module is only the transport.
 *
 * ── Boundaries ───────────────────────────────────────────────────────────────
 * This module calls **only** the .NET backend. React never talks to the
 * Python service and never talks to Steam directly: Steam's storefront
 * is not a public, CORS-friendly API, and the internal Python route is
 * not exposed to browsers at all.
 *
 * The request goes through the shared authenticated axios client, so the
 * administrator's bearer token and the silent-refresh flow work exactly
 * as they do for every other admin API call.
 *
 * The response is a set of **candidates**, not verified product facts.
 * Nothing here is persisted.
 */

/**
 * Turn an axios failure into the `{ status, message }` shape the rest of
 * the frontend already expects.
 *
 * @param {object} error
 * @param {string} fallbackMessage
 * @returns {{ status: number, message: string }}
 */
const toApiError = (error, fallbackMessage) => {
  if (error?.response) {
    return {
      status: error.response.status,
      message: error.response.data?.message || fallbackMessage
    };
  }

  return {
    status: 0,
    message: 'Network error. Please check your backend connection.'
  };
};

/**
 * Search the Steam Store for candidate games.
 *
 * No client-side timeout is set: the backend enforces its own deadline
 * and returns a controlled 504, and imposing a shorter timeout here
 * would race the backend's own handling.
 *
 * @param {string} query The game name to search for.
 * @returns {Promise<{
 *   total: number|null,
 *   candidateCount: number,
 *   invalidCount: number|null,
 *   truncatedCount: number|null,
 *   candidates: Array<{ appId: number, name: string, tinyImage: string|null }>
 * }>} The normalized candidates.
 * @throws {{ status: number, message: string }}
 */
export const searchSteamGames = async (query) => {
  try {
    const response = await axiosClient.post(
      STEAM_SEARCH_ENDPOINT,
      buildSteamSearchRequest(query)
    );

    return normalizeSearchResponse(response.data);
  } catch (error) {
    const apiError = toApiError(error, 'Failed to search Steam.');
    throw {
      status: apiError.status,
      message: describeSteamSearchError(apiError.status, apiError.message)
    };
  }
};
