/**
 * Request shaping and error classification for the AI description
 * translation.
 *
 * This module is deliberately **dependency-free**: it imports nothing, so
 * it can be exercised offline by the test suite without a bundler, a
 * browser, or a network.
 *
 * ── The synchronous route is retired ─────────────────────────────────────────
 * The translation used to be produced by a single synchronous call. It
 * is now produced by an **asynchronous backend job**, and the browser
 * never calls a translation route at all: it submits a job, and the
 * backend performs the generation later.
 *
 * The job's request shaping lives in `aiJobRequest.js`, and the job's
 * transport lives in `services/aiJobService.js`.
 *
 * ── What stays here ──────────────────────────────────────────────────────────
 * The **Steam App ID normalization** stays here, because it has exactly
 * one implementation and it is reused by the job request builder: a
 * change to the accepted range can never be applied to one path and
 * missed on the other.
 *
 * The request builder and the validator below are the **synchronous**
 * contract's own. They are kept — and remain correct — because the
 * asynchronous job request reuses the same App ID rule, and because the
 * shape they describe is the shape the backend validates.
 *
 * ── The contract ─────────────────────────────────────────────────────────────
 * The request is deliberately minimal:
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
 * context for the generation only, and it has no database destination.
 *
 * ── Steam App ID is required here ───────────────────────────────────────────
 * There is no form-only fallback: without an App ID there is no
 * English source, so there is nothing to translate. The backend rejects
 * such a request with a 400, and this module rejects it before the
 * request is made, so the administrator gets an actionable message
 * instead of a round trip.
 */

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
 * @param {object} source
 * @param {string} source.productName
 * @param {number|string|null|undefined} source.steamAppId
 * @returns {{ ok: boolean, reason: string }}
 */
export const validateAiDescriptionRequest = (source = {}) => {
  const name = typeof source.productName === 'string' ? source.productName.trim() : '';

  if (!name) {
    return {
      ok: false,
      reason: 'Enter a product name before translating the Steam description.'
    };
  }

  if (name.length > AI_DESCRIPTION_MAX_PRODUCT_NAME_LENGTH) {
    return {
      ok: false,
      reason: `The product name is too long. Keep it under ${AI_DESCRIPTION_MAX_PRODUCT_NAME_LENGTH} characters.`
    };
  }

  if (normalizeAiDescriptionSteamAppId(source.steamAppId) === null) {
    return {
      ok: false,
      reason: 'Select a Steam game first. The translation needs the Steam store description as its source.'
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
 * @param {number} status
 * @param {string} fallbackMessage
 * @returns {string}
 */
export const describeAiDescriptionError = (status, fallbackMessage) => {
  switch (status) {
    case 400:
      return fallbackMessage
        || 'The request was rejected. Check the product name and the Steam selection.';
    case 401:
      return 'Your session has expired. Sign in again.';
    case 403:
      return 'You do not have permission to translate descriptions.';
    case 404:
      return fallbackMessage
        || 'The Steam description could not be retrieved. Check the App ID.';
    case 409:
      return fallbackMessage
        || 'The Steam App ID belongs to a different game.';
    case 413:
      return fallbackMessage
        || 'The description is too large to translate.';
    case 422:
      return fallbackMessage
        || 'The request was rejected as invalid.';
    case 429:
      return fallbackMessage
        || 'The translation service is busy. Please wait and try again.';
    case 500:
      return fallbackMessage
        || 'The server hit an unexpected problem. Please try again.';
    case 502:
      return fallbackMessage
        || 'The Steam store could not be reached. Please try again in a moment.';
    case 503:
      return fallbackMessage
        || 'AI translation is currently disabled.';
    case 504:
      return fallbackMessage
        || 'The translation took too long. Please try again.';
    case 0:
      return 'Network error. Please check your backend connection.';
    default:
      return fallbackMessage || 'The translation request failed. Please try again.';
  }
};
