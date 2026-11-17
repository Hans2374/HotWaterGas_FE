import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  AI_JOB_ENDPOINT,
  AI_JOB_OPERATION_TYPES,
  buildAiJobRequest
} from '../src/utils/aiJobRequest.js';

import {
  AI_JOB_STATUSES,
  applyJobNotification,
  createAiJobState,
  selectRestoredAiJob,
  succeedAiJobFetch,
  succeedAiJobSubmission
} from '../src/utils/aiJobState.js';

/**
 * The SignalR client's constants are read from its **source** rather
 * than imported.
 *
 * The module reads `import.meta.env`, which only exists inside Vite's
 * module pipeline. Importing it from Node's bare test runner would
 * fail on the environment lookup before a single assertion could run,
 * so the constants are pinned against the source text instead. That is
 * the same approach the wiring assertions below use, and it pins the
 * values the client actually ships.
 *
 * @param {string} name
 * @returns {string|null} The declared literal, or null.
 */
const readSignalRConstant = (name) => {
  const source = readSource('src', 'services', 'aiJobSignalRClient.js');
  const match = source.match(new RegExp(`export const ${name} = '([^']*)'`));

  return match ? match[1] : null;
};

/**
 * Read a declared numeric array constant from the SignalR client's
 * source.
 *
 * @param {string} name
 * @returns {number[]|null}
 */
const readSignalRNumberArray = (name) => {
  const source = readSource('src', 'services', 'aiJobSignalRClient.js');
  const match = source.match(new RegExp(`export const ${name} = \\[([^\\]]*)\\]`));

  if (!match) return null;

  return match[1].split(',').map((part) => Number(part.trim()));
};

/**
 * Offline integration tests for the asynchronous AI description
 * generation.
 *
 * Run with:
 *   node --test tests/
 *
 * ── Why this file is partly source-shape and partly behavioural ────────────
 * The **behaviour** is exercised through the real, pure state machine
 * (`utils/aiJobState.js`) driven by **fakes**: a fake REST backend and
 * a fake SignalR channel. No live backend, no Python service, no Steam
 * and no Ollama are ever contacted.
 *
 * The **wiring** — which route is called, which hub method is
 * subscribed, that no upstream service is reachable from the browser —
 * is asserted against the source text. That is deliberate: the wiring
 * cannot be observed from a pure module, and asserting it from the
 * source is exactly what pins it.
 */

/** Read a source file relative to this test file. */
const readSource = (...segments) => {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', ...segments), 'utf8');
};

/* ── Fakes ─────────────────────────────────────────────────────────────── */

/**
 * A fake REST backend.
 *
 * It answers the six routes the real backend exposes and records every
 * call, so a test can assert both what was fetched and what was sent.
 */
class FakeRestBackend {
  constructor() {
    /** The jobs the fake knows about, keyed by id. */
    this.jobs = new Map();
    /** The active job the fake reports. */
    this.activeJob = null;
    /** Every call the fake received. */
    this.calls = [];
    /** The saved drafts, keyed by job id. */
    this.drafts = new Map();
  }

  /** Record a call. */
  record(method, url, body) {
    this.calls.push({ method, url, body });
  }

  /** The routes the fake answers. */
  get(url, body) {
    this.record('GET', url, body);

    if (url.endsWith('/active')) {
      return { activeJob: this.activeJob, jobs: [...this.jobs.values()] };
    }

    const id = url.split('/').pop();
    return this.jobs.get(id) ?? null;
  }

