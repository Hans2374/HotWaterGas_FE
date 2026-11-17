/**
 * The asynchronous AI generation job lifecycle — pure state transitions.
 *
 * This module is deliberately **dependency-free**, so the whole lifecycle
 * can be exercised offline by the test suite without a bundler, a
 * browser, a network, or a DOM — exactly like `utils/aiDescriptionState.js`.
 *
 * ── Why the synchronous model needed a new state machine ───────────────────
 * The retired synchronous flow had exactly one interesting rule: a
 * failed translation must not destroy an existing draft. The
 * asynchronous model adds three more, and each of them has a failure
 * mode that only shows up under concurrency:
 *
 *   * the **server** owns the job's state, and the client owns the
 *     *edited* draft. A REST refetch returns the server's copy of the
 *     draft, which does not contain the administrator's unsaved edits —
 *     so a refetch must not overwrite local text while the local text is
 *     dirty;
 *   * the **notification channel is a hint**, not an event stream. A
 *     notification only ever *triggers* a REST fetch; it never carries
 *     the authoritative state, and it never carries the draft;
 *   * a **terminal job never returns to an active state**, and the
 *     backend owns that transition — so the client only ever *reflects*
 *     a status the server reported.
 *
 * Expressing those rules as pure functions — rather than as scattered
 * `setState` calls inside a component — is what makes them verifiable
 * without a DOM. The context owns the state and the timers; this module
 * owns the rules.
 *
 * ── The state shape ────────────────────────────────────────────────────────
 * The fields below mirror the backend's `AiGenerationJobResponse` (the
 * S3 contract) for the *metadata*, and add the two purely client-side
 * concepts the asynchronous model needs:
 *
 *   * `editedDraft` — the administrator's local working copy of the
 *     draft. It is authoritative only until the server confirms a save.
 *   * `editedDraftDirty` — whether that local copy differs from what the
 *     server has. It is the flag that protects unsaved edits from a
 *     REST refetch.
 */

/* ── The status vocabulary ───────────────────────────────────────────────── */

/**
 * The literal status values a job can hold.
 *
 * These are plain strings, not an enum, and they match the backend's
 * `AiGenerationJobStatuses` exactly. The backend's database CHECK
 * constraint closes the vocabulary, and the client mirrors it rather
 * than inventing a second one.
 */
export const AI_JOB_STATUSES = {
  Queued: 'Queued',
  Processing: 'Processing',
  Completed: 'Completed',
  Failed: 'Failed',
  Cancelled: 'Cancelled'
};

/**
 * The literal stage values a job can report.
 *
 * In Phase 1 the backend never advances past `FetchingData`; the stage
 * describes the backend's own activity, not the model's. `Generating`
 * and `Regenerating` are reserved, and the renderer treats them
 * defensively rather than assuming they occur.
 */
export const AI_JOB_STAGES = {
  FetchingData: 'FetchingData',
  Generating: 'Generating',
  Regenerating: 'Regenerating'
};

/**
 * The literal operation types a job can perform.
 */
export const AI_JOB_OPERATION_TYPES = {
  Create: 'Create',
  Edit: 'Edit'
};

/**
 * The draft-save state the UI shows.
 *
 * `idle` — nothing to save.
 * `saving` — a save is in flight.
 * `saved` — the last save succeeded.
 * `error` — the last save failed; the client is retrying.
 */
export const AI_DRAFT_SAVE_STATES = {
  Idle: 'idle',
  Saving: 'saving',
  Saved: 'saved',
  Error: 'error'
};

/**
 * The statuses that mean the job occupies its Admin's one-active-job slot.
 */
export const AI_JOB_ACTIVE_STATUSES = [AI_JOB_STATUSES.Queued, AI_JOB_STATUSES.Processing];

/**
 * The statuses that mean the job has reached a terminal state and can no
 * longer change.
 */
export const AI_JOB_TERMINAL_STATUSES = [
  AI_JOB_STATUSES.Completed,
  AI_JOB_STATUSES.Failed,
  AI_JOB_STATUSES.Cancelled
];

/* ── The initial state ───────────────────────────────────────────────────── */

