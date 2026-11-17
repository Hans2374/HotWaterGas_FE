import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  AI_DRAFT_SAVE_STATES,
  AI_JOB_CANCEL_REQUESTED_MESSAGE,
  AI_JOB_STATUSES,
  applyJobNotification,
  aiJobElapsedMs,
  canRetryAiJob,
  canSaveAiJobDraft,
  canSubmitAiJob,
  createAiJobState,
  describeAiJobError,
  discardAiJob,
  editAiJobDraft,
  failAiJobCancel,
  failAiJobDraftSave,
  failAiJobFetch,
  failAiJobRetry,
  failAiJobSubmission,
  hasActiveAiJob,
  invalidateAiJobApplicability,
  isActiveAiJobStatus,
  isAwaitingAiJobRetry,
  isTerminalAiJob,
  isTerminalAiJobStatus,
  readAiJobTranslationText,
  startAiJobCancel,
  startAiJobDraftSave,
  startAiJobRestore,
  startAiJobSubmission,
  succeedAiJobCancel,
  succeedAiJobDraftSave,
  succeedAiJobFetch,
  succeedAiJobRetry,
  succeedAiJobSubmission
} from '../src/utils/aiJobState.js';

/**
 * Offline tests for the asynchronous AI generation job lifecycle.
 *
 * Run with:
 *   node --test tests/
 *
 * The lifecycle rules live in `utils/aiJobState.js` as pure functions,
 * so every rule is verifiable without a DOM, a bundler or a network.
 */

/* ── Fixtures ──────────────────────────────────────────────────────────── */

/** A representative translation result, matching the backend's shape. */
const translation = {
  schemaVersion: '3',
  description: { text: 'Aurora Echo là một trò chơi phiêu lưu.', language: 'vi', wordCount: 6 },
  platforms: { values: ['Windows', 'macOS'] },
  releaseDate: { value: '2024-01-15' },
  systemRequirements: { minimum: { os: { value: 'Windows 10' } }, recommended: {} }
};

/**
 * Build a job payload, as the backend's `AiGenerationJobResponse`
 * returns it after camel-casing.
 *
 * @param {object} overrides
 * @returns {object}
 */
const job = (overrides = {}) => ({
  id: '11111111-1111-1111-1111-111111111111',
  operationType: 'Create',
  steamAppId: 620,
  productId: null,
  productName: 'Aurora Echo',
  status: 'Queued',
  stage: null,
  progressMessage: null,
  attemptCount: 0,
  cancelRequested: false,
  createdAt: '2024-01-16T10:00:00Z',
  startedAt: null,
  updatedAt: '2024-01-16T10:00:00Z',
  completedAt: null,
  nextAttemptAt: null,
  errorCode: null,
  errorMessage: null,
  editedDraft: null,
  translation: null,
  ...overrides
});

/* ── The initial state ─────────────────────────────────────────────────── */

test('the initial state is empty', () => {
  const state = createAiJobState();

  assert.equal(state.jobId, null, 'no job');
  assert.equal(state.status, null, 'no status');
  assert.equal(state.translation, null, 'no translation');
  assert.equal(state.editedDraft, '', 'no draft');
  assert.equal(state.editedDraftDirty, false, 'the draft is not dirty');
  assert.equal(state.isSubmitting, false, 'nothing is being submitted');
  assert.equal(state.error, null, 'no error');
});

/* ── Submission ────────────────────────────────────────────────────────── */

test('a submission in flight is marked as submitting', () => {
  const state = startAiJobSubmission(createAiJobState());

  assert.equal(state.isSubmitting, true, 'the submission is in flight');
  assert.equal(state.error, null, 'the previous error is cleared');
});

test('a created job is queued and tracked', () => {
  const state = succeedAiJobSubmission(createAiJobState(), job());

  assert.equal(state.jobId, '11111111-1111-1111-1111-111111111111', 'the job id is tracked');
  assert.equal(state.status, AI_JOB_STATUSES.Queued, 'the job is queued');
  assert.equal(state.isSubmitting, false, 'the submission finished');
  assert.equal(state.error, null, 'there is no error');
});

test('a failed submission preserves the draft and the edits', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');
  state = failAiJobSubmission(state, { status: 500, message: 'Boom.' });

  assert.equal(state.editedDraft, 'Bản dịch đã sửa.', 'the edit survives the failure');
  assert.equal(state.editedDraftDirty, true, 'the draft is still dirty');
  assert.equal(state.error.status, 500, 'the error is shown');
});