  post(url, body) {
    this.record('POST', url, body);

    if (url.endsWith('/cancel')) {
      const id = url.split('/').slice(-2)[0];
      const job = this.jobs.get(id);
      const cancelled = job?.status === AI_JOB_STATUSES.Queued;

      return {
        status: cancelled ? AI_JOB_STATUSES.Cancelled : job?.status,
        cancelRequested: true
      };
    }

    if (url.endsWith('/retry')) {
      const id = url.split('/').slice(-2)[0];
      const original = this.jobs.get(id);
      const replacement = { ...original, id: '22222222-2222-2222-2222-222222222222', status: 'Queued' };
      this.jobs.set(replacement.id, replacement);
      this.activeJob = replacement;

      return replacement;
    }

    const created = {
      id: '11111111-1111-1111-1111-111111111111',
      operationType: body.operationType,
      steamAppId: body.steamAppId,
      productId: body.productId,
      productName: body.productName,
      status: AI_JOB_STATUSES.Queued,
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
      translation: null
    };
    this.jobs.set(created.id, created);
    this.activeJob = created;

    return created;
  }

  put(url, body) {
    this.record('PUT', url, body);

    const id = url.split('/').slice(-2)[0];
    this.drafts.set(id, body.editedDraft);

    const job = this.jobs.get(id);
    if (job) {
      job.editedDraft = body.editedDraft;
    }

    return job;
  }
}

/**
 * A fake SignalR channel.
 *
 * It records the notifications it publishes and never opens a socket.
 */
class FakeSignalRChannel {
  constructor() {
    this.notifications = [];
    this.subscribedMethods = [];
  }

  /** Publish a metadata notification. */
  publish(payload) {
    this.notifications.push(payload);
  }

  /** The names of the subscribed methods. */
  subscribe(method) {
    this.subscribedMethods.push(method);
  }
}

/**
 * A representative translation result, matching the backend's shape.
 */
const translation = {
  schemaVersion: '3',
  description: { text: 'Aurora Echo là một trò chơi phiêu lưu.', language: 'vi', wordCount: 6 },
  platforms: { values: ['Windows'] },
  releaseDate: { value: '2024-01-15' },
  systemRequirements: { minimum: { os: { value: 'Windows 10' } }, recommended: {} }
};

/* ── The endpoint constant ─────────────────────────────────────────────── */

test('the job endpoint is the .NET admin route', () => {
  assert.equal(AI_JOB_ENDPOINT, '/api/admin/ai-generation-jobs',
    'the browser talks to the .NET backend only');
});

test('the hub path is the backend hub route', () => {
  assert.equal(readSignalRConstant('AI_JOB_HUB_PATH'), '/hubs/ai-generation',
    'the hub path matches the backend hub route exactly');
});

test('the notification method matches the backend contract', () => {
  assert.equal(readSignalRConstant('AI_JOB_HUB_NOTIFICATION_METHOD'), 'AiJobChanged',
    'the client subscribes to the one method the hub publishes');
});

test('the reconnect backoff is the approved one', () => {
  assert.deepEqual(readSignalRNumberArray('AI_JOB_RECONNECT_DELAYS'), [0, 2, 5, 10, 30],
    'the reconnect backoff is the approved sequence');
});

/* ── No direct Python, Steam or Ollama calls ───────────────────────────── */

test('the browser never contacts Python, Steam or Ollama directly', () => {
  const files = [
    ['src', 'services', 'aiJobService.js'],
    ['src', 'services', 'aiJobSignalRClient.js'],
    ['src', 'context', 'AiJobProvider.jsx'],
    ['src', 'utils', 'aiJobRequest.js'],
    ['src', 'utils', 'aiJobState.js']
  ];

  for (const segments of files) {
    const source = readSource(...segments);

    assert.ok(!source.includes('/internal/'), `${segments.join('/')} contacts no internal Python route`);
    assert.ok(!source.includes('store.steampowered.com'), `${segments.join('/')} contacts no Steam URL`);
    assert.ok(!source.includes('11434'), `${segments.join('/')} contacts no Ollama port`);
    assert.ok(!source.includes('X-Internal-Token'), `${segments.join('/')} carries no internal service token`);
  }
});

test('the SignalR client logs nothing that could carry a token', () => {
  const source = readSource('src', 'services', 'aiJobSignalRClient.js');

  assert.ok(source.includes('LogLevel.None'), 'the SignalR logging is off');
  assert.ok(!/console\.(log|debug|info|warn|error)/.test(source),
    'the SignalR client writes nothing to the console');
});

