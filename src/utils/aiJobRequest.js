/**
 * Request shaping and error classification for the asynchronous AI
 * generation job routes.
 *
 * This module is deliberately **dependency-free**: it imports nothing, so
 * it can be exercised offline by the test suite without a bundler, a
 * browser, or a network.
 * The axios call itself lives in `services/aiJobService.js`.
 *
 * ── Contract note ────────────────────────────────────────────────────────────
 * The route is `POST /api/admin/ai-generation-jobs` and its **public**
 * request is deliberately minimal:
 *
 *   { productName: string, steamAppId: number, operationType: string, productId: string|null }
 *
 * The create endpoint writes one row and returns immediately. **No
 * upstream call happens in the request path** — the generation is
 * performed later by the background worker. The browser therefore never
 * waits for a model, and the request body carries no free-text fact
 * block and no upstream URL.
 *
 * ── The Steam App ID normalization is reused, not duplicated ───────────────
 * The App ID range rule has exactly **one** implementation:
 * `normalizeAiDescriptionSteamAppId` in `aiDescriptionRequest.js`. It
 * is imported here rather than copied, so a change to the accepted range
 * can never be applied to one path and missed on the other.
 *
 * ── The operation type ──────────────────────────────────────────────────────
 * `Create` generates a description for a product that does not exist
 * yet; `Edit` regenerates the description of an existing product. The
 * two have different required fields, and the backend enforces the same
 * rule: a `Create` must not carry a product, and an `Edit` must.
 */

import { normalizeAiDescriptionSteamAppId } from './aiDescriptionRequest.js';

/** The public backend route. React calls the .NET backend only. */
export const AI_JOB_ENDPOINT = '/api/admin/ai-generation-jobs';

/**
 * The maximum product-name length the backend accepts.
 *
 * The same limit the backend enforces (`AiLimits.MaxProductNameLength`).
 */
export const AI_JOB_MAX_PRODUCT_NAME_LENGTH = 200;

/**
 * The two operation types a job can perform.
 */
export const AI_JOB_OPERATION_TYPES = {
  Create: 'Create',
  Edit: 'Edit'
};

/**
 * Whether a value is one of the two accepted operation types.
 *
 * @param {unknown} value
 * @returns {boolean}
 */
export const isValidAiJobOperationType = (value) =>
  value === AI_JOB_OPERATION_TYPES.Create || value === AI_JOB_OPERATION_TYPES.Edit;

/**
 * Normalize a product id into the shape the backend expects.
 *
 * A product id is a GUID. The backend binds it into a `Guid?`, so a
 * value that is not a GUID can never address a product; it is
 * normalized to `null` here so the validation can report it rather
 * than letting the backend reject the whole request.
 *
 * @param {unknown} value
 * @returns {string|null}
 */
export const normalizeAiJobProductId = (value) => {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value === 'boolean') return null;

  const text = String(value).trim();
  if (!text) return null;

  const guidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return guidPattern.test(text) ? text.toLowerCase() : null;
};

/**
 * Build the request body.
 *
 * The body carries the product name, the App ID, the operation type and
 * — for an `Edit` — the product id. Nothing else: no price, no image,
 * no Steam key, no customer data, no credential and no internal service
 * token is ever included.
 *
 * @param {object} source
 * @param {string} source.productName
 * @param {number|string|null|undefined} source.steamAppId
 * @param {string} source.operationType
 * @param {string|number|null|undefined} source.productId
 * @returns {{ productName: string, steamAppId: number|null, operationType: string, productId: string|null }}
 */
export const buildAiJobRequest = ({
  productName,
  steamAppId,
  operationType,
  productId
} = {}) => ({
  productName: typeof productName === 'string' ? productName.trim() : '',
  steamAppId: normalizeAiDescriptionSteamAppId(steamAppId),
  operationType: typeof operationType === 'string' && operationType.trim()
    ? operationType.trim()
    : AI_JOB_OPERATION_TYPES.Create,
  productId: normalizeAiJobProductId(productId)
});

