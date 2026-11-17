import { createContext } from 'react';

/**
 * The AI generation job context — its identity, and the tunables the
 * provider honours.
 *
 * The context object lives in its own module so that
 * `AiJobContext.jsx` exports **only** a component. The
 * `react-refresh` rule requires that, and the split keeps the fast
 * refresh boundary honest: editing the provider does not invalidate the
 * context object's identity.
 */
export const AiJobContext = createContext(null);

/**
 * The debounce window for the draft auto-save, in milliseconds.
 *
 * The save runs 800 ms after the **last** keystroke, so a burst of
 * typing produces exactly one save.
 */
export const AI_JOB_DRAFT_SAVE_DEBOUNCE_MS = 800;

/**
 * The polling interval while a job is active and the hub is not
 * connected, in milliseconds.
 */
export const AI_JOB_POLL_INTERVAL_MS = 5000;

/**
 * The maximum number of auto-save attempts after a failure.
 */
export const AI_JOB_DRAFT_SAVE_MAX_ATTEMPTS = 3;

/**
 * The delay between the auto-save retries, in milliseconds.
 */
export const AI_JOB_DRAFT_SAVE_RETRY_DELAY_MS = 2000;