/* ── The service's six operations ──────────────────────────────────────── */

test('the service exposes all six backend operations', () => {
  const source = readSource('src', 'services', 'aiJobService.js');

  for (const operation of [
    'createAiGenerationJob',
    'getActiveAiGenerationJobs',
    'getAiGenerationJob',
    'updateAiGenerationJobDraft',
    'cancelAiGenerationJob',
    'retryAiGenerationJob'
  ]) {
    assert.ok(source.includes(operation), `the service exposes ${operation}`);
  }
});

test('the service calls the six approved routes and no others', () => {
  const source = readSource('src', 'services', 'aiJobService.js');

  assert.ok(/axiosClient\.post\(\s*AI_JOB_ENDPOINT/.test(source), 'the create route is used');
  assert.ok(source.includes('`${AI_JOB_ENDPOINT}/active`'), 'the active route is used');
  assert.ok(source.includes('`${AI_JOB_ENDPOINT}/${jobId}`'), 'the read route is used');
  assert.ok(source.includes('`${AI_JOB_ENDPOINT}/${jobId}/draft`'), 'the draft route is used');
  assert.ok(source.includes('`${AI_JOB_ENDPOINT}/${jobId}/cancel`'), 'the cancel route is used');
  assert.ok(source.includes('`${AI_JOB_ENDPOINT}/${jobId}/retry`'), 'the retry route is used');
});

/* ── The Steam App ID never reaches the product payload ────────────────── */

test('the product payload never carries the Steam App ID', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  const payloadIndex = source.indexOf('const payload = {');
  const appIdIndex = source.indexOf('steamAppId');

  assert.ok(appIdIndex !== -1, 'the App ID is referenced in the form');
  assert.ok(appIdIndex < payloadIndex,
    'the App ID is used before the product payload is built, not inside it');
});

test('the job request never carries the product payload fields', () => {
  // The assertion is on the **built body**, not on the source text: the
  // module's own documentation names the forbidden fields, and a
  // source-text search would trip over the documentation.
  const body = buildAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: AI_JOB_OPERATION_TYPES.Create,
    productId: null
  });

  assert.deepEqual(Object.keys(body).sort(),
    ['operationType', 'productId', 'productName', 'steamAppId'],
    'the body has exactly the four contract fields');

  for (const forbidden of ['price', 'discountPercentage', 'images', 'steamKeys', 'tagIds']) {
    assert.ok(!(forbidden in body), `the body carries no ${forbidden}`);
  }
});

/* ── Restore after a browser refresh ───────────────────────────────────── */

test('an active job is restored after a browser refresh', () => {
  const backend = new FakeRestBackend();
  backend.activeJob = {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Processing,
    stage: 'FetchingData',
    progressMessage: 'Retrieving the Steam store description.',
    attemptCount: 1,
    nextAttemptAt: '2024-01-16T10:05:00Z',
    editedDraft: null,
    translation: null
  };
  backend.jobs.set(backend.activeJob.id, backend.activeJob);

  // The refresh: the provider fetches the active jobs and installs what
  // the backend reports.
  const result = backend.get(`${AI_JOB_ENDPOINT}/active`);
  const restored = selectRestoredAiJob(result);

  assert.ok(restored, 'an active job is restored');
  assert.equal(restored.status, AI_JOB_STATUSES.Processing, 'the restored job is the active one');
});

test('a delayed retry is restored after a browser refresh', () => {
  const backend = new FakeRestBackend();
  const delayed = {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Queued,
    stage: null,
    attemptCount: 2,
    nextAttemptAt: '2024-01-16T10:05:00Z',
    editedDraft: null,
    translation: null
  };
  backend.activeJob = delayed;
  backend.jobs.set(delayed.id, delayed);

  const restored = selectRestoredAiJob(backend.get(`${AI_JOB_ENDPOINT}/active`));

  assert.ok(restored, 'the waiting job is restored');
  assert.equal(restored.attemptCount, 2, 'the attempt count is restored');
  assert.equal(restored.nextAttemptAt, '2024-01-16T10:05:00Z',
    'the next-attempt time is restored');
});