/**
 * Decide whether the request may be sent.
 *
 * The rules follow the backend's own:
 *
 *   * the operation type must be one of the two accepted values;
 *   * a `Create` requires a product name (the backend reads the name
 *     from the request for a `Create`);
 *   * an `Edit` requires a product id (the backend reads the name from
 *     the product row for an `Edit`, so the client does not need one);
 *   * the Steam App ID must satisfy the shared range rule.
 *
 * @param {object} source
 * @param {string} source.productName
 * @param {number|string|null|undefined} source.steamAppId
 * @param {string} source.operationType
 * @param {string|number|null|undefined} source.productId
 * @returns {{ ok: boolean, reason: string }}
 */
export const validateAiJobRequest = ({
  productName,
  steamAppId,
  operationType,
  productId
} = {}) => {
  const operation = typeof operationType === 'string' && operationType.trim()
    ? operationType.trim()
    : AI_JOB_OPERATION_TYPES.Create;

  if (!isValidAiJobOperationType(operation)) {
    return {
      ok: false,
      reason: 'The operation type must be either "Create" or "Edit".'
    };
  }

  const name = typeof productName === 'string' ? productName.trim() : '';

  if (operation === AI_JOB_OPERATION_TYPES.Create) {
    if (!name) {
      return {
        ok: false,
        reason: 'Enter a product name before generating a description.'
      };
    }

    if (name.length > AI_JOB_MAX_PRODUCT_NAME_LENGTH) {
      return {
        ok: false,
        reason: `The product name is too long. Keep it under ${AI_JOB_MAX_PRODUCT_NAME_LENGTH} characters.`
      };
    }
  }

  if (operation === AI_JOB_OPERATION_TYPES.Edit && normalizeAiJobProductId(productId) === null) {
    return {
      ok: false,
      reason: 'A product is required to regenerate an existing description.'
    };
  }

  if (normalizeAiDescriptionSteamAppId(steamAppId) === null) {
    return {
      ok: false,
      reason: 'Select a Steam game first. The description is generated from the Steam store description.'
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
 * ── The statuses that are specific to this feature ─────────────────────────
 *   409 the Admin already has an active job (the one-active-job rule), or
 *      the job is not eligible for the requested operation — for example a
 *      draft save against a job that is not `Completed`;
 *   202 the cancellation was accepted but is not yet terminal — **not an
 *      error**, so it is not in this map at all;
 *   404 the job does not exist, or does not belong to this Admin;
 *   503 the feature switch is off.
 *
 * @param {number} status
 * @param {string} fallbackMessage
 * @returns {string}
 */
export const describeAiJobError = (status, fallbackMessage) => {
  switch (status) {
    case 202:
      // The cancellation of a processing job is acknowledged with 202:
      // the request is accepted, but the cancellation is not yet
      // terminal. It is a **success**, not a failure, so it never
      // reaches this mapper in practice — but if it ever did, it must
      // not be described as an error.
      return fallbackMessage || 'The request was accepted.';
    case 400:
      return fallbackMessage
        || 'The request was rejected. Check the product name, the Steam game and the operation.';
    case 401:
      return 'Your session has expired. Sign in again to manage AI description jobs.';
    case 403:
      return 'You do not have permission to manage AI description jobs.';
    case 404:
      return fallbackMessage
        || 'The job could not be found. It may have expired or belong to another administrator.';
    case 409:
      return fallbackMessage
        || 'You already have a description generation in progress. Cancel it before starting another.';
    case 413:
      return 'The request is too large to process. Shorten the product name and try again.';
    case 422:
      return 'The request was rejected as invalid. Check the job details and try again.';
    case 429:
      return 'The AI description service is busy right now. Please wait and try again.';
    case 500:
      return 'The server hit an unexpected problem. Please try again.';
    case 502:
      return 'The AI description service could not be reached. Please try again in a moment.';
    case 503:
      return fallbackMessage
        || 'The AI description service is currently disabled.';
    case 504:
      return 'The AI description service took too long to respond. You can try again.';
    case 0:
      return 'Network error. Please check your backend connection.';
    default:
      return fallbackMessage || 'The AI description job request failed. Please try again.';
  }
};
