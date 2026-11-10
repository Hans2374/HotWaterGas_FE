import axiosClient from '../api/axiosClient';
import {
  AI_DESCRIPTION_ENDPOINT,
  buildAiDescriptionRequest,
  describeAiDescriptionError
} from '../utils/aiDescriptionRequest';

/**
 * AI description translation — admin product form.
 *
 * The endpoint is `POST /api/admin/products/generate-description`.
 *
 * The request shaping and the error classification live in
 * `utils/aiDescriptionRequest.js`, which has no dependencies and can
 * be tested offline. This module is only the transport.
 *
 * ── Boundaries ───────────────────────────────────────────────────────────────
 * This module calls **only** the .NET backend. React never talks to the
 * Python service and never talks to Steam directly: Steam's storefront
 * is not a public, CORS-friendly API, and the internal Python route is
 * not exposed to browsers at all. The internal service token is never
 * sent to the browser — the backend adds it to the upstream call.
 *
 * The request goes through the shared authenticated axios client, so the
 * administrator's bearer token and the silent-refresh flow work exactly
 * as they do for every other admin API call.
 *
 * ── Persistence ──────────────────────────────────────────────────────────────
 * Nothing here is persisted. The Steam App ID is transient request
 * context: it is sent with the translation request and never written to
 * the product.
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
 * Translate a Steam store description into Vietnamese.
 *
 * Uses the shared authenticated axios client, so the admin's bearer token
 * and the silent-refresh flow work exactly as they do for every other
 * admin API call.
 *
 * No client-side timeout is set: the backend supports a long generation
 * window (a local model can be slow), and imposing a short timeout here
 * would cancel requests the backend would have satisfied.
 *
 * @param {string} productName The product's official name.
 * @param {number|string|null} steamAppId The asserted Steam App ID.
 * @returns {Promise<object>} The translation result, camel-cased.
 * @throws {{ status: number, message: string }}
 */
export const generateAiDescription = async (productName, steamAppId) => {
  try {
    const response = await axiosClient.post(
      AI_DESCRIPTION_ENDPOINT,
      buildAiDescriptionRequest(productName, steamAppId)
    );

    return response.data;
  } catch (error) {
    const apiError = toApiError(error, 'Failed to translate the Steam description.');
    throw {
      status: apiError.status,
      message: describeAiDescriptionError(apiError.status, apiError.message)
    };
  }
};