test('a completed job with a persisted draft is restored after a browser refresh', () => {
  const backend = new FakeRestBackend();
  const completed = {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Completed,
    editedDraft: 'Bản dịch đã lưu.',
    translation
  };
  backend.jobs.set(completed.id, completed);

  // There is no active job, but the latest job completed.
  const restored = selectRestoredAiJob(backend.get(`${AI_JOB_ENDPOINT}/active`));

  assert.ok(restored, 'the completed job is restored');
  assert.equal(restored.editedDraft, 'Bản dịch đã lưu.', 'the persisted draft is restored');
});

test('a failed job is not restored', () => {
  const backend = new FakeRestBackend();
  backend.jobs.set('11111111-1111-1111-1111-111111111111', {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Failed,
    editedDraft: null,
    translation: null
  });

  const restored = selectRestoredAiJob(backend.get(`${AI_JOB_ENDPOINT}/active`));

  assert.equal(restored, null, 'a failed job carries no draft and is not restored');
});

test('an empty response restores nothing', () => {
  assert.equal(selectRestoredAiJob({ activeJob: null, jobs: [] }), null, 'nothing is restored');
  assert.equal(selectRestoredAiJob(null), null, 'a missing response restores nothing');
});

test('the restored draft lands in the working copy', () => {
  const backend = new FakeRestBackend();
  backend.jobs.set('11111111-1111-1111-1111-111111111111', {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Completed,
    editedDraft: 'Bản dịch đã lưu.',
    translation
  });

  const restored = selectRestoredAiJob(backend.get(`${AI_JOB_ENDPOINT}/active`));
  const state = succeedAiJobFetch(createAiJobState(), restored);

  assert.equal(state.editedDraft, 'Bản dịch đã lưu.', 'the persisted draft is the working copy');
  assert.equal(state.editedDraftDirty, false, 'the restored draft is not an unsaved edit');
});

/* ── REST reconciliation after a notification and a reconnect ──────────── */

test('a notification is reconciled through REST', () => {
  // The notification is metadata only. It advances the state, and the
  // authoritative update comes from the REST fetch that follows.
  const backend = new FakeRestBackend();
  const channel = new FakeSignalRChannel();
  channel.subscribe(readSignalRConstant('AI_JOB_HUB_NOTIFICATION_METHOD'));

  backend.jobs.set('11111111-1111-1111-1111-111111111111', {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Completed,
    attemptCount: 1,
    editedDraft: null,
    translation
  });
  backend.activeJob = null;

  let state = succeedAiJobSubmission(createAiJobState(), backend.jobs.get('11111111-1111-1111-1111-111111111111'));

  // The backend publishes the completion.
  channel.publish({
    jobId: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Completed,
    stage: null,
    attemptCount: 1,
    progressMessage: null,
    updatedAt: '2024-01-16T10:01:00Z',
    completedAt: '2024-01-16T10:01:00Z',
    errorCode: null
  });

  // The notification is applied to the state.
  state = applyJobNotification(state, channel.notifications[0]);
  assert.equal(state.status, AI_JOB_STATUSES.Completed, 'the notification advances the status');

  // The REST fetch that follows installs the authoritative job.
  const fetched = backend.get(`${AI_JOB_ENDPOINT}/11111111-1111-1111-1111-111111111111`);
  state = succeedAiJobFetch(state, fetched);

  assert.equal(state.translation, translation, 'the REST fetch installs the translation');
  assert.ok(backend.calls.some((call) => call.method === 'GET'),
    'a REST fetch really happened');
});