/**
 * The initial job state.
 *
 * @returns {{
 *   jobId: string|null,
 *   operationType: string|null,
 *   steamAppId: number|null,
 *   productId: string|null,
 *   productName: string,
 *   status: string|null,
 *   stage: string|null,
 *   progressMessage: string,
 *   attemptCount: number,
 *   cancelRequested: boolean,
 *   nextAttemptAt: string|null,
 *   error: { status: number, message: string }|null,
 *   errorCode: string|null,
 *   errorMessage: string|null,
 *   translation: object|null,
 *   editedDraft: string,
 *   editedDraftDirty: boolean,
 *   isSubmitting: boolean,
 *   isCancelling: boolean,
 *   isRestoring: boolean,
 *   isSavingDraft: boolean,
 *   draftSaveState: string,
 *   startedAt: string|null,
 *   completedAt: string|null,
 *   createdAt: string|null,
 *   updatedAt: string|null
 * }}
 */
export const createAiJobState = () => ({
  jobId: null,
  operationType: null,
  steamAppId: null,
  productId: null,
  productName: '',
  status: null,
  stage: null,
  progressMessage: '',
  attemptCount: 0,
  cancelRequested: false,
  nextAttemptAt: null,
  error: null,
  errorCode: null,
  errorMessage: null,
  translation: null,
  editedDraft: '',
  editedDraftDirty: false,
  isSubmitting: false,
  isCancelling: false,
  isRestoring: false,
  isSavingDraft: false,
  draftSaveState: AI_DRAFT_SAVE_STATES.Idle,
  startedAt: null,
  completedAt: null,
  createdAt: null,
  updatedAt: null
});

/* ── Helpers ─────────────────────────────────────────────────────────────── */

/**
 * Whether a status is one of the two active statuses.
 *
 * @param {string|null|undefined} status
 * @returns {boolean}
 */
export const isActiveAiJobStatus = (status) =>
  AI_JOB_ACTIVE_STATUSES.includes(status);

/**
 * Whether a status is one of the three terminal statuses.
 *
 * @param {string|null|undefined} status
 * @returns {boolean}
 */
export const isTerminalAiJobStatus = (status) =>
  AI_JOB_TERMINAL_STATUSES.includes(status);

/**
 * Whether the state currently tracks an active job.
 *
 * @param {object} state
 * @returns {boolean}
 */
export const hasActiveAiJob = (state) =>
  isActiveAiJobStatus(state?.status);

/**
 * Whether the tracked job has reached a terminal state.
 *
 * @param {object} state
 * @returns {boolean}
 */
export const isTerminalAiJob = (state) =>
  isTerminalAiJobStatus(state?.status);

/**
 * Whether a new job may be submitted.
 *
 * A new job may be submitted only when there is **no active job** and no
 * cancellation is still awaiting the backend's terminal confirmation.
 *
 * The second condition matters: a cancel request against a *processing*
 * job only marks the job cancel-requested — the backend keeps the
 * upstream request in flight until it genuinely returns. Issuing a new
 * job in that window would collide with the backend's one-active-job
 * rule, so the UI keeps the Generate control disabled until the
 * cancellation is confirmed terminal.
 *
 * @param {object} state
 * @returns {boolean}
 */
export const canSubmitAiJob = (state) => {
  if (hasActiveAiJob(state)) return false;
  if (state?.isCancelling) return false;
  if (state?.cancelRequested) return false;
  return true;
};

/**
 * Whether the current job is eligible for a manual retry.
 *
 * A retry creates a *new* job, so it is only offered for a job that has
 * reached a terminal state.
 *
 * @param {object} state
 * @returns {boolean}
 */
export const canRetryAiJob = (state) =>
  isTerminalAiJobStatus(state?.status);

/**
 * Whether a draft edit may be persisted right now.
 *
 * The backend refuses a draft save for a job that is not `Completed`
 * (it answers 409), so the auto-save only runs for a completed job.
 *
 * @param {object} state
 * @returns {boolean}
 */
export const canSaveAiJobDraft = (state) =>
  state?.status === AI_JOB_STATUSES.Completed && Boolean(state?.jobId);

/**
 * Whether the job is waiting for a backoff-delayed retry.
 *
 * A queued job that has already been attempted and carries a
 * `nextAttemptAt` is waiting for the backoff window to elapse.
 *
 * @param {object} state
 * @returns {boolean}
 */
export const isAwaitingAiJobRetry = (state) =>
  state?.status === AI_JOB_STATUSES.Queued
  && Number(state?.attemptCount) > 0
  && Boolean(state?.nextAttemptAt);

/**
 * The number of milliseconds a job has been running, derived from the
 * backend's own timestamps.
 *
 * The elapsed time is **never** an invented progress estimate: it is
 * `completedAt - startedAt` for a terminal job and `now - startedAt`
 * for a running one. When the backend supplied no start timestamp the
 * elapsed time is unknown, and `null` is returned rather than a
 * fabricated number.
 *
 * @param {object} state
 * @param {number} [now] The current epoch milliseconds.
 * @returns {number|null}
 */
