/**
 * Request shaping and error classification for the AI description
 * translation route.
 *
 * This module is deliberately **dependency-free**: it imports nothing, so
 * it can be exercised offline by the test suite without a bundler, a
 * browser, or a network.
 * The axios call itself lives in `services/aiDescriptionService.js`.
 *
 * ── Contract note ────────────────────────────────────────────────────────────
 * The route is `POST /api/admin/products/generate-description` and
 * its **public** request is deliberately minimal:
 *
 *   { productName: string, steamAppId: number }
 *
 * There is no id-based lookup and no free-text fact block. The English
 * source is retrieved from Steam by the backend, so the caller never
 * supplies the text to be translated — which means a caller cannot
 * smuggle an instruction into the source that is about to be translated.
 *
 * The Steam App ID is **asserted by the caller** and is never inferred
 * from the product name: an inferred App ID would silently attach another
 * game's description to this product. It is *transient* — it is request
 * context for the translation call only, and it has no database
 * destination.
 *
 * ── Steam App ID is required here ───────────────────────────────────────────
 * There is no form-only fallback: without an App ID there is no
 * English source, so there is nothing to translate. The backend rejects
 * such a request with a 400, and this module rejects it before the
 * request is made, so the administrator gets an actionable message
 * instead of a round trip.
 */

/** The public backend route. React calls the .NET backend only. */
export const AI_DESCRIPTION_ENDPOINT = '/api/admin/products/generate-description';

/** The maximum product-name length the backend accepts. */
export const AI_DESCRIPTION_MAX_PRODUCT_NAME_LENGTH = 200;

/** The lowest accepted Steam App ID. */
export const AI_DESCRIPTION_MIN_STEAM_APP_ID = 1;

/** The highest accepted Steam App ID. */
export const AI_DESCRIPTION_MAX_STEAM_APP_ID = 2_147_483_647;

/**
 * Normalize the Steam App ID.
 *
 * A valid App ID is a positive integer inside the contract's range.
 * Anything else — a blank, a zero, a negative, a non-numeric string, a
 * float — is rejected and becomes `null`.
 *
 * @param {number|string|null|undefined} value
 * @returns {number|null}
 */
export const normalizeAiDescriptionSteamAppId = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (typeof value === 'boolean') return null;

  const parsed = typeof value === 'number' ? value : Number(String(value).trim());

  if (!Number.isInteger(parsed)) return null;
  if (parsed < AI_DESCRIPTION_MIN_STEAM_APP_ID || parsed > AI_DESCRIPTION_MAX_STEAM_APP_ID) return null;

  return parsed;
};

/**
 * Build the request body.
 *
 * The body carries the product name and the App ID, and nothing else.
 * No price, image, Steam key, customer data, credential or internal
 * service token is ever included.
 *
 * @param {string} productName
 * @param {number|string|null|undefined} steamAppId
 * @returns {{ productName: string, steamAppId: number|null }}
 */
export const buildAiDescriptionRequest = (productName, steamAppId) => ({
  productName: typeof productName === 'string' ? productName.trim() : '',
  steamAppId: normalizeAiDescriptionSteamAppId(steamAppId)
});

/**
 * Decide whether the request may be sent.
 *
 * Both fields are required by the contract: a product name to check
 * the retrieved Steam title against, and a Steam App ID to retrieve the
 * English source from.
 *
 * @param {object} source
 * @param {string} source.productName
 * @param {number|string|null|undefined} source.steamAppId
 * @returns {{ ok: boolean, reason: string }}
 */
export const validateAiDescriptionRequest = (source = {}) => {
  const name = typeof source.productName === 'string' ? source.productName.trim() : '';

  if (!name) {
    return { ok: false, reason: 'Enter a product name before translating a description.' };
  }

  if (name.length > AI_DESCRIPTION_MAX_PRODUCT_NAME_LENGTH) {
    return {
      ok: false,
      reason: `The product name is too long. Keep it under ${AI_DESCRIPTION_MAX_PRODUCT_NAME_LENGTH} characters.`
    };
  }

  const appId = normalizeAiDescriptionSteamAppId(source.steamAppId);
  if (appId === null) {
    return {
      ok: false,
      reason: 'Select a Steam game first. The translation is made from the Steam store description.'
    };
  }

  return { ok: true, reason: '' };
};

/**
 * Map an HTTP status onto a message the administrator can act on.
 *
 * The backend already sanitises its own error bodies, so the backend's
 * `message` is preferred when present. The fallbacks below cover the
 * cases where the body was empty or carried no message.
 *
 * The statuses follow the backend's contract:
 *
 *   400 invalid request (including a missing App ID)
 *   401 the admin's session expired
 *   403 the caller is not an Admin
 *   404 the Steam description could not be retrieved for this App ID
 *   409 the App ID identifies a different game than the product
 *   413 the request exceeded the upstream size limit
 *   422 the upstream rejected the payload
 *   429 the upstream is rate-limiting
 *   502 the Steam store or the AI provider failed
 *   503 the translation service is disabled, unconfigured or busy
 *   504 the translation timed out
 *
 * @param {number} status
 * @param {string} fallbackMessage
 * @returns {string}
 */
export const describeAiDescriptionError = (status, fallbackMessage) => {
  switch (status) {
    case 400:
      return fallbackMessage
        || 'The request was rejected. Select a Steam game and check the product name.';
    case 401:
      return 'Your session has expired. Sign in again to translate a description.';
    case 403:
      return 'You do not have permission to translate AI descriptions.';
    case 404:
      return fallbackMessage
        || 'The Steam description could not be retrieved for this App ID. Check the App ID — the game may publish no store description.';
    case 409:
      return 'The Steam App ID refers to a different game than this product. Check the App ID and try again.';
    case 413:
      return 'The request is too large to process. Shorten the product name and try again.';
    case 422:
      return 'The request was rejected as invalid. Check the product details and try again.';
    case 429:
      return 'The translation service is busy right now. Please wait and try again.';
    case 500:
      return 'The server hit an unexpected problem. Please try again.';
    case 502:
      return 'The Steam store or the translation service could not be reached. Please try again in a moment.';
    case 503:
      return 'AI description translation is unavailable right now. It may be disabled or busy — try again later.';
    case 504:
      return 'The translation took too long to respond. You can try again.';
    case 0:
      return 'Network error. Please check your backend connection.';
    default:
      return fallbackMessage || 'AI description translation failed. Please try again.';
  }
};