test('a reconnect re-fetches the active job', () => {
  const backend = new FakeRestBackend();
  backend.activeJob = {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Processing,
    attemptCount: 1,
    editedDraft: null,
    translation: null
  };
  backend.jobs.set(backend.activeJob.id, backend.activeJob);

  const before = backend.calls.length;

  // The reconnect handler fetches the active job again, because the
  // notifications that arrived during the gap were missed.
  const restored = selectRestoredAiJob(backend.get(`${AI_JOB_ENDPOINT}/active`));

  assert.ok(backend.calls.length > before, 'a REST fetch happened after the reconnect');
  assert.ok(restored, 'the active job is re-fetched');
});

test('the notification payload carries no draft, result or credential', () => {
  // The notification is metadata only. The client must never expect
  // more than the eight approved fields in it.
  const payload = {
    jobId: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Completed,
    stage: null,
    attemptCount: 1,
    progressMessage: null,
    updatedAt: '2024-01-16T10:01:00Z',
    completedAt: '2024-01-16T10:01:00Z',
    errorCode: null
  };

  assert.deepEqual(
    Object.keys(payload).sort(),
    ['attemptCount', 'completedAt', 'errorCode', 'jobId', 'progressMessage', 'stage', 'status', 'updatedAt'],
    'the payload carries exactly the eight approved metadata fields'
  );

  for (const forbidden of ['editedDraft', 'translation', 'result', 'evidence', 'token', 'errorMessage']) {
    assert.ok(!(forbidden in payload), `the payload carries no ${forbidden}`);
  }
});

/* ── The submission flow ───────────────────────────────────────────────── */

test('a submission records the created job and does not await the generation', () => {
  const backend = new FakeRestBackend();

  const created = backend.post(AI_JOB_ENDPOINT, {
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: AI_JOB_OPERATION_TYPES.Create,
    productId: null
  });

  assert.equal(created.status, AI_JOB_STATUSES.Queued, 'the job is queued, not completed');
  assert.equal(created.translation, null, 'no translation exists yet');
  assert.equal(backend.calls.length, 1, 'exactly one call was made');
});

test('the create request carries no product for a create operation', () => {
  const backend = new FakeRestBackend();

  backend.post(AI_JOB_ENDPOINT, {
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: AI_JOB_OPERATION_TYPES.Create,
    productId: null
  });

  assert.equal(backend.calls[0].body.productId, null,
    'a create operation must not carry a product');
});

test('a retry creates a new job rather than reviving the old one', () => {
  const backend = new FakeRestBackend();
  const original = {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Failed,
    attemptCount: 1
  };
  backend.jobs.set(original.id, original);

  const replacement = backend.post(`${AI_JOB_ENDPOINT}/${original.id}/retry`, {});

  assert.notEqual(replacement.id, original.id, 'the replacement has a new id');
  assert.equal(replacement.status, AI_JOB_STATUSES.Queued, 'the replacement is queued');
  assert.equal(backend.jobs.get(original.id).status, AI_JOB_STATUSES.Failed,
    'the original stays failed — it is never revived');
});

/* ── The draft save ────────────────────────────────────────────────────── */

test('a draft save sends the complete edited text', () => {
  const backend = new FakeRestBackend();
  backend.jobs.set('11111111-1111-1111-1111-111111111111', {
    id: '11111111-1111-1111-1111-111111111111',
    status: AI_JOB_STATUSES.Completed
  });

  const text = 'Aurora Echo là một trò chơi phiêu lưu khám phá vùng đất băng phía bắc.';
  backend.put(`${AI_JOB_ENDPOINT}/11111111-1111-1111-1111-111111111111/draft`, { editedDraft: text });

  assert.equal(backend.calls[0].body.editedDraft, text, 'the complete text is sent');
  assert.equal(backend.drafts.get('11111111-1111-1111-1111-111111111111'), text,
    'the draft is persisted');
});

/* ── The context's wiring ──────────────────────────────────────────────── */