export const aiJobElapsedMs = (state, now = Date.now()) => {
  const startedAt = state?.startedAt;
  if (!startedAt) return null;

  const started = Date.parse(startedAt);
  if (Number.isNaN(started)) return null;

  if (state?.status && isTerminalAiJobStatus(state.status) && state?.completedAt) {
    const completed = Date.parse(state.completedAt);
    if (!Number.isNaN(completed)) return Math.max(0, completed - started);
  }

  return Math.max(0, now - started);
};

/* ── Submission ──────────────────────────────────────────────────────────── */

/**
 * A job-creation request was issued.
 *
 * The previous error is cleared, so a retry never shows a stale
 * outcome, and the previous draft is preserved: a failed submission
 * must never destroy the administrator's work.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const startAiJobSubmission = (state) => ({
  ...state,
  isSubmitting: true,
  error: null
});

/**
 * The job was created.
 *
 * The job is `Queued`: the backend accepted the request and the worker
 * has not claimed it yet. No upstream call has happened.
 *
 * @param {object} state
 * @param {object} job The created job, as the backend returned it.
 * @returns {object} The next state.
 */
export const succeedAiJobSubmission = (state, job) => ({
  ...state,
  ...projectAiJobMetadata(job),
  status: job?.status || AI_JOB_STATUSES.Queued,
  stage: job?.stage ?? null,
  progressMessage: job?.progressMessage ?? '',
  attemptCount: Number(job?.attemptCount) || 0,
  cancelRequested: job?.cancelRequested === true,
  nextAttemptAt: job?.nextAttemptAt ?? null,
  error: null,
  errorCode: job?.errorCode ?? null,
  errorMessage: job?.errorMessage ?? null,
  isSubmitting: false,
  isCancelling: false,
  isRestoring: false
});

/**
 * The job creation failed.
 *
 * The failure sets the error and nothing else. The existing draft and
 * the administrator's edits to it survive: losing a draft because a
 * submission failed would be the worst possible outcome.
 *
 * @param {object} state
 * @param {{ status: number, message: string }} error The controlled error.
 * @returns {object} The next state.
 */
export const failAiJobSubmission = (state, error) => ({
  ...state,
  isSubmitting: false,
  error: error || null
});

/* ── REST fetch and notification ─────────────────────────────────────────── */

/**
 * Read the translated description text out of a job's translation.
 *
 * The job's `translation` block is the upstream translation response,
 * and the description text lives at `description.text`. The read is
 * done here with plain property access rather than through
 * `aiDescriptionMapping`, so this module stays dependency-free.
 *
 * @param {object|null|undefined} translation
 * @returns {string} The translated text, or '' when absent.
 */
export const readAiJobTranslationText = (translation) => {
  const text = translation?.description?.text;
  return typeof text === 'string' ? text : '';
};

/**
 * Project a backend job onto the client's metadata fields.
 *
 * The draft fields are **deliberately excluded**: the draft is managed
 * by its own transitions, which own the dirty-flag rule.
 *
 * @param {object} job
 * @returns {object}
 */
const projectAiJobMetadata = (job) => ({
  jobId: job?.id ?? job?.jobId ?? null,
  operationType: job?.operationType ?? null,
  steamAppId: job?.steamAppId ?? null,
  productId: job?.productId ?? null,
  productName: job?.productName ?? '',
  createdAt: job?.createdAt ?? null,
  updatedAt: job?.updatedAt ?? null,
  startedAt: job?.startedAt ?? null,
  completedAt: job?.completedAt ?? null
});

/**
 * A SignalR notification arrived.
 *
 * The notification is **metadata only**. It carries the job's status and
 * stage, never the draft, never the translation, never the result. So
 * this transition advances the *state* and never touches the draft.
 *
 * The notification is also not authoritative: it says "something
 * changed", and the client answers that by fetching the job through
 * REST. That is why this transition never replaces the translation
 * either — the translation comes from the REST fetch, and only the REST
 * fetch is allowed to set it.
 *
 * @param {object} state
 * @param {object} payload The notification payload.
 * @returns {object} The next state.
 */