/* ── Legal and illegal transitions ─────────────────────────────────────── */

test('an active status is one of the two active statuses', () => {
  assert.equal(isActiveAiJobStatus(AI_JOB_STATUSES.Queued), true, 'Queued is active');
  assert.equal(isActiveAiJobStatus(AI_JOB_STATUSES.Processing), true, 'Processing is active');
  assert.equal(isActiveAiJobStatus(AI_JOB_STATUSES.Completed), false, 'Completed is not active');
  assert.equal(isActiveAiJobStatus(AI_JOB_STATUSES.Cancelled), false, 'Cancelled is not active');
});

test('a terminal status is one of the three terminal statuses', () => {
  assert.equal(isTerminalAiJobStatus(AI_JOB_STATUSES.Completed), true, 'Completed is terminal');
  assert.equal(isTerminalAiJobStatus(AI_JOB_STATUSES.Failed), true, 'Failed is terminal');
  assert.equal(isTerminalAiJobStatus(AI_JOB_STATUSES.Cancelled), true, 'Cancelled is terminal');
  assert.equal(isTerminalAiJobStatus(AI_JOB_STATUSES.Queued), false, 'Queued is not terminal');
});

test('an active job is detected', () => {
  assert.equal(hasActiveAiJob(succeedAiJobSubmission(createAiJobState(), job())), true,
    'a queued job is active');
  assert.equal(hasActiveAiJob(createAiJobState()), false, 'no job is not active');
});

test('a terminal job is detected', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({ status: 'Failed' }));

  assert.equal(isTerminalAiJob(state), true, 'a failed job is terminal');
});

test('a terminal job never returns to an active state', () => {
  // The backend owns the state machine, and it never reactivates a
  // terminal job. A stale response must not resurrect one.
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = succeedAiJobFetch(state, job({ status: 'Processing' }));

  assert.equal(state.status, AI_JOB_STATUSES.Completed, 'the terminal status survives');
});

test('a failed job never returns to an active state', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Failed' }));
  state = succeedAiJobFetch(state, job({ status: 'Queued' }));

  assert.equal(state.status, AI_JOB_STATUSES.Failed, 'the failure survives');
});

/* ── Submission guards ─────────────────────────────────────────────────── */

test('no new job may be submitted while one is active', () => {
  const state = succeedAiJobSubmission(createAiJobState(), job());

  assert.equal(canSubmitAiJob(state), false, 'an active job blocks a new submission');
});

test('a new job may be submitted once the previous one is terminal', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed' }));

  assert.equal(canSubmitAiJob(state), true, 'a terminal job frees the slot');
});

test('a cancellation awaiting confirmation blocks a new job', () => {
  // A cancel-requested processing job still holds the upstream request,
  // so the backend's one-active-job slot is still taken.
  const state = succeedAiJobCancel(
    succeedAiJobSubmission(createAiJobState(), job({ status: 'Processing' })),
    { status: 'Processing', cancelRequested: true }
  );

  assert.equal(state.cancelRequested, true, 'the cancellation is requested');
  assert.equal(canSubmitAiJob(state), false,
    'the Generate control stays disabled until the cancellation is terminal');
});

test('a retry is offered only for a terminal job', () => {
  const queued = succeedAiJobSubmission(createAiJobState(), job());
  const completed = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed' }));

  assert.equal(canRetryAiJob(queued), false, 'a queued job cannot be retried');
  assert.equal(canRetryAiJob(completed), true, 'a completed job can be retried');
});

/* ── Cancellation ──────────────────────────────────────────────────────── */

test('a cancel request is marked as in flight', () => {
  const state = startAiJobCancel(createAiJobState());

  assert.equal(state.isCancelling, true, 'the cancellation is in flight');
});

test('cancelling a queued job makes it terminal immediately', () => {
  const state = succeedAiJobCancel(
    succeedAiJobSubmission(createAiJobState(), job({ status: 'Queued' })),
    { status: 'Cancelled', cancelRequested: true }
  );

  assert.equal(state.status, AI_JOB_STATUSES.Cancelled, 'the job is cancelled');
  assert.equal(state.isCancelling, false, 'the request finished');
});