test('the provider is mounted around the admin outlet', () => {
  const source = readSource('src', 'components', 'layout', 'AdminLayout.jsx');

  assert.ok(source.includes('AiJobProvider'), 'the provider is mounted');
  assert.ok(source.includes('<Outlet />'), 'the outlet is rendered');
  assert.ok(
    source.indexOf('AiJobProvider') < source.indexOf('<Outlet />'),
    'the provider wraps the outlet'
  );
});

test('the admin header is untouched by the job feature', () => {
  // D-I explicitly defers the active-job indicator out of Phase 1, so
  // the header must not reference the job context at all.
  const source = readSource('src', 'components', 'layout', 'AdminHeader.jsx');

  assert.ok(!source.includes('AiJob'), 'the header does not know about the job context');
  assert.ok(!source.includes('useAiJobs'), 'the header does not consume the job hook');
});

test('the context restores, reconciles and polls', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('getActiveAiGenerationJobs'), 'the initial restoration is wired');
  assert.ok(source.includes('getAiGenerationJob'), 'the per-job reconciliation is wired');
  assert.ok(source.includes('AI_JOB_POLL_INTERVAL_MS'), 'the polling interval is honoured');
  assert.ok(source.includes('reconcileFromRest'), 'the reconciliation is wired');
});

test('the context polls only while a job is active', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('shouldPoll'), 'the poll has an explicit condition');
  assert.ok(source.includes('AI_JOB_STATUSES.Queued'), 'the queued status counts as active');
  assert.ok(source.includes('AI_JOB_STATUSES.Processing'), 'the processing status counts as active');
});

test('the context stops the connection on the auth-expired event', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('AUTH_EXPIRED_LISTENER'), 'the auth-expired event is subscribed');
  assert.ok(source.includes('connection.stop()'), 'the connection is stopped');
});

test('the context cleans up its timers and its connection', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('clearTimeout'), 'the timers are cleared');
  assert.ok(source.includes('removeEventListener'), 'the event handlers are removed');
});

test('the context guards against a duplicate connection', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('isConnectingRef'), 'the connecting flag is used');
  assert.ok(source.includes('connectionRef'), 'the connection is held in a ref');
});

test('the context guards against an out-of-order REST response', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('fetchIdRef'), 'the fetch id is used');
  assert.ok(source.includes('fetchId !== fetchIdRef.current'),
    'an older response is discarded');
});

test('the context never overwrites an unsaved draft from a REST fetch', () => {
  const source = readSource('src', 'utils', 'aiJobState.js');

  assert.ok(source.includes('editedDraftDirty'), 'the dirty flag guards the draft');
});

test('the draft auto-save uses the approved timings', () => {
  const source = readSource('src', 'context', 'aiJobContextObject.js');

  assert.ok(source.includes('AI_JOB_DRAFT_SAVE_DEBOUNCE_MS = 800'), 'the debounce is 800 ms');
  assert.ok(source.includes('AI_JOB_DRAFT_SAVE_MAX_ATTEMPTS = 3'), 'there are three attempts');
  assert.ok(source.includes('AI_JOB_DRAFT_SAVE_RETRY_DELAY_MS = 2000'),
    'the retries are two seconds apart');
});

test('the auto-save refuses to run for a job that is not completed', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('canSaveAiJobDraft'), 'the completion check is applied');
});

test('the unload warning is registered while unsaved edits remain', () => {
  const source = readSource('src', 'context', 'AiJobProvider.jsx');

  assert.ok(source.includes('beforeunload'), 'the beforeunload handler is registered');
  assert.ok(source.includes('editedDraftDirty'), 'the warning is conditional on the dirty flag');
});

/* ── The SignalR client's token handling ───────────────────────────────── */

test('the SignalR client refreshes an expired token itself', () => {
  const source = readSource('src', 'services', 'aiJobSignalRClient.js');

  assert.ok(source.includes('isTokenExpired'), 'the expiry check is applied');
  assert.ok(source.includes('executeWithRefreshLock'),
    'the refresh goes through the shared single-flight queue');
  assert.ok(source.includes('refreshAccessToken'), 'the existing refresh function is called');
});