export const applyJobNotification = (state, payload) => {
  if (!payload || typeof payload !== 'object') return state;

  const next = { ...state };

  // The notification's job id is the correlation key. A notification
  // for a job the client does not track is ignored, so a late
  // notification from a previous job cannot revive it.
  const jobId = payload.jobId ?? null;
  if (jobId && state.jobId && jobId !== state.jobId) {
    return state;
  }

  if (typeof payload.status === 'string' && payload.status) {
    next.status = payload.status;
  }

  if ('stage' in payload) {
    next.stage = payload.stage ?? null;
  }

  if (typeof payload.progressMessage === 'string') {
    next.progressMessage = payload.progressMessage;
  }

  if (Number.isFinite(Number(payload.attemptCount))) {
    next.attemptCount = Number(payload.attemptCount);
  }

  if (typeof payload.completedAt === 'string') {
    next.completedAt = payload.completedAt;
  }

  if (typeof payload.updatedAt === 'string') {
    next.updatedAt = payload.updatedAt;
  }

  if (typeof payload.errorCode === 'string') {
    next.errorCode = payload.errorCode;
  }

  // A notification never clears the draft, the translation, the dirty
  // flag, or the edited text. It only advances the status metadata.
  return next;
};

/**
 * A REST fetch returned the job.
 *
 * This is the **authoritative** transition: REST is the source of truth,
 * and the SignalR notification only ever triggers this call.
 *
 * ── The edited-draft preservation rule ────────────────────────────────────
 * The server's copy of the draft does not contain the administrator's
 * unsaved edits. So the server's draft replaces the local one **only
 * when the client holds no unsaved edits** (`editedDraftDirty` is
 * false). While the flag is true, the local text is kept verbatim and
 * the auto-save continues to drive it towards the server.
 *
 * The transition is also **terminal-monotone**: a terminal status is
 * never replaced by an active one. The backend owns the state machine,
 * and the backend never reactivates a terminal job — so a stale
 * response (or a notification that arrived out of order) must not
 * resurrect a finished job.
 *
 * @param {object} state
 * @param {object} job The job, as the backend returned it.
 * @returns {object} The next state.
 */
export const succeedAiJobFetch = (state, job) => {
  if (!job || typeof job !== 'object') return state;

  const next = {
    ...state,
    ...projectAiJobMetadata(job),
    status: job?.status ?? state.status,
    stage: job?.stage ?? null,
    progressMessage: job?.progressMessage ?? '',
    attemptCount: Number(job?.attemptCount) || 0,
    cancelRequested: job?.cancelRequested === true,
    nextAttemptAt: job?.nextAttemptAt ?? null,
    errorCode: job?.errorCode ?? null,
    errorMessage: job?.errorMessage ?? null,
    translation: job?.translation ?? null,
    isRestoring: false
  };

  // The terminal-never-reactivates rule.
  if (isTerminalAiJobStatus(state.status) && isActiveAiJobStatus(next.status)) {
    next.status = state.status;
    next.stage = state.stage;
    next.progressMessage = state.progressMessage;
    next.cancelRequested = state.cancelRequested;
    next.nextAttemptAt = state.nextAttemptAt;
    next.completedAt = state.completedAt;
    next.errorCode = state.errorCode;
    next.errorMessage = state.errorMessage;
  }

  // The draft preservation rule.
  if (!state.editedDraftDirty) {
    const serverDraft = typeof job?.editedDraft === 'string' ? job.editedDraft : '';
    const generatedText = readAiJobTranslationText(job?.translation);

    if (serverDraft.length > 0) {
      // The administrator has already saved an edit: the server's copy
      // of the draft is the working copy.
      next.editedDraft = serverDraft;
      next.draftSaveState = AI_DRAFT_SAVE_STATES.Saved;
    } else {
      // No draft has been saved yet: the generated text is the working
      // copy. The generated text is **not** dirty — it is the server's
      // own content, not an unsaved edit.
      next.editedDraft = generatedText;
      next.draftSaveState = AI_DRAFT_SAVE_STATES.Idle;
    }
  }

  return next;
};

/**
 * A REST fetch failed.
 *
 * The state is preserved. A failed fetch must never clear the draft,
 * the edited text, or the last known status: the client would then
 * have nothing to show and nothing to save.
 *
 * @param {object} state
 * @param {{ status: number, message: string }} error
 * @returns {object} The next state.
 */
export const failAiJobFetch = (state, error) => ({
  ...state,
  isRestoring: false,
  error: error || null
});