test('cancelling a processing job does not claim a terminal cancellation', () => {
  // The upstream request is still in flight. The client must not
  // pretend the job has stopped.
  const state = succeedAiJobCancel(
    succeedAiJobSubmission(createAiJobState(), job({ status: 'Processing' })),
    { status: 'Processing', cancelRequested: true }
  );

  assert.equal(state.status, AI_JOB_STATUSES.Processing, 'the job is still processing');
  assert.equal(state.cancelRequested, true, 'the cancellation is requested');
});

test('the cancellation wording says the upstream request is still awaited', () => {
  assert.match(AI_JOB_CANCEL_REQUESTED_MESSAGE, /still|Waiting/i,
    'the wording does not claim the work has stopped');
  assert.ok(!/stopped|has stopped|cancelled already/i.test(AI_JOB_CANCEL_REQUESTED_MESSAGE),
    'the wording never claims the work has already stopped');
});

test('a failed cancellation preserves the job state', () => {
  let state = succeedAiJobSubmission(createAiJobState(), job({ status: 'Processing' }));
  state = failAiJobCancel(state, { status: 500, message: 'Boom.' });

  assert.equal(state.status, AI_JOB_STATUSES.Processing, 'the job is still tracked');
  assert.equal(state.isCancelling, false, 'the request finished');
  assert.equal(state.error.status, 500, 'the error is shown');
});

/* ── Retry ─────────────────────────────────────────────────────────────── */

test('a retry tracks the new job id and clears the old draft', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Failed' }));
  state = succeedAiJobRetry(state, job({ id: '22222222-2222-2222-2222-222222222222', status: 'Queued' }));

  assert.equal(state.jobId, '22222222-2222-2222-2222-222222222222',
    'the new job id is tracked');
  assert.equal(state.status, AI_JOB_STATUSES.Queued, 'the replacement is queued');
  assert.equal(state.editedDraftDirty, false, 'the old draft is not carried over');
  assert.equal(state.error, null, 'the failure is cleared');
});

test('a failed retry preserves the failed job and its draft', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Failed' }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');
  state = failAiJobRetry(state, { status: 409, message: 'You already have a job.' });

  assert.equal(state.status, AI_JOB_STATUSES.Failed, 'the failed job is still tracked');
  assert.equal(state.editedDraft, 'Bản dịch đã sửa.', 'the edit survives');
  assert.equal(state.error.status, 409, 'the error is shown');
});

/* ── Notifications ─────────────────────────────────────────────────────── */

test('a notification advances the status and the stage', () => {
  const state = applyJobNotification(createAiJobState(), {
    jobId: '11111111-1111-1111-1111-111111111111',
    status: 'Processing',
    stage: 'FetchingData',
    attemptCount: 1,
    progressMessage: 'Retrieving the Steam store description.'
  });

  assert.equal(state.status, 'Processing', 'the status advances');
  assert.equal(state.stage, 'FetchingData', 'the stage advances');
  assert.equal(state.attemptCount, 1, 'the attempt count advances');
  assert.equal(state.progressMessage, 'Retrieving the Steam store description.',
    'the backend message is carried verbatim');
});

test('a notification never touches the draft', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');

  const notified = applyJobNotification(state, { jobId: state.jobId, status: 'Completed' });

  assert.equal(notified.editedDraft, 'Bản dịch đã sửa.', 'the draft survives');
  assert.equal(notified.editedDraftDirty, true, 'the dirty flag survives');
});

test('a notification for another job is ignored', () => {
  const state = succeedAiJobSubmission(createAiJobState(), job());
  const notified = applyJobNotification(state, { jobId: '33333333-3333-3333-3333-333333333333', status: 'Failed' });

  assert.equal(notified.status, AI_JOB_STATUSES.Queued, 'the tracked job is unchanged');
});

/* ── REST reconciliation ───────────────────────────────────────────────── */

test('a REST fetch advances the state and installs the translation', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));

  assert.equal(state.status, AI_JOB_STATUSES.Completed, 'the status is applied');
  assert.equal(state.translation, translation, 'the translation is installed');
  assert.equal(state.editedDraft, translation.description.text,
    'the generated text is the working copy');
  assert.equal(state.editedDraftDirty, false, 'the generated text is not an unsaved edit');
});

