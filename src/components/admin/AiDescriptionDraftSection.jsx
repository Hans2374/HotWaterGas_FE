import { useMemo } from 'react';
import {
  Sparkles,
  RefreshCw,
  Check,
  X,
  AlertTriangle,
  Info,
  Loader2,
  Languages,
  ShieldAlert,
  Monitor,
  CalendarDays
} from 'lucide-react';
import {
  collectAiDescriptionWarnings,
  extractAiDescriptionMeta,
  extractAiDescriptionSource,
  extractAiDescriptionPlatformValues,
  extractAiDescriptionRequirements,
  extractAiDescriptionReleaseDate,
  extractAiDescriptionModelMeta,
  hasAiDescriptionRequirementValues,
  joinAiDescriptionPlatformValues
} from '../../utils/aiDescriptionMapping';
import './AiDescriptionDraftSection.css';

/**
 * Review panel for the AI description translation draft.
 *
 * This component is strictly presentational: it renders the job state
 * and the draft, and reports the administrator's intent through
 * callbacks. It never touches the product form, and it never persists
 * anything.
 *
 * ── What this panel reviews ─────────────────────────────────────────────────
 * The result is not a draft composed from scattered facts — it is a
 * *translation* of an existing Steam store description. That difference
 * shows up in the review UI:
 *
 *   * the description is **unverified by construction**, and the panel
 *     says so plainly, because a machine translation must never be
 *     mistaken for a checked fact;
 *   * the panel shows the **description-source metadata**: which Steam
 *     fields were translated, whether the source was truncated, and
 *     whether the source carried enough material;
 *   * the panel shows **warnings by their stable code**, never by
 *     parsing their message text;
 *   * the platform list is never joined behind the administrator's
 *     back. Because the product form has a **single** platform field,
 *     the administrator must explicitly choose what to persist.
 *
 * ── The asynchronous job states ─────────────────────────────────────────────
 * The generation is asynchronous: the browser submits a job and the
 * backend performs the generation later. The panel therefore renders the
 * job's own state — queued, processing, failed, cancelled — and shows
 * the **backend's** progress message verbatim.
 *
 * Two rules govern the wording, and both are load-bearing:
 *
 *   * **No percentage is ever invented.** The backend cannot supply
 *     one, so the panel does not fabricate one.
 *   * **The panel never claims that model inference has begun.** While
 *     the backend's stage is `FetchingData`, the panel shows the
 *     backend's own progress message and substitutes no wording of its
 *     own. Claiming "Generating…" there would be a lie about work the
 *     model has not started.
 */

/**
 * The label shown for the description's verification state.
 *
 * The contract forces the description to `unverified`: the pipeline
 * translates, it does not check. The label therefore states that in
 * plain words, and never says "verified" or "fact-checked".
 */
const UNVERIFIED_LABEL = 'Not verified — machine translation, not fact-checked';

/**
 * A short, human label for a Steam source field name.
 *
 * @param {string} field
 * @returns {string}
 */
const describeSourceField = (field) => {
  if (!field) return '';

  switch (field) {
    case 'detailed_description':
      return 'Detailed description';
    case 'about_the_game':
      return 'About this game';
    case 'short_description':
      return 'Short description';
    case 'detailed_description_about_the_game':
      return 'Detailed description / About this game';
    default:
      return field;
  }
};

/**
 * The requirement tier rows, in display order.
 */
const REQUIREMENT_ROWS = [
  { key: 'os', label: 'OS' },
  { key: 'processor', label: 'Processor' },
  { key: 'memory', label: 'Memory' },
  { key: 'graphics', label: 'Graphics' },
  { key: 'storage', label: 'Storage' },
  { key: 'notes', label: 'Notes' }
];

/**
 * The sentinel choice meaning "persist every platform, joined".
 *
 * The product form's platform field holds a single string, so the joined
 * list is the only way a multi-platform result can be persisted without
 * discarding a fact.
 */