/**
 * Choose the job to restore from the backend's active-jobs response.
 *
 * The restore covers two situations:
 *
 *   * there **is** an active job — a `Queued` or `Processing` one — and
 *     it is what the Admin must see, including a job that is waiting
 *     for a backoff-delayed retry (`attemptCount > 0` with a
 *     `nextAttemptAt`);
 *   * there is **no** active job, but the Admin's most recent job
 *     `Completed`. A completed job may carry a **persisted draft** and
 *     the administrator's edits to it, so it must survive a browser
 *     refresh: the refresh would otherwise destroy the administrator's
 *     work.
 *
 * A recent job that is `Failed` or `Cancelled` is **not** restored: it
 * carries no draft, and restoring it would put a dead job on screen
 * where the Admin expects a clean form.
 *
 * @param {{ activeJob: object|null, jobs: object[] }} result
 * @returns {object|null} The job to install, or null.
 */
export const selectRestoredAiJob = (result) => {
  const activeJob = result?.activeJob ?? null;

  if (activeJob) {
    return activeJob;
  }

  const jobs = Array.isArray(result?.jobs) ? result.jobs : [];
  if (jobs.length === 0) {
    return null;
  }

  const latest = jobs[0];
  if (latest?.status === AI_JOB_STATUSES.Completed) {
    return latest;
  }

  return null;
};

/**
 * A REST restoration has started.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const startAiJobRestore = (state) => ({
  ...state,
  isRestoring: true
});

/* ── Cancellation ────────────────────────────────────────────────────────── */

/**
 * A cancel request was issued.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const startAiJobCancel = (state) => ({
  ...state,
  isCancelling: true,
  error: null
});

/**
 * The backend acknowledged the cancel request.
 *
 * Two outcomes are genuinely different and are reflected faithfully:
 *
 *   * a **queued** job is cancelled immediately and is terminal on
 *     return, so the status becomes `Cancelled`;
 *   * a **processing** job is only *cancel-requested*: the upstream
 *     request is still in flight, and the job becomes terminal only
 *     once that request genuinely returns.
 *
 * The acknowledgement therefore never *claims* a terminal cancellation
 * it was not given.
 *
 * @param {object} state
 * @param {object} response The cancel response.
 * @returns {object} The next state.
 */
export const succeedAiJobCancel = (state, response) => {
  const status = response?.status || state.status;

  return {
    ...state,
    status,
    cancelRequested: response?.cancelRequested ?? state.cancelRequested,
    isCancelling: false
  };
};

/**
 * The cancel request failed.
 *
 * The state is preserved: the job may still be running, and the
 * administrator must be able to try again.
 *
 * @param {object} state
 * @param {{ status: number, message: string }} error
 * @returns {object} The next state.
 */
export const failAiJobCancel = (state, error) => ({
  ...state,
  isCancelling: false,
  error: error || null
});

/* ── Retry ───────────────────────────────────────────────────────────────── */

/**
 * A manual retry created a replacement job.
 *
 * A retry never revives the old row: the backend creates a **new** job
 * with a fresh id that points back at the one it replaces. The client
 * therefore tracks the new id, and the old job's history stays
 * readable.
 *
 * @param {object} state
 * @param {object} job The replacement job.
 * @returns {object} The next state.
 */
export const succeedAiJobRetry = (state, job) => ({
  ...state,
  ...projectAiJobMetadata(job),
  status: job?.status || AI_JOB_STATUSES.Queued,
  stage: job?.stage ?? null,
  progressMessage: job?.progressMessage ?? '',
  attemptCount: Number(job?.attemptCount) || 0,
  cancelRequested: job?.cancelRequested === true,
  nextAttemptAt: job?.nextAttemptAt ?? null,
  error: null,
  errorCode: job?.errorCode ?? null,
  errorMessage: job?.errorMessage ?? null,
  // The replacement is a different job: the old job's draft does not
  // carry over.
  translation: job?.translation ?? null,
  editedDraft: typeof job?.editedDraft === 'string' && job.editedDraft.length > 0
    ? job.editedDraft
    : readAiJobTranslationText(job?.translation),
  editedDraftDirty: false,
  draftSaveState: AI_DRAFT_SAVE_STATES.Idle,
  isSubmitting: false,
  isCancelling: false
});

/**
 * The manual retry failed.
 *
 * The failed job's state is preserved, including its draft and the
 * administrator's edits.
 *
 * @param {object} state
 * @param {{ status: number, message: string }} error
 * @returns {object} The next state.
 */
export const failAiJobRetry = (state, error) => ({
  ...state,
  isSubmitting: false,
  error: error || null
});

/* ── The draft ───────────────────────────────────────────────────────────── */