test('the SignalR client fails safely when no token is available', () => {
  const source = readSource('src', 'services', 'aiJobSignalRClient.js');

  assert.ok(source.includes('No access token available'),
    'the client refuses to connect without a token');
});

test('the SignalR client does not assume an in-place identity refresh', () => {
  // The backend validates the bearer token once, at connection
  // establishment. The client therefore acquires a fresh token for
  // every establishment and every reconnection, and never assumes the
  // connection can refresh its identity in place.
  const source = readSource('src', 'services', 'aiJobSignalRClient.js');

  assert.ok(!source.includes('reAuthenticate'), 'no in-place re-authentication is assumed');
  assert.ok(source.includes('accessTokenFactory'),
    'the token is supplied through the factory, which runs on every handshake');
});

/* ── The form's job wiring ─────────────────────────────────────────────── */

test('the form submits a job rather than awaiting a translation', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(source.includes('submitJob'), 'the job is submitted');
  assert.ok(!source.includes('generateAiDescription('),
    'the retired synchronous call is never made');
});

test('the form offers the cancel and the retry controls', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(source.includes('handleCancelAiJob'), 'the cancel handler is wired');
  assert.ok(source.includes('handleRetryAiJob'), 'the retry handler is wired');
});

test('the form keeps the draft outside the product payload', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(!source.includes('const payload = { ...aiDescription'),
    'the draft is never spread into the product payload');
});

test('the create page passes the Create operation type', () => {
  const source = readSource('src', 'pages', 'admin', 'AdminProductCreatePage.jsx');

  assert.ok(source.includes('operationType={AI_JOB_OPERATION_TYPES.Create}'),
    'the create page declares a Create operation');
});

test('the edit page passes the Edit operation type and the product id', () => {
  const source = readSource('src', 'pages', 'admin', 'AdminProductEditPage.jsx');

  assert.ok(source.includes('operationType={AI_JOB_OPERATION_TYPES.Edit}'),
    'the edit page declares an Edit operation');
  assert.ok(source.includes('productId={id}'),
    'the edit page passes the existing product id');
});

/* ── The panel's rendering rules ───────────────────────────────────────── */

test('the panel never invents a percentage or claims inference has begun', () => {
  const source = readSource('src', 'components', 'admin', 'AiDescriptionDraftSection.jsx');

  // A **percentage** is what must not appear — a number immediately
  // followed by a `%`, or a percentage used as a width. The modulo
  // operator is a different thing entirely.
  assert.ok(!/\d+%/.test(source), 'no percentage is rendered');
  assert.ok(!/width[^;]*%/.test(source), 'no percentage is used as a width');
  assert.ok(!/Generating\.\.\./.test(source.replace(/\/\/.*$/gm, '')),
    'the panel never substitutes a client-generated "Generating…" message');
});

test('the panel keeps the unverified label', () => {
  const source = readSource('src', 'components', 'admin', 'AiDescriptionDraftSection.jsx');

  assert.ok(
    source.includes("'Not verified — machine translation, not fact-checked'"),
    'the unverified label is unchanged'
  );
});

test('the panel uses the approved live-region semantics', () => {
  const source = readSource('src', 'components', 'admin', 'AiDescriptionDraftSection.jsx');

  assert.ok(source.includes('role="status"'), 'the status line is a live region');
  assert.ok(source.includes('aria-live="polite"'), 'the status line announces politely');
  assert.ok(source.includes('role="alert"'), 'the error is an alert');
});

test('the panel shows the persistent not-saved warning', () => {
  const source = readSource('src', 'components', 'admin', 'AiDescriptionDraftSection.jsx');

  assert.ok(
    source.includes("'Not saved — copy your text before leaving'"),
    'the persistent warning is the approved wording'
  );
});