test('a REST refetch never overwrites a dirty draft', () => {
  // The server's copy of the draft does not contain the administrator's
  // unsaved edits, so a refetch must not replace them.
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');

  const refetched = succeedAiJobFetch(state, job({
    status: 'Completed',
    translation,
    editedDraft: 'Bản dịch trên máy chủ.'
  }));

  assert.equal(refetched.editedDraft, 'Bản dịch đã sửa.',
    'the local edit survives the refetch');
  assert.equal(refetched.editedDraftDirty, true, 'the draft is still dirty');
});

test('a REST refetch replaces a clean draft with the server copy', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  const refetched = succeedAiJobFetch(state, job({
    status: 'Completed',
    translation,
    editedDraft: 'Bản dịch đã lưu.'
  }));

  assert.equal(refetched.editedDraft, 'Bản dịch đã lưu.', 'the server copy is applied');
  assert.equal(refetched.editedDraftDirty, false, 'the draft is clean');
  assert.equal(refetched.draftSaveState, AI_DRAFT_SAVE_STATES.Saved,
    'a persisted draft reads as saved');
});

test('a failed fetch preserves the draft, the edits and the status', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');
  state = failAiJobFetch(state, { status: 503, message: 'Unavailable.' });

  assert.equal(state.editedDraft, 'Bản dịch đã sửa.', 'the edit survives');
  assert.equal(state.editedDraftDirty, true, 'the draft is still dirty');
  assert.equal(state.status, AI_JOB_STATUSES.Completed, 'the status survives');
  assert.equal(state.error.status, 503, 'the error is shown');
});

test('a restoration is marked as in flight', () => {
  const state = startAiJobRestore(createAiJobState());

  assert.equal(state.isRestoring, true, 'the restoration is in flight');
});

/* ── The draft ─────────────────────────────────────────────────────────── */

test('an edit marks the draft dirty and never touches the translation', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');

  assert.equal(state.editedDraft, 'Bản dịch đã sửa.', 'the edit is stored');
  assert.equal(state.editedDraftDirty, true, 'the draft is dirty');
  assert.equal(state.translation, translation, 'the translation is kept');
});

test('a successful save clears the dirty flag', () => {
  let state = editAiJobDraft(createAiJobState(), 'Bản dịch đã sửa.');
  state = startAiJobDraftSave(state);
  state = succeedAiJobDraftSave(state);

  assert.equal(state.editedDraftDirty, false, 'the draft is clean');
  assert.equal(state.isSavingDraft, false, 'the save finished');
  assert.equal(state.draftSaveState, AI_DRAFT_SAVE_STATES.Saved, 'the save state is saved');
});

test('a failed save leaves the text dirty and intact', () => {
  let state = editAiJobDraft(createAiJobState(), 'Bản dịch đã sửa.');
  state = startAiJobDraftSave(state);
  state = failAiJobDraftSave(state, { status: 500, message: 'Boom.' });

  assert.equal(state.editedDraft, 'Bản dịch đã sửa.', 'the text is intact');
  assert.equal(state.editedDraftDirty, true, 'the draft is still dirty');
  assert.equal(state.isSavingDraft, false, 'the save finished');
  assert.equal(state.draftSaveState, AI_DRAFT_SAVE_STATES.Error, 'the save state is an error');
});

test('a draft may only be saved for a completed job', () => {
  const queued = succeedAiJobSubmission(createAiJobState(), job());
  const completed = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed' }));

  assert.equal(canSaveAiJobDraft(queued), false, 'a queued job has no draft to save');
  assert.equal(canSaveAiJobDraft(completed), true, 'a completed job has a draft to save');
});

test('discarding clears the draft but keeps the job identity', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');
  state = discardAiJob(state);

  assert.equal(state.editedDraft, '', 'the draft is gone');
  assert.equal(state.editedDraftDirty, false, 'the draft is clean');
  assert.equal(state.translation, null, 'the translation is gone');
  assert.equal(state.jobId, '11111111-1111-1111-1111-111111111111', 'the job is still tracked');
  assert.equal(state.status, AI_JOB_STATUSES.Completed, 'the status is still tracked');
});

/* ── Applicability ─────────────────────────────────────────────────────── */

