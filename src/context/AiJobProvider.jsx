import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';

import {
  AI_JOB_DRAFT_SAVE_DEBOUNCE_MS,
  AI_JOB_DRAFT_SAVE_MAX_ATTEMPTS,
  AI_JOB_DRAFT_SAVE_RETRY_DELAY_MS,
  AI_JOB_POLL_INTERVAL_MS,
  AiJobContext
} from './aiJobContextObject';

import {
  AI_DRAFT_SAVE_STATES,
  AI_JOB_STATUSES,
  applyJobNotification,
  canSaveAiJobDraft,
  createAiJobState,
  discardAiJob,
  editAiJobDraft,
  failAiJobCancel,
  failAiJobDraftSave,
  failAiJobFetch,
  failAiJobRetry,
  failAiJobSubmission,
  invalidateAiJobApplicability,
  selectRestoredAiJob,
  startAiJobCancel,
  startAiJobDraftSave,
  startAiJobRestore,
  startAiJobSubmission,
  succeedAiJobCancel,
  succeedAiJobDraftSave,
  succeedAiJobFetch,
  succeedAiJobRetry,
  succeedAiJobSubmission
} from '../utils/aiJobState';

import {
  AI_JOB_OPERATION_TYPES,
  validateAiJobRequest
} from '../utils/aiJobRequest';

import {
  cancelAiGenerationJob,
  createAiGenerationJob,
  getActiveAiGenerationJobs,
  getAiGenerationJob,
  retryAiGenerationJob,
  updateAiGenerationJobDraft
} from '../services/aiJobService';

import { createAiJobHubConnection } from '../services/aiJobSignalRClient';

import { AUTH_EXPIRED_LISTENER } from '../utils/authEventBridge';

/**
 * The admin-scoped AI generation job provider.
 *
 * ── What this provider owns ─────────────────────────────────────────────────
 *   * the current Admin's job state;
 *   * the SignalR connection lifecycle;
 *   * the initial REST restoration;
 *   * the REST reconciliation after a SignalR notification;
 *   * the REST reconciliation after a reconnect;
 *   * the 5-second polling fallback while a job is active;
 *   * the debounced draft auto-save;
 *   * the cleanup of every timer, event handler and connection.
 *
 * ── REST is authoritative ────────────────────────────────────────────────────
 * SignalR is a **notification mechanism, not a durable event stream**. A
 * notification says "something changed"; the client answers it by
 * fetching the job through REST. A missed notification therefore cannot
 * leave the UI permanently stale, because the polling fallback covers
 * the window in which no notification arrives.
 *
 * The polling runs whenever an active job exists **and** the hub is not
 * connected. When the hub *is* connected the notifications drive the
 * updates, and the poll is idle — but the poll is also restarted after
 * every reconnect, so a reconnect re-syncs the state.
 *
 * ── The race guard ──────────────────────────────────────────────────────────
 * Four things can fetch the job concurrently: the initial restoration, a
 * notification, a reconnect and a polling tick. Each fetch carries a
 * monotonically increasing id, and a response whose id is not the
 * latest one is discarded. An older response therefore never overwrites
 * newer state, and never overwrites unsaved local text.
 *
 * ── The draft ───────────────────────────────────────────────────────────────
 * The draft lives here, not in the product form. The auto-save is
 * debounced by 800 ms, only runs for a `Completed` job, sends the
 * **complete** edited text, allows only **one** save in flight, and
 * schedules a **trailing** save when a keystroke arrives during a save.
 * A failed save keeps the text dirty and retries with a bounded
 * backoff; the text is never silently discarded.
 */