const ALL_PLATFORMS = '__all__';

/**
 * The stage labels.
 *
 * `FetchingData` is the only stage the Phase 1 backend writes. The
 * other two are reserved, and the panel renders them defensively so a
 * future backend that emits them is already handled.
 */
const STAGE_LABELS = {
  FetchingData: 'Fetching source data',
  Generating: 'Generating',
  Regenerating: 'Regenerating'
};

/**
 * The message shown while a job is queued and has never been attempted.
 */
const QUEUED_MESSAGE = 'Waiting for the generation worker. This can take a while on a local model.';

/**
 * The message shown once a job has been cancelled.
 */
const CANCELLED_MESSAGE = 'The generation was cancelled.';

/**
 * The message shown when a cancellation has been requested but the
 * backend has not yet confirmed a terminal cancellation.
 *
 * The wording is deliberate: the upstream request is **still being
 * awaited**. It must never imply that the inference has already
 * stopped, because it has not.
 */
const CANCEL_REQUESTED_MESSAGE =
  'Cancellation requested. Waiting for the current AI request to finish before the job is marked cancelled.';

/**
 * The warning shown once the draft save has exhausted its retries.
 */
const DRAFT_NOT_SAVED_MESSAGE = 'Not saved — copy your text before leaving';

/**
 * Render one requirement tier.
 *
 * A tier with no supplied value is shown as "not stated" rather than
 * being hidden: the administrator needs to know that the requirement is
 * **unknown**, which is different from "there is no requirement".
 *
 * @param {object} props
 * @param {object} props.tier The sparse tier object.
 * @param {string} props.title The tier's title.
 */
const RequirementTier = ({ tier, title }) => {
  const hasValues = hasAiDescriptionRequirementValues(tier);

  return (
    <div className="ai-description-req-tier">
      <h5 className="ai-description-req-tier-title">{title}</h5>

      {!hasValues ? (
        <p className="ai-review-note">
          Not stated by Steam. This stays unknown — no value has been invented for it.
        </p>
      ) : (
        <dl className="ai-description-req-list">
          {REQUIREMENT_ROWS.map((row) => {
            const value = tier?.[row.key];
            const isKnown = typeof value === 'string' && value.trim().length > 0;

            return (
              <div className="ai-description-req-row" key={row.key}>
                <dt className="ai-description-req-label">{row.label}</dt>
                <dd className="ai-description-req-value">
                  {isKnown ? value : <span className="ai-description-unknown">Unknown</span>}
                </dd>
              </div>
            );
          })}
        </dl>
      )}
    </div>
  );
};

/**
 * Format a timestamp for display.
 *
 * The timestamp is the backend's own; nothing is invented. An
 * unparsable value is returned verbatim so no information is lost.
 *
 * @param {string|null|undefined} value
 * @returns {string}
 */
const formatTimestamp = (value) => {
  if (!value) return '';
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) return String(value);
  return new Date(parsed).toLocaleString();
};

/**
 * Format a duration for display.
 *
 * The duration is derived from the **backend's** timestamps — never
 * from a client-side progress estimate. When the backend has not
 * supplied a start time, nothing is shown: an invented duration would
 * be a fabricated measurement.
 *
 * @param {number|null|undefined} elapsedMs
 * @returns {string} The formatted duration, or an empty string.
 */
const formatElapsed = (elapsedMs) => {
  if (typeof elapsedMs !== 'number' || !Number.isFinite(elapsedMs) || elapsedMs < 0) return '';

  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes === 0) return `${seconds}s`;
  return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
};