test('invalidating the applicability clears the translation but keeps the job', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = invalidateAiJobApplicability(state);

  assert.equal(state.translation, null, 'the translation no longer applies');
  assert.equal(state.jobId, '11111111-1111-1111-1111-111111111111', 'the job is still tracked');
  assert.equal(state.status, AI_JOB_STATUSES.Completed, 'the status is still tracked');
});

test('invalidating the applicability preserves unsaved edits', () => {
  let state = succeedAiJobFetch(createAiJobState(), job({ status: 'Completed', translation }));
  state = editAiJobDraft(state, 'Bản dịch đã sửa.');
  state = invalidateAiJobApplicability(state);

  assert.equal(state.editedDraft, 'Bản dịch đã sửa.', 'the edit survives');
  assert.equal(state.editedDraftDirty, true, 'the draft is still dirty');
});

/* ── The waiting-for-a-retry state ─────────────────────────────────────── */

test('a queued job with attempts and a next attempt is waiting for a retry', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({
    status: 'Queued',
    attemptCount: 2,
    nextAttemptAt: '2024-01-16T10:05:00Z'
  }));

  assert.equal(isAwaitingAiJobRetry(state), true, 'the job is waiting for a retry');
});

test('a never-attempted queued job is not waiting for a retry', () => {
  const state = succeedAiJobSubmission(createAiJobState(), job());

  assert.equal(isAwaitingAiJobRetry(state), false, 'it has never been attempted');
});

/* ── The elapsed time ──────────────────────────────────────────────────── */

test('the elapsed time is derived from the backend timestamps', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({
    status: 'Completed',
    startedAt: '2024-01-16T10:00:00Z',
    completedAt: '2024-01-16T10:00:30Z'
  }));

  assert.equal(aiJobElapsedMs(state), 30000, 'the elapsed time is the backend duration');
});

test('a running job reports the elapsed time so far', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({
    status: 'Processing',
    startedAt: '2024-01-16T10:00:00Z'
  }));

  assert.equal(
    aiJobElapsedMs(state, Date.parse('2024-01-16T10:00:10Z')),
    10000,
    'the elapsed time is measured against the current time'
  );
});

test('an unknown start time yields no elapsed time rather than a fabricated one', () => {
  const state = succeedAiJobFetch(createAiJobState(), job({ status: 'Processing' }));

  assert.equal(aiJobElapsedMs(state), null, 'no elapsed time is invented');
});

/* ── Reading the translation text ──────────────────────────────────────── */

test('the translated text is read from the nested field', () => {
  assert.equal(readAiJobTranslationText(translation), translation.description.text,
    'the text comes from description.text');
  assert.equal(readAiJobTranslationText(null), '', 'an absent translation yields empty text');
  assert.equal(readAiJobTranslationText({}), '', 'a malformed translation yields empty text');
});

/* ── Error classification ─────────────────────────────────────────────── */

test('the HTTP statuses map onto actionable messages', () => {
  assert.match(describeAiJobError(400, ''), /rejected/i, '400 is an invalid request');
  assert.match(describeAiJobError(401, ''), /session/i, '401 is an authentication failure');
  assert.match(describeAiJobError(403, ''), /permission/i, '403 is an authorization failure');
  assert.match(describeAiJobError(404, ''), /could not be found/i, '404 is a missing job');
  assert.match(describeAiJobError(409, ''), /already have|progress/i, '409 is a conflict');
  assert.match(describeAiJobError(413, ''), /too large/i, '413 is a size error');
  assert.match(describeAiJobError(422, ''), /invalid/i, '422 is an invalid request');
  assert.match(describeAiJobError(429, ''), /busy/i, '429 is rate-limited');
  assert.match(describeAiJobError(500, ''), /unexpected problem/i, '500 is a server problem');
  assert.match(describeAiJobError(502, ''), /could not be reached|try again/i, '502 is an upstream failure');
  assert.match(describeAiJobError(503, ''), /unavailable|disabled/i, '503 is unavailable');
  assert.match(describeAiJobError(504, ''), /too long|try again/i, '504 is a retryable timeout');
  assert.match(describeAiJobError(0, ''), /network/i, 'a network failure is reported');
});

test('a backend message is preferred over the fallback', () => {
  assert.equal(
    describeAiJobError(409, 'You already have a description generation in progress.'),
    'You already have a description generation in progress.',
    'the backend message is shown'
  );
});