export const AiJobProvider = ({ children }) => {
  const [jobState, setJobState] = useState(createAiJobState);
  const [hubConnected, setHubConnected] = useState(false);
  // Whether the draft auto-save has exhausted its retries. Once it has,
  // the "Not saved — copy your text before leaving" warning is shown
  // and stays visible until the text is saved or discarded.
  const [draftSaveExhausted, setDraftSaveExhausted] = useState(false);

  /* ── Refs: every mutable handle the effects and handlers share ──────────── */

  // The connection, so it can be stopped exactly once on unmount and so
  // the effect never creates a second one.
  const connectionRef = useRef(null);
  // Whether a connection is currently being established. A second mount
  // effect (React StrictMode) must not start a second connection.
  const isConnectingRef = useRef(false);
  // The monotonic fetch id. A response whose id is not the latest is
  // discarded.
  const fetchIdRef = useRef(0);
  // The polling timer.
  const pollTimerRef = useRef(null);
  // The draft auto-save debounce timer.
  const saveDebounceRef = useRef(null);
  // The draft auto-save retry timer.
  const saveRetryRef = useRef(null);
  // Whether a draft save is currently in flight. Only one may be.
  const isSavingDraftRef = useRef(false);
  // The number of auto-save attempts already made for the current
  // pending text.
  const saveAttemptRef = useRef(0);
  // A trailing save is pending because a keystroke arrived during a save.
  const saveTrailingRef = useRef(false);
  // The latest job state, readable from timers and handlers without
  // re-creating them on every render.
  const stateRef = useRef(jobState);
  // The hub's connection state, so the polling effect can read it
  // without a stale closure.
  const hubConnectedRef = useRef(false);

  stateRef.current = jobState;

  /* ── REST reconciliation ────────────────────────────────────────────────── */

  /**
   * Fetch the job through REST and fold the result into the state.
   *
   * The fetch id guards the race: an older response is discarded.
   *
   * @param {string|null} jobId The job to fetch, or null to fetch the
   *   Admin's active job.
   */
  const reconcileFromRest = useCallback(async (jobId = null) => {
    const fetchId = fetchIdRef.current + 1;
    fetchIdRef.current = fetchId;

    try {
      let job = null;

      if (jobId) {
        job = await getAiGenerationJob(jobId);
      } else {
        const result = await getActiveAiGenerationJobs();
        job = selectRestoredAiJob(result);
      }

      // A newer fetch started while this one was in flight.
      if (fetchId !== fetchIdRef.current) return null;

      setJobState((prev) => (job ? succeedAiJobFetch(prev, job) : prev));

      return job;
    } catch (apiError) {
      if (fetchId !== fetchIdRef.current) return null;

      setJobState((prev) => failAiJobFetch(prev, {
        status: apiError?.status ?? 0,
        message: apiError?.message || 'Failed to load the AI description job.'
      }));

      return null;
    }
  }, []);

  /* ── The draft auto-save ────────────────────────────────────────────────── */

  const clearSaveTimers = useCallback(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
      saveDebounceRef.current = null;
    }
    if (saveRetryRef.current) {
      clearTimeout(saveRetryRef.current);
      saveRetryRef.current = null;
    }
  }, []);

  /**
   * Schedule the debounced auto-save.
   *
   * The debounce is 800 ms after the **last** keystroke, so a burst of
   * typing produces one save.
   */
  const scheduleDraftSave = useCallback(() => {
    if (saveDebounceRef.current) {
      clearTimeout(saveDebounceRef.current);
    }

    saveDebounceRef.current = setTimeout(() => {
      saveDebounceRef.current = null;
      runDraftSaveRef.current();
    }, AI_JOB_DRAFT_SAVE_DEBOUNCE_MS);
  }, []);

  /**
   * Persist the edited draft.
   *
   * Only one save is in flight at a time. A keystroke that arrives
   * during a save schedules a **trailing** save, so saves are never
   * lost and never overlap.
   */
  const runDraftSave = useCallback(async () => {
    if (isSavingDraftRef.current) {
      // A save is already running: remember that another one is due.
      saveTrailingRef.current = true;
      return;
    }

    const current = stateRef.current;

    // The backend refuses a draft save for a job that is not
    // `Completed`, so the auto-save only runs for a completed job.
    if (!canSaveAiJobDraft(current)) return;

    const jobId = current.jobId;
    const text = current.editedDraft;

    isSavingDraftRef.current = true;
    setJobState((prev) => startAiJobDraftSave(prev));

    try {
      await updateAiGenerationJobDraft(jobId, text);

      saveAttemptRef.current = 0;
      isSavingDraftRef.current = false;
      setDraftSaveExhausted(false);

      // The trailing flag is read **before** the state update, so the
      // decision is made against a stable value and not against a flag
      // a state updater might still mutate.
      const hasTrailingSave = saveTrailingRef.current;
      saveTrailingRef.current = false;

      setJobState((prev) => {
        const next = succeedAiJobDraftSave(prev);
        if (hasTrailingSave) {
          next.draftSaveState = AI_DRAFT_SAVE_STATES.Idle;
        }
        return next;
      });

      if (hasTrailingSave) {
        // A keystroke arrived while the save was in flight: the text
        // that was just saved is already stale, so it is saved again.
        scheduleDraftSave();
      }
    } catch (apiError) {
      isSavingDraftRef.current = false;

      const attempt = saveAttemptRef.current + 1;
      saveAttemptRef.current = attempt;

      setJobState((prev) => failAiJobDraftSave(prev, {
        status: apiError?.status ?? 0,
        message: apiError?.message || 'Failed to save the edited description.'
      }));

      // The text stays dirty and intact. The save is retried with a
      // bounded backoff; after the retries are exhausted the UI shows
      // the persistent "Not saved" warning.
      if (attempt < AI_JOB_DRAFT_SAVE_MAX_ATTEMPTS) {
        saveRetryRef.current = setTimeout(() => {
          saveRetryRef.current = null;
          runDraftSaveRef.current();
        }, AI_JOB_DRAFT_SAVE_RETRY_DELAY_MS);
      } else {
        // The retries are exhausted. The text is still unsaved, so the
        // warning is persistent and the administrator is told to copy
        // the text before leaving.
        setDraftSaveExhausted(true);
      }
    }
  }, [scheduleDraftSave]);

  // The mutual reference between the schedule and the run is resolved
  // through a ref, so neither closure captures a stale binding.
  const runDraftSaveRef = useRef(runDraftSave);
  runDraftSaveRef.current = runDraftSave;

  /* ── The public actions ─────────────────────────────────────────────────── */

  /**
   * Submit a new generation job.
   *
   * The request returns as soon as the backend has written the row. No
   * upstream call is awaited.
   *
   * The operation context comes from the caller — the provider is
   * mounted in the admin layout and is therefore deliberately
   * operation-agnostic, while the operation belongs to the page that
   * renders the form.
   *
   * @param {object} source
   * @param {string} source.productName
   * @param {number|null} source.steamAppId
   * @param {string} [source.operationType]
   * @param {string|null} [source.productId]
   */
  const submitJob = useCallback(async ({
    productName,
    steamAppId,
    operationType: operation = AI_JOB_OPERATION_TYPES.Create,
    productId: targetProductId = null
  }) => {
    const validation = validateAiJobRequest({
      productName,
      steamAppId,
      operationType: operation,
      productId: targetProductId
    });

    if (!validation.ok) {
      setJobState((prev) => failAiJobSubmission(prev, {
        status: 400,
        message: validation.reason
      }));
      return null;
    }

    setJobState((prev) => startAiJobSubmission(prev));

    try {
      const job = await createAiGenerationJob({
        productName,
        steamAppId,
        operationType: operation,
        productId: targetProductId
      });

      setJobState((prev) => succeedAiJobSubmission(prev, job));
      return job;
    } catch (apiError) {
      setJobState((prev) => failAiJobSubmission(prev, {
        status: apiError?.status ?? 0,
        message: apiError?.message || 'Failed to start the AI description generation.'
      }));
      return null;
    }
  }, []);

  /**
   * Request the cancellation of the current job.
   *
   * The Generate control stays disabled until the backend confirms a
   * terminal cancellation, because a cancel-requested processing job
   * still holds the upstream request.
   */
  const cancelJob = useCallback(async () => {
    const jobId = stateRef.current.jobId;
    if (!jobId) return null;

    setJobState((prev) => startAiJobCancel(prev));

    try {
      const response = await cancelAiGenerationJob(jobId);
      setJobState((prev) => succeedAiJobCancel(prev, response));
      return response;
    } catch (apiError) {
      setJobState((prev) => failAiJobCancel(prev, {
        status: apiError?.status ?? 0,
        message: apiError?.message || 'Failed to request the cancellation.'
      }));
      return null;
    }
  }, []);

  /**
   * Retry the current job.
   *
   * A retry creates a **new** job with a new id, so the tracked job id
   * is replaced.
   */
  const retryJob = useCallback(async () => {
    const jobId = stateRef.current.jobId;
    if (!jobId) return null;

    setJobState((prev) => startAiJobSubmission(prev));

    try {
      const job = await retryAiGenerationJob(jobId);
      setJobState((prev) => succeedAiJobRetry(prev, job));
      return job;
    } catch (apiError) {
      setJobState((prev) => failAiJobRetry(prev, {
        status: apiError?.status ?? 0,
        message: apiError?.message || 'Failed to retry the AI description generation.'
      }));
      return null;
    }
  }, []);

  /**
   * Record the administrator's edit to the draft.
   *
   * The edit updates the local working copy and schedules the debounced
   * auto-save.
   *
   * @param {string} text
   */
  const editDraft = useCallback((text) => {
    setJobState((prev) => editAiJobDraft(prev, text));
    setDraftSaveExhausted(false);

    // The auto-save only runs for a completed job.
    if (!canSaveAiJobDraft(stateRef.current)) return;

    saveAttemptRef.current = 0;
    scheduleDraftSave();
  }, [scheduleDraftSave]);

  /**
   * Discard the draft.
   */
  const discardDraft = useCallback(() => {
    clearSaveTimers();
    saveAttemptRef.current = 0;
    saveTrailingRef.current = false;
    setDraftSaveExhausted(false);
    setJobState((prev) => discardAiJob(prev));
  }, [clearSaveTimers]);

  /**
   * Invalidate the current job's applicability.
   *
   * Called when the product name or the Steam selection changes: the
   * job described a different product.
   */
  const invalidateApplicability = useCallback(() => {
    setJobState((prev) => invalidateAiJobApplicability(prev));
  }, []);

  /* ── The SignalR lifecycle ──────────────────────────────────────────────── */

  /**
   * Handle a notification.
   *
   * The payload is **metadata only**, so it is folded into the state
   * and then the job is fetched through REST. The REST fetch is the
   * authoritative update; the notification only says that one is due.
   */
  const handleNotification = useCallback((payload) => {
    setJobState((prev) => applyJobNotification(prev, payload));
    reconcileFromRest(stateRef.current.jobId);
  }, [reconcileFromRest]);

  /**
   * Handle a reconnect.
   *
   * The connection was lost and re-established, so the notifications
   * that arrived during the gap were missed. The active job is fetched
   * again.
   */
  const handleReconnected = useCallback(() => {
    reconcileFromRest(null);
  }, [reconcileFromRest]);

  /* ── The initial restoration ────────────────────────────────────────────── */

  useEffect(() => {
    setJobState((prev) => startAiJobRestore(prev));
    reconcileFromRest(null);
  }, [reconcileFromRest]);

  /* ── The polling fallback ───────────────────────────────────────────────── */

  /**
   * Whether the poll should currently be running.
   *
   * The poll runs while a job is active and the hub is not connected.
   */
  const shouldPoll = useCallback(() =>
    !hubConnectedRef.current
    && (stateRef.current.status === AI_JOB_STATUSES.Queued
      || stateRef.current.status === AI_JOB_STATUSES.Processing),
  []);

  /**
   * The single polling loop.
   *
   * There is exactly **one** interval at any time. It is recreated only
   * when the poll's own condition changes — the job's status, or the
   * hub's connectivity — so the effect re-run never leaves two loops
   * running.
   */
  useEffect(() => {
    if (!shouldPoll()) {
      return undefined;
    }

    const interval = setInterval(() => {
      if (shouldPoll()) {
        reconcileFromRest(null);
      }
    }, AI_JOB_POLL_INTERVAL_MS);

    pollTimerRef.current = interval;

    return () => {
      clearInterval(interval);
      if (pollTimerRef.current === interval) {
        pollTimerRef.current = null;
      }
    };
  }, [hubConnected, jobState.status, shouldPoll, reconcileFromRest]);

  /* ── The SignalR connection ─────────────────────────────────────────────── */

  useEffect(() => {
    let disposed = false;

    const start = async () => {
      // Exactly one connection, ever. A second mount effect (React
      // StrictMode) must not start a second connection.
      if (isConnectingRef.current || connectionRef.current) return;
      isConnectingRef.current = true;

      try {
        const connection = createAiJobHubConnection({
          onNotification: handleNotification,
          onReconnected: handleReconnected,
          onStateChange: (state) => {
            const connected = state === 'Connected' || state === 'Reconnected';
            hubConnectedRef.current = connected;
            setHubConnected(connected);
          }
        });

        connectionRef.current = connection;

        await connection.start();

        if (disposed) {
          // The provider unmounted while the handshake was in flight.
          await connection.stop().catch(() => {});
          return;
        }

        hubConnectedRef.current = true;
        setHubConnected(true);
      } catch {
        // The hub is unavailable. This is **not** an error the
        // administrator needs to see: the REST polling fallback covers
        // the gap, and the automatic reconnect retries on the next
        // attempt.
        hubConnectedRef.current = false;
        setHubConnected(false);
      } finally {
        isConnectingRef.current = false;
      }
    };

    start();

    return () => {
      disposed = true;

      const connection = connectionRef.current;
      connectionRef.current = null;
      hubConnectedRef.current = false;

      if (connection) {
        // The connection is stopped exactly once, and the stop is not
        // awaited — the component is already unmounting.
        connection.stop().catch(() => {});
      }
    };
  }, [handleNotification, handleReconnected]);

  /* ── The auth-expired event ─────────────────────────────────────────────── */

  useEffect(() => {
    /**
     * The session expired.
     *
     * The connection is stopped, because it can no longer be
     * authenticated, and the existing `AuthContext` logout flow runs.
     */
    const handleAuthExpired = () => {
      const connection = connectionRef.current;
      connectionRef.current = null;
      hubConnectedRef.current = false;

      if (connection) {
        connection.stop().catch(() => {});
      }
    };

    window.addEventListener(AUTH_EXPIRED_LISTENER, handleAuthExpired);

    return () => {
      window.removeEventListener(AUTH_EXPIRED_LISTENER, handleAuthExpired);
    };
  }, []);

  /* ── The unload warning ─────────────────────────────────────────────────── */

  useEffect(() => {
    /**
     * Warn before an unsaved edit is lost to a navigation.
     */
    const handleBeforeUnload = (event) => {
      if (!stateRef.current.editedDraftDirty) return;

      event.preventDefault();
      // The modern browsers require `returnValue` to be set for the
      // prompt to appear.
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  /* ── The cleanup on unmount ─────────────────────────────────────────────── */

  useEffect(() => {
    return () => {
      clearSaveTimers();
      saveAttemptRef.current = 0;
      saveTrailingRef.current = false;
      isSavingDraftRef.current = false;
    };
  }, [clearSaveTimers]);

  /* ── The context value ──────────────────────────────────────────────────── */

  const value = useMemo(() => ({
    ...jobState,
    draftSaveExhausted,
    submitJob,
    cancelJob,
    retryJob,
    editDraft,
    discardDraft,
    invalidateApplicability,
    reconcileFromRest
  }), [
    jobState,
    draftSaveExhausted,
    submitJob,
    cancelJob,
    retryJob,
    editDraft,
    discardDraft,
    invalidateApplicability,
    reconcileFromRest
  ]);

  return (
    <AiJobContext.Provider value={value}>
      {children}
    </AiJobContext.Provider>
  );
};