export const AiDescriptionDraftSection = ({
  isGenerating,
  error,
  translation,
  draftText,
  onDraftTextChange,
  onGenerate,
  onRegenerate,
  onApply,
  onDismiss,
  canApply,
  hasSteamSelection = false,
  hasEditedDraft = false,
  isConfirmingReplace = false,
  selectedPlatform = null,
  onPlatformSelect,
  onRequestReplace,
  onConfirmReplace,
  onCancelReplace,
  isDisabled = false,
  jobStatus = null,
  jobStage = null,
  jobProgressMessage = '',
  jobAttemptCount = 0,
  jobNextAttemptAt = null,
  jobCancelRequested = false,
  jobErrorCode = null,
  jobErrorMessage = null,
  jobElapsedMs = null,
  draftSaveState = 'idle',
  draftSaveExhausted = false,
  onCancelJob,
  onRetryJob,
  canRetry = false,
  isCancelling = false
}) => {
  const meta = useMemo(() => extractAiDescriptionMeta(translation), [translation]);
  const source = useMemo(() => extractAiDescriptionSource(translation), [translation]);
  const warnings = useMemo(() => collectAiDescriptionWarnings(translation), [translation]);
  const platforms = useMemo(() => extractAiDescriptionPlatformValues(translation), [translation]);
  const requirements = useMemo(() => extractAiDescriptionRequirements(translation), [translation]);
  const releaseDate = useMemo(() => extractAiDescriptionReleaseDate(translation), [translation]);
  const modelMeta = useMemo(() => extractAiDescriptionModelMeta(translation), [translation]);

  const hasTranslation = Boolean(translation);

  /**
   * Whether the panel is in a busy state.
   *
   * The asynchronous job states are busy: the administrator is waiting.
   * The legacy `isGenerating` prop remains supported so the panel can
   * still be rendered standalone.
   */
  const isBusy = Boolean(isGenerating)
    || jobStatus === 'Queued'
    || jobStatus === 'Processing';

  /**
   * Whether the job is waiting for a backoff-delayed retry.
   */
  const isAwaitingRetry = jobStatus === 'Queued'
    && Number(jobAttemptCount) > 0
    && Boolean(jobNextAttemptAt);

  /**
   * The platform value the administrator has explicitly chosen to
   * persist, or `null` when they have not chosen one.
   *
   * The product form has a **single** platform field, so a list of
   * platforms can never be silently reduced to one. The administrator
   * picks, and until they do, the platform field is left untouched.
   */
  const chosen = selectedPlatform ?? null;

  const hasPlatformChoice = chosen !== null;

  /**
   * The platform string that would be persisted, given the
   * administrator's choice.
   *
   * `null` means "no platform decision": the platform field is left
   * exactly as it was. A single choice yields that value. The
   * "all of them" choice yields the joined list, which is the one way a
   * multi-platform result can honestly fit a single-value field.
   */
  const resolvedPlatform = useMemo(() => {
    if (chosen === null) return null;
    if (chosen === ALL_PLATFORMS) return joinAiDescriptionPlatformValues(platforms);
    return chosen;
  }, [chosen, platforms]);

  const handleRegenerateClick = () => {
    // An edited draft must never be replaced silently: the
    // administrator's edits are real work, and losing them silently is
    // the worst possible outcome.
    if (hasEditedDraft) {
      onRequestReplace();
      return;
    }

    onRegenerate();
  };

  /**
   * The visible save-state line.
   *
   * @returns {string|null} The line, or null when there is nothing to say.
   */
  const saveStateLine = (() => {
    if (draftSaveExhausted) return DRAFT_NOT_SAVED_MESSAGE;
    if (draftSaveState === 'saving') return 'Saving…';
    if (draftSaveState === 'saved') return 'Saved';
    if (draftSaveState === 'error') return 'Could not save — retrying';
    return null;
  })();

  /**
   * The elapsed time, derived from the backend's timestamps.
   *
   * It is empty when the backend has not supplied a start time, because
   * an invented duration would be a fabricated measurement.
   */
  const elapsedLine = formatElapsed(jobElapsedMs);

  return (
    <section className="form-card ai-description-draft-card">
      <div className="ai-draft-header">
        <h3 className="form-card-title ai-draft-title">
          <Sparkles size={15} aria-hidden="true" />
          AI Description Translation
        </h3>
        <span className="ai-draft-hint">
          Translates the Steam store description into Vietnamese. Reviewed by you before it
          reaches the product.
        </span>
      </div>

      {/* ── Controls ─────────────────────────────────────────────────────── */}
      <div className="ai-draft-controls">
        {hasTranslation ? (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleRegenerateClick}
            disabled={isBusy || isDisabled}
          >
            {isBusy ? (
              <Loader2 size={14} className="ai-spin" aria-hidden="true" />
            ) : (
              <RefreshCw size={14} aria-hidden="true" />
            )}
            {isBusy ? 'Translating...' : 'Regenerate Translation'}
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={onGenerate}
            disabled={isBusy || isDisabled}
          >
            {isBusy ? (
              <Loader2 size={14} className="ai-spin" aria-hidden="true" />
            ) : (
              <Sparkles size={15} aria-hidden="true" />
            )}
            {isBusy ? 'Translating...' : 'Translate Steam Description'}
          </button>
        )}

        {hasTranslation && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onDismiss}
            disabled={isBusy || isDisabled}
          >
            <X size={14} aria-hidden="true" />
            Discard
          </button>
        )}

        {/* The cancellation control. It is offered while a job is
            running, and it is disabled while the cancellation request
            is in flight. */}
        {jobStatus && jobStatus !== 'Completed' && jobStatus !== 'Failed' && jobStatus !== 'Cancelled' && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancelJob}
            disabled={isCancelling || jobCancelRequested || isDisabled}
          >
            <X size={14} aria-hidden="true" />
            {jobCancelRequested ? 'Cancellation requested' : 'Cancel'}
          </button>
        )}

        {/* The retry control. It is offered only for a terminal job,
            because a retry creates a *new* job. */}
        {canRetry && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onRetryJob}
            disabled={isBusy || isDisabled}
          >
            <RefreshCw size={14} aria-hidden="true" />
            Try again
          </button>
        )}
      </div>

      {/* ── The busy state ───────────────────────────────────────────────── */}
      {isBusy && (
        <p className="ai-draft-status" role="status" aria-live="polite">
          <Loader2 size={14} className="ai-spin" aria-hidden="true" />
          {jobStatus === 'Queued'
            ? (isAwaitingRetry
              ? `The provider did not respond in time. Retrying — next attempt at ${formatTimestamp(jobNextAttemptAt)}.`
              : QUEUED_MESSAGE)
            : (jobStatus === 'Processing'
              ? (jobCancelRequested
                ? CANCEL_REQUESTED_MESSAGE
                : `${STAGE_LABELS[jobStage] || 'Working'}${jobProgressMessage ? ` — ${jobProgressMessage}` : ''}${jobStage === 'Regenerating' && Number(jobAttemptCount) > 0 ? ` (attempt ${jobAttemptCount})` : ''}`)
              : 'Translating the Steam description. This can take a while on a local model — please wait.')}
        </p>
      )}

      {/* ── The elapsed time ──────────────────────────────────────────────── */}
      {elapsedLine && (
        <p className="ai-draft-status" role="status" aria-live="polite">
          <Info size={14} aria-hidden="true" />
          {`Elapsed: ${elapsedLine}`}
        </p>
      )}

      {/* ── The waiting-for-a-retry detail ──────────────────────────────── */}
      {isAwaitingRetry && (
        <p className="ai-draft-status" role="status" aria-live="polite">
          <Info size={14} aria-hidden="true" />
          {`Attempt ${jobAttemptCount} so far. Next attempt at ${formatTimestamp(jobNextAttemptAt)}.`}
        </p>
      )}

      {/* ── The cancellation-requested detail ───────────────────────────── */}
      {jobCancelRequested && jobStatus === 'Processing' && (
        <p className="ai-draft-status" role="status" aria-live="polite">
          <Info size={14} aria-hidden="true" />
          {CANCEL_REQUESTED_MESSAGE}
        </p>
      )}

      {/* ── The cancelled state ─────────────────────────────────────────── */}
      {jobStatus === 'Cancelled' && (
        <p className="ai-draft-status" role="status" aria-live="polite">
          <Info size={14} aria-hidden="true" />
          {CANCELLED_MESSAGE}
        </p>
      )}

      {/* ── The failed state ────────────────────────────────────────────── */}
      {jobStatus === 'Failed' && (
        <div className="ai-draft-error" role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          <div>
            {jobErrorCode && (
              <p className="ai-draft-error-detail">
                {`Error code: ${jobErrorCode}`}
              </p>
            )}
            <p className="ai-draft-error-message">
              {jobErrorMessage || 'The AI description generation failed.'}
            </p>
          </div>
        </div>
      )}

      {/* ── Error ────────────────────────────────────────────────────────── */}
      {error && !isBusy && !jobStatus && (
        <div className="ai-draft-error" role="alert">
          <AlertTriangle size={15} aria-hidden="true" />
          <div>
            <p className="ai-draft-error-message">{error.message}</p>
            {error.status === 400 && (
              <p className="ai-draft-error-detail">
                The request was rejected. Select a Steam game and check the product name.
              </p>
            )}
            {error.status === 404 && (
              <p className="ai-draft-error-detail">
                Steam has no store description for this App ID. It may be the wrong game, or the
                game may publish no description.
              </p>
            )}
            {error.status === 409 && (
              <p className="ai-draft-error-detail">
                The Steam App ID belongs to a different game. Clear it or select the right one,
                then regenerate.
              </p>
            )}
            {error.status === 429 && (
              <p className="ai-draft-error-detail">
                The translation service is rate-limiting requests. Wait a moment and try again.
              </p>
            )}
            {error.status === 502 && (
              <p className="ai-draft-error-detail">
                Steam or the translation service could not be reached. This is usually temporary.
              </p>
            )}
            {error.status === 503 && (
              <p className="ai-draft-error-detail">
                AI translation may be switched off on the server. Ask an administrator to check
                the AI configuration.
              </p>
            )}
            {error.status === 504 && (
              <p className="ai-draft-error-detail">
                The translation did not finish in time. You can try again — nothing was changed.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Empty state ──────────────────────────────────────────────────── */}
      {!hasTranslation && !isBusy && !error && !jobStatus && (
        <p className="ai-draft-status">
          <Info size={14} aria-hidden="true" />
          Search Steam above and select the game, then translate its store description into
          Vietnamese. Nothing is saved until you apply it and save the product.
        </p>
      )}

      {/* ── Steam retrieval hint ────────────────────────────────────────── */}
      {!hasTranslation && !isBusy && !error && !jobStatus && !hasSteamSelection && (
        <p className="ai-draft-status ai-draft-steam-hint">
          <Info size={14} aria-hidden="true" />
          No Steam game is selected. A translation needs the Steam store description as its
          source, so select a game above first.
        </p>
      )}

      {/* ── Regenerate confirmation ──────────────────────────────────────── */}
      {isConfirmingReplace && (
        <div className="ai-description-confirm" role="alertdialog" aria-label="Replace edited translation">
          <AlertTriangle size={15} aria-hidden="true" />
          <div className="ai-description-confirm-body">
            <p className="ai-description-confirm-title">Replace your edited translation?</p>
            <p className="ai-description-confirm-text">
              You edited the translated text. Regenerating replaces it with a fresh translation
              and your edits are lost.
            </p>
            <div className="ai-description-confirm-actions">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onCancelReplace}
                disabled={isBusy || isDisabled}
              >
                Keep My Edit
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onConfirmReplace}
                disabled={isBusy || isDisabled}
              >
                Replace It
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Translation review ───────────────────────────────────────────── */}
      {hasTranslation && (
        <div className="ai-draft-body">
          {/* Translated description */}
          <div className="form-field form-field-full">
            <label className="input-label" htmlFor="ai-description-draft-text">
              Translated description
            </label>
            <textarea
              id="ai-description-draft-text"
              className="form-textarea ai-draft-textarea"
              value={draftText}
              onChange={(event) => onDraftTextChange(event.target.value)}
              rows={10}
              disabled={isBusy}
            />

            {/* The save-state line. It is a polite live region, so a
                screen reader announces the change without interrupting
                the administrator's typing. */}
            {saveStateLine && (
              <p className="ai-draft-status" role="status" aria-live="polite">
                {saveStateLine}
              </p>
            )}

            {/* After the retries are exhausted the warning is
                persistent: the text is still unsaved, and it must be
                copied before the administrator leaves. */}
            {draftSaveExhausted && (
              <p className="ai-draft-error-message" role="alert">
                {DRAFT_NOT_SAVED_MESSAGE}
              </p>
            )}

            <span className="input-hint">
              <Languages size={12} aria-hidden="true" />
              {' '}Language: {meta.language || 'unknown'}
              {' · '}{meta.wordCount} words
              {' · '}{meta.withinTargetRange
                ? 'within the target length'
                : 'outside the target length (informational)'}
            </span>

            {/* The description is a translation, never a checked fact. */}
            <p className="ai-description-unverified-badge" role="note">
              <ShieldAlert size={13} aria-hidden="true" />
              {UNVERIFIED_LABEL}
            </p>
          </div>

          {/* Warnings, by stable code */}
          {warnings.length > 0 && (
            <div className="ai-review-block ai-review-block-warning">
              <h4 className="ai-review-title">
                <AlertTriangle size={14} aria-hidden="true" />
                Warnings
              </h4>
              <ul className="ai-description-warning-list">
                {warnings.map((warning) => (
                  <li
                    key={`${warning.code}-${warning.fieldPath}`}
                    className={`ai-description-warning ai-description-warning-${warning.severity}`}
                    data-warning-code={warning.code}
                  >
                    <span className="ai-description-warning-code">{warning.code}</span>
                    <span className="ai-description-warning-label">{warning.label}</span>
                    <span className="ai-description-warning-detail">{warning.detail}</span>
                  </li>
                ))}
              </ul>
              <p className="ai-review-note">
                These conditions are reported by the translation service. The code is the stable
                identifier; the wording above is only a description.
              </p>
            </div>
          )}

          {/* Description source metadata */}
          <div className="ai-review-block">
            <h4 className="ai-review-title">Translation source</h4>

            <ul className="ai-chip-list">
              <li className="ai-chip">
                <span className="ai-chip-field">Primary field</span>
                <span className="ai-chip-status">
                  {source.primaryField ? describeSourceField(source.primaryField) : 'None'}
                </span>
              </li>
              <li className={`ai-chip ${source.truncated ? 'is-conflicting' : ''}`}>
                <span className="ai-chip-field">Truncated</span>
                <span className="ai-chip-status">
                  {source.truncated
                    ? `Yes — ${source.droppedBlocks} block(s) dropped`
                    : 'No'}
                </span>
              </li>
              <li className={`ai-chip ${source.sourceSufficient ? '' : 'is-conflicting'}`}>
                <span className="ai-chip-field">Source sufficient</span>
                <span className="ai-chip-status">
                  {source.sourceSufficient
                    ? 'Yes — the source carried enough material'
                    : 'No — the source carried too little material'}
                </span>
              </li>
            </ul>

            {source.supplementaryFields.length > 0 && (
              <p className="ai-review-note">
                Supplementary fields: {source.supplementaryFields.map(describeSourceField).join(', ')}
              </p>
            )}

            {source.skippedFields.length > 0 && (
              <p className="ai-review-note">
                Skipped fields: {source.skippedFields.map(describeSourceField).join(', ')}
              </p>
            )}

            <p className="ai-review-note">
              {source.blockCount} block(s) translated · {source.sourceTokenCount} source token(s)
              {source.minSourceTokens > 0 ? ` (minimum ${source.minSourceTokens})` : ''}
            </p>
          </div>

          {/* Release date */}
          <div className="ai-review-block">
            <h4 className="ai-review-title">
              <CalendarDays size={14} aria-hidden="true" />
              Release date
            </h4>
            <p className="ai-review-note">
              {releaseDate
                ? releaseDate
                : 'Not stated by Steam. This stays unknown — no value has been invented for it.'}
            </p>
          </div>

          {/* Platforms */}
          <div className="ai-review-block">
            <h4 className="ai-review-title">Platform availability</h4>

            {platforms.length === 0 ? (
              <p className="ai-review-note">
                Not stated by Steam. This stays unknown — no value has been invented for it.
              </p>
            ) : (
              <>
                <ul className="ai-chip-list">
                  {platforms.map((platform) => (
                    <li key={platform} className="ai-chip">
                      {platform}
                    </li>
                  ))}
                </ul>

                <p className="ai-review-note">
                  The product form has a single platform field. Choose which value to persist
                  below — nothing is written until you choose, and choosing is your decision.
                </p>

                <div className="ai-description-platform-choices" role="radiogroup" aria-label="Platform to persist">
                  {platforms.map((platform) => (
                    <button
                      key={platform}
                      type="button"
                      role="radio"
                      aria-checked={chosen === platform}
                      className={`ai-description-platform-choice ${chosen === platform ? 'is-selected' : ''}`}
                      onClick={() => onPlatformSelect(platform)}
                      disabled={isBusy || isDisabled}
                    >
                      <Check size={13} aria-hidden="true" />
                      {platform}
                    </button>
                  ))}

                  <button
                    type="button"
                    role="radio"
                    aria-checked={chosen === ALL_PLATFORMS}
                    className={`ai-description-platform-choice ${chosen === ALL_PLATFORMS ? 'is-selected' : ''}`}
                    onClick={() => onPlatformSelect(ALL_PLATFORMS)}
                    disabled={isBusy || isDisabled}
                  >
                    <Check size={13} aria-hidden="true" />
                    All of them (joined)
                  </button>
                </div>

                {!hasPlatformChoice && (
                  <p className="ai-description-platform-notice">
                    The platform field is left unchanged until you choose a value.
                  </p>
                )}
              </>
            )}
          </div>

          {/* Windows / PC requirements */}
          <div className="ai-review-block">
            <h4 className="ai-review-title">
              <Monitor size={14} aria-hidden="true" />
              Windows / PC requirements
            </h4>

            <RequirementTier tier={requirements.minimum} title="Minimum" />
            <RequirementTier tier={requirements.recommended} title="Recommended" />

            <p className="ai-review-note">
              Steam publishes macOS and Linux requirements separately. They are not part of this
              translation and are not shown here.
            </p>
          </div>

          {/* Model metadata */}
          {modelMeta.modelId && (
            <p className="ai-draft-model">
              {modelMeta.provider ? `${modelMeta.provider} · ` : ''}
              {modelMeta.modelId}
              {modelMeta.durationMs ? ` · ${modelMeta.durationMs} ms` : ''}
            </p>
          )}

          {/* Apply */}
          <div className="ai-draft-controls ai-draft-apply-row">
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => onApply(resolvedPlatform)}
              disabled={isBusy || isDisabled || !canApply}
            >
              <Check size={14} aria-hidden="true" />
              Apply to Form
            </button>
            <span className="ai-draft-hint">
              Applying fills the form fields. The product is saved only by the form&apos;s own save
              action.
            </span>
          </div>
        </div>
      )}
    </section>
  );
};