/**
 * The administrator edited the draft.
 *
 * The edit lives in the job state, not in the product form, so editing
 * can never modify the form prematurely.
 *
 * @param {object} state
 * @param {string} text The edited text.
 * @returns {object} The next state.
 */
export const editAiJobDraft = (state, text) => ({
  ...state,
  editedDraft: typeof text === 'string' ? text : '',
  editedDraftDirty: true,
  draftSaveState: AI_DRAFT_SAVE_STATES.Idle
});

/**
 * A draft save was issued.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const startAiJobDraftSave = (state) => ({
  ...state,
  isSavingDraft: true,
  draftSaveState: AI_DRAFT_SAVE_STATES.Saving
});

/**
 * The draft was persisted.
 *
 * The dirty flag clears: the server now holds the administrator's text,
 * so a later REST refetch may safely replace the local copy.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const succeedAiJobDraftSave = (state) => ({
  ...state,
  isSavingDraft: false,
  editedDraftDirty: false,
  draftSaveState: AI_DRAFT_SAVE_STATES.Saved
});

/**
 * The draft save failed.
 *
 * The dirty flag **stays true** and the edited text is untouched: the
 * administrator's work is never silently discarded. The client retries
 * with a bounded backoff, and if the retries are exhausted the UI
 * shows a persistent warning.
 *
 * @param {object} state
 * @param {{ status: number, message: string }} [error]
 * @returns {object} The next state.
 */
export const failAiJobDraftSave = (state, error) => ({
  ...state,
  isSavingDraft: false,
  editedDraftDirty: true,
  draftSaveState: AI_DRAFT_SAVE_STATES.Error,
  error: error || null
});

/**
 * The administrator discarded the draft.
 *
 * Everything about the *draft* is cleared. The **job identity is
 * preserved**: the job still exists, still has a status, and the
 * administrator must still be able to cancel it or retry it.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const discardAiJob = (state) => ({
  ...state,
  translation: null,
  editedDraft: '',
  editedDraftDirty: false,
  draftSaveState: AI_DRAFT_SAVE_STATES.Idle,
  error: null
});

/**
 * The job's applicability was invalidated.
 *
 * This is what a product-name change or a Steam-selection change does:
 * the job was generated for a *different* product description, so its
 * result no longer describes this product.
 *
 * The translation is cleared, because it describes the previous name.
 * The **unsaved local text is preserved** when there is any: the
 * administrator's edits are real work, and a rename is never a reason
 * to throw them away silently. The draft stays dirty, so the auto-save
 * continues to drive it towards the server.
 *
 * The job's **identity and status are preserved**: the job still exists
 * on the backend, it may still be running, and it may still have to be
 * cancelled.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const invalidateAiJobApplicability = (state) => {
  const next = {
    ...state,
    translation: null,
    error: null
  };

  if (!state.editedDraftDirty) {
    next.editedDraft = '';
    next.draftSaveState = AI_DRAFT_SAVE_STATES.Idle;
  }

  return next;
};

/* ── Error classification ────────────────────────────────────────────────── */

/**
 * Map an HTTP status onto a message the administrator can act on.
 *
 * The backend already sanitises its own error bodies, so the backend's
 * `message` is preferred when present. The fallbacks below cover the
 * cases where the body was empty or carried no message.
 *
 * The statuses follow the S3 contract:
 *
 *   400 invalid request
 *   401 the admin's session expired
 *   403 the caller is not an Admin
 *   404 the job does not exist, or does not belong to this Admin
 *   409 the Admin already has an active job, or the job is not eligible
 *   413 the request exceeded the upstream size limit
 *   422 the request was rejected as invalid
 *   429 the upstream is rate-limiting
 *   500 the server hit an unexpected problem
 *   502 the upstream service failed
 *   503 the feature is disabled or unconfigured
 *   504 the upstream timed out
 *
 * @param {number} status
 * @param {string} fallbackMessage
 * @returns {string}
 */
export const describeAiJobError = (status, fallbackMessage) => {
  switch (status) {
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

/**
 * The message shown when a cancellation has been requested but the
 * backend has not yet confirmed a terminal cancellation.
 *
 * The wording is deliberate: the upstream request is **still being
 * awaited**. It must never imply that the inference has already
 * stopped, because it has not.
 *
 * @returns {string}
 */
export const AI_JOB_CANCEL_REQUESTED_MESSAGE =
  'Cancellation requested. Waiting for the current AI request to finish before the job is marked cancelled.';
