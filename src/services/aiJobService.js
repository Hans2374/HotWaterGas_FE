import axiosClient from '../api/axiosClient';
import {
  AI_JOB_ENDPOINT,
  buildAiJobRequest,
  describeAiJobError
} from '../utils/aiJobRequest';

/**
 * The asynchronous AI description-generation jobs — admin REST transport.
 *
 * The route prefix is `/api/admin/ai-generation-jobs` and it exposes six
 * operations:
 *
 *   | Operation   | Method | Route                       |
 *   |-------------|--------|-----------------------------|
 *   | create      | POST   | `/api/admin/ai-generation-jobs`        |
 *   | list active | GET    | `/api/admin/ai-generation-jobs/active` |
 *   | read one    | GET    | `/api/admin/ai-generation-jobs/{id}`    |
 *   | save draft  | PUT    | `/api/admin/ai-generation-jobs/{id}/draft` |
 *   | cancel      | POST   | `/api/admin/ai-generation-jobs/{id}/cancel` |
 *   | retry       | POST   | `/api/admin/ai-generation-jobs/{id}/retry`  |
 *
 * ── Boundaries ───────────────────────────────────────────────────────────────
 * This module calls **only** the .NET backend. React never talks to the
 * Python service and never talks to Steam or Ollama directly: Steam's
 * storefront is not a public, CORS-friendly API, and the internal Python
 * route is not exposed to browsers at all. The internal service token is
 * never sent to the browser — the backend adds it to the upstream call.
 *
 * ── REST is authoritative ────────────────────────────────────────────────────
 * Every function here returns the backend's own view of the job. The
 * SignalR channel is a *notification* mechanism; the job's state, its
 * translation and its persisted draft are only ever read from here.
 *
 * ── No client-side timeout ──────────────────────────────────────────────────
 * None of the calls waits for a model, so no timeout is imposed: a
 * timeout here would cancel a request the backend had satisfied.
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
 * Throw the controlled `{ status, message }` shape.
 *
 * @param {object} error
 * @param {string} fallbackMessage
 * @throws {{ status: number, message: string }}
 */
const throwApiError = (error, fallbackMessage) => {
  const apiError = toApiError(error, fallbackMessage);
  throw {
    status: apiError.status,
    message: describeAiJobError(apiError.status, apiError.message)
  };
};

/**
 * Create an AI generation job.
 *
 * The endpoint writes one row and returns `201 Created` immediately. **No
 * upstream call happens here** — the background worker performs the
 * generation later.
 *
 * @param {object} request
 * @param {string} request.productName
 * @param {number|string|null} request.steamAppId
 * @param {string} request.operationType
 * @param {string|number|null} [request.productId]
 * @returns {Promise<object>} The created job, camel-cased.
 * @throws {{ status: number, message: string }}
 */
export const createAiGenerationJob = async (request) => {
  try {
    const response = await axiosClient.post(
      AI_JOB_ENDPOINT,
      buildAiJobRequest(request)
    );

    return response.data;
  } catch (error) {
    throwApiError(error, 'Failed to start the AI description generation.');
  }
};

/**
 * Get the Admin's active job and their most recent jobs.
 *
 * This is the restore-after-refresh endpoint. The frontend calls it on
 * load, after a reconnect, and on every polling tick, and rebuilds its
 * view from the server rather than trusting the notification channel.
 *
 * @returns {Promise<{ activeJob: object|null, jobs: object[] }>}
 * @throws {{ status: number, message: string }}
 */
export const getActiveAiGenerationJobs = async () => {
  try {
    const response = await axiosClient.get(`${AI_JOB_ENDPOINT}/active`);

    return {
      activeJob: response.data?.activeJob ?? null,
      jobs: Array.isArray(response.data?.jobs) ? response.data.jobs : []
    };
  } catch (error) {
    throwApiError(error, 'Failed to load the AI description jobs.');
  }
};

/**
 * Get one job, including its persisted draft.
 *
 * The backend answers `404` when the job does not exist **or** does not
 * belong to this Admin; the two are deliberately indistinguishable.
 *
 * @param {string} jobId
 * @returns {Promise<object>} The job, camel-cased.
 * @throws {{ status: number, message: string }}
 */
export const getAiGenerationJob = async (jobId) => {
  try {
    const response = await axiosClient.get(`${AI_JOB_ENDPOINT}/${jobId}`);

    return response.data;
  } catch (error) {
    throwApiError(error, 'Failed to load the AI description job.');
  }
};

/**
 * Persist the Admin's edited draft.
 *
 * The payload is the **complete** edited text, not a diff: the draft is
 * a single flat text blob, so a diff would add complexity without
 * benefit.
 *
 * The backend answers `409` when the job is not `Completed`, because a
 * draft may only be edited on a job that completed successfully.
 *
 * @param {string} jobId
 * @param {string} editedDraft The full edited text.
 * @returns {Promise<object>} The updated job, camel-cased.
 * @throws {{ status: number, message: string }}
 */
export const updateAiGenerationJobDraft = async (jobId, editedDraft) => {
  try {
    const response = await axiosClient.put(
      `${AI_JOB_ENDPOINT}/${jobId}/draft`,
      { editedDraft: typeof editedDraft === 'string' ? editedDraft : '' }
    );

    return response.data;
  } catch (error) {
    throwApiError(error, 'Failed to save the edited description.');
  }
};

/**
 * Request the cancellation of a job.
 *
 * The two outcomes are genuinely different and are reported differently:
 *
 *   * a **queued** job never occupied the worker slot, so it is
 *     cancelled immediately and is terminal on return (`200 OK`);
 *   * a **processing** job is only *cancel-requested*: the upstream
 *     request is not aborted, and the worker still holds the slot until
 *     the outstanding call has genuinely returned (`202 Accepted`).
 *
 * @param {string} jobId
 * @returns {Promise<object>} The cancel response, camel-cased.
 * @throws {{ status: number, message: string }}
 */
export const cancelAiGenerationJob = async (jobId) => {
  try {
    const response = await axiosClient.post(`${AI_JOB_ENDPOINT}/${jobId}/cancel`);

    return response.data;
  } catch (error) {
    throwApiError(error, 'Failed to request the cancellation.');
  }
};

/**
 * Create a replacement job from an eligible terminal job.
 *
 * A retry creates a **new** job. It never resets, revives or
 * reactivates the old row: a terminal job must never return to an
 * active state, and its history must stay readable.
 *
 * @param {string} jobId
 * @returns {Promise<object>} The replacement job, camel-cased.
 * @throws {{ status: number, message: string }}
 */
export const retryAiGenerationJob = async (jobId) => {
  try {
    const response = await axiosClient.post(`${AI_JOB_ENDPOINT}/${jobId}/retry`);

    return response.data;
  } catch (error) {
    throwApiError(error, 'Failed to retry the AI description generation.');
  }
};
