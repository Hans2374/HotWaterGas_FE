/**
 * Mapping between the backend's translation result and the admin
 * product form.
 *
 * Everything in this module is a **pure function**. It has no React
 * state, no network access, and no side effects, which keeps the
 * conservative rules below easy to verify offline.
 *
 * ── The core rule ───────────────────────────────────────────────────────────
 * A field is applied only when the response **explicitly supplies a
 * value**. An absent, null, empty or "unknown" value never overwrites
 * what the administrator has already typed. Nothing is ever defaulted
 * and no value is invented.
 *
 * ── What the result is ─────────────────────────────────────────────────────
 * The result is a **translation**, not a draft composed from scattered
 * facts. Two consequences shape this module:
 *
 *   1. The description is unverified **by construction**. The frontend
 *      never promotes it, and never labels it verified or fact-checked.
 *   2. The response carries two blocks that a fact-composed draft would
 *      not have: a `descriptionSource` block (which Steam fields were
 *      translated, whether the source was truncated, whether it was
 *      sufficient) and a `warnings` collection with **stable codes**.
 *
 * ── Platforms stay a list ───────────────────────────────────────────────────
 * The response returns platform availability as a **list**. The
 * product form has a single platform string. The list is never joined
 * here: joining is a presentation decision made only when the
 * administrator explicitly applies a value.
 */

/** The requirement fields the form models, in display order. */
const REQUIREMENT_FIELDS = ['os', 'processor', 'memory', 'graphics', 'storage', 'notes'];

/** A requirement value counts as supplied only when it is a real string. */
const isSupplied = (value) => typeof value === 'string' && value.trim().length > 0;

/* ── Warnings ──────────────────────────────────────────────────────────────── */

/**
 * The warning codes the contract can emit, with the human-readable
 * explanation used in the review UI.
 *
 * The UI branches on the **code**, never on the warning's message text:
 * the message is informational prose, and a consumer that parses it
 * would break the moment the wording changes.
 *
 * @type {Record<string, { severity: string, label: string, detail: string }>}
 */
export const AI_DESCRIPTION_WARNING_CODES = {
  source_truncated: {
    severity: 'warning',
    label: 'Partial translation',
    detail:
      'The Steam description was longer than the translation budget, so only part of it was translated.'
  },
  source_insufficient: {
    severity: 'warning',
    label: 'Short source',
    detail:
      'The Steam description carried less material than the target length needs. The translation is short because the source was short.'
  },
  translation_below_target: {
    severity: 'info',
    label: 'Shorter than the target length',
    detail:
      'The translated text is shorter than the target length. The translation is still faithful to the source.'
  },
  source_block_dropped: {
    severity: 'warning',
    label: 'Source block dropped',
    detail:
      'At least one Steam description block did not fit inside the translation budget and was left out.'
  },
  description_over_ceiling: {
    severity: 'warning',
    label: 'Description too long',
    detail:
      'The translated description exceeded the maximum length, so the translation could not be completed.'
  }
};

/**
 * The fallback explanation for a warning code the frontend does not know.
 *
 * The code is still shown verbatim, so an unknown code remains
 * diagnosable — but the frontend does not invent a meaning for it.
 *
 * @param {string} code
 * @returns {{ severity: string, label: string, detail: string }}
 */
const describeUnknownWarning = (code) => ({
  severity: 'warning',
  label: `Unknown warning (${code})`,
  detail: 'The service reported a condition this version of the admin interface does not recognise.'
});

/**
 * Normalize the warning collection.
 *
 * Each warning keeps its **stable code** and its severity, and gains a
 * human-readable label and detail derived from that code. The upstream
 * message is preserved separately: it is shown as supporting detail, but
 * it is never the thing the UI branches on.
 *
 * An unknown code is kept verbatim rather than dropped, so a new upstream
 * code is visible instead of silently disappearing.
 *
 * The argument may be the whole response or a bare warning array, so the
 * function can be used on a response and on a collection alike.
 *
 * @param {object|Array} translation The translation response, or the warning array.
 * @returns {Array<{ code: string, severity: string, label: string, detail: string, fieldPath: string, message: string }>}
 */
export const collectAiDescriptionWarnings = (translation) => {
  const warnings = Array.isArray(translation)
    ? translation
    : translation?.warnings;
  if (!Array.isArray(warnings)) return [];

  return warnings
    .filter((warning) => warning && typeof warning === 'object')
    .map((warning) => {
      const code = typeof warning.code === 'string' ? warning.code.trim() : '';
      const known = AI_DESCRIPTION_WARNING_CODES[code];

      return {
        code,
        severity: (warning.severity || known?.severity || 'warning').toLowerCase(),
        label: known?.label || describeUnknownWarning(code).label,
        detail: known?.detail || describeUnknownWarning(code).detail,
        fieldPath: typeof warning.fieldPath === 'string' ? warning.fieldPath : '',
        message: typeof warning.message === 'string' ? warning.message : ''
      };
    })
    .filter((warning) => warning.code.length > 0);
};

/**
 * Whether a warning code is present in the collection.
 *
 * This is the behaviour branch: a consumer asks "did the source get
 * truncated?", not "does any message mention truncation?".
 *
 * @param {Array<{ code: string }>} warnings
 * @param {string} code
 * @returns {boolean}
 */
export const hasAiDescriptionWarning = (warnings, code) =>
  Array.isArray(warnings) && warnings.some((warning) => warning?.code === code);

/* ── Description ───────────────────────────────────────────────────────────── */

/**
 * Read the translated description text.
 *
 * @param {object} translation The translation response.
 * @returns {string} The translated text, or '' when absent.
 */
export const extractAiDescriptionText = (translation) => {
  const text = translation?.description?.text;
  return typeof text === 'string' ? text : '';
};

/**
 * The description's own metadata, for display only.
 *
 * `verificationStatus` is carried through verbatim. The frontend never
 * upgrades it: a translation is unverified by construction, and the
 * contract refuses a payload that claims otherwise.
 *
 * @param {object} translation The translation response.
 * @returns {{ language: string, wordCount: number, withinTargetRange: boolean, verificationStatus: string, evidenceCount: number }}
 */
export const extractAiDescriptionMeta = (translation) => ({
  language: translation?.description?.language || '',
  wordCount: Number(translation?.description?.wordCount) || 0,
  withinTargetRange: translation?.description?.withinTargetRange === true,
  verificationStatus: translation?.description?.verification?.status || '',
  evidenceCount: Array.isArray(translation?.description?.evidenceIds)
    ? translation.description.evidenceIds.length
    : 0
});

/* ── Description source ────────────────────────────────────────────────────── */

/**
 * The description-source metadata.
 *
 * The block is service-owned: it describes the *input* the model was
 * shown, not anything the model produced.
 *
 * @param {object} translation The translation response.
 * @returns {{
 *   primaryField: string,
 *   supplementaryFields: string[],
 *   skippedFields: string[],
 *   blockCount: number,
 *   sourceBytes: number,
 *   totalSourceBytes: number,
 *   truncated: boolean,
 *   droppedBlocks: number,
 *   sourceTokenCount: number,
 *   sourceSufficient: boolean,
 *   minSourceTokens: number
 * }}
 */
export const extractAiDescriptionSource = (translation) => {
  const source = translation?.descriptionSource;

  const toStringList = (value) =>
    Array.isArray(value)
      ? value.filter((entry) => typeof entry === 'string' && entry.trim().length > 0)
      : [];

  return {
    primaryField: typeof source?.primaryField === 'string' ? source.primaryField : '',
    supplementaryFields: toStringList(source?.supplementaryFields),
    skippedFields: toStringList(source?.skippedFields),
    blockCount: Number(source?.blockCount) || 0,
    sourceBytes: Number(source?.sourceBytes) || 0,
    totalSourceBytes: Number(source?.totalSourceBytes) || 0,
    truncated: source?.truncated === true,
    droppedBlocks: Number(source?.droppedBlocks) || 0,
    sourceTokenCount: Number(source?.sourceTokenCount) || 0,
    sourceSufficient: source?.sourceSufficient !== false,
    minSourceTokens: Number(source?.minSourceTokens) || 0
  };
};

/* ── Platforms ─────────────────────────────────────────────────────────────── */

/**
 * The platform values, kept as a **list**.
 *
 * The list is never joined here. Joining is a presentation decision that
 * happens only when the administrator explicitly applies the draft.
 *
 * @param {object} translation The translation response.
 * @returns {string[]} The platform values, in their returned order.
 */
export const extractAiDescriptionPlatformValues = (translation) => {
  const values = translation?.platforms?.values;
  if (!Array.isArray(values)) return [];

  return values.filter((value) => typeof value === 'string' && value.trim().length > 0);
};

/**
 * Join the platform list into the form's single string field.
 *
 * Only called on an explicit "apply". The separator is `", "`, matching
 * the form's own placeholder ("Windows, macOS, Linux").
 *
 * @param {string[]} values
 * @returns {string} The joined string, or '' for an empty list.
 */
export const joinAiDescriptionPlatformValues = (values) => {
  if (!Array.isArray(values)) return '';

  return values
    .filter((value) => typeof value === 'string' && value.trim().length > 0)
    .map((value) => value.trim())
    .join(', ');
};

/* ── Release date ──────────────────────────────────────────────────────────── */

/**
 * The release date, but only when the response actually supplies one.
 *
 * @param {object} translation The translation response.
 * @returns {string} An ISO date, or '' when unknown.
 */
export const extractAiDescriptionReleaseDate = (translation) => {
  const value = translation?.releaseDate?.value;
  return isSupplied(value) ? value.trim() : '';
};

/* ── System requirements ───────────────────────────────────────────────────── */

/**
 * Read both requirement tiers.
 *
 * The contract carries the **PC/Windows** tier only: Steam's macOS
 * and Linux requirements are never mapped upstream, so they can never
 * appear here.
 *
 * The minimum and recommended tiers stay distinct — a value in one tier
 * is never copied into the other. Notes are kept separate from the
 * factual fields so a note can never be read as a requirement.
 *
 * Only fields with a supplied value appear in the result, so the caller
 * can leave every other form field untouched.
 *
 * @param {object} translation The translation response.
 * @returns {{ minimum: object, recommended: object }} Sparse tier objects.
 */
export const extractAiDescriptionRequirements = (translation) => ({
  minimum: extractAiDescriptionRequirementTier(translation?.systemRequirements?.minimum),
  recommended: extractAiDescriptionRequirementTier(translation?.systemRequirements?.recommended)
});

const extractAiDescriptionRequirementTier = (tier) => {
  if (!tier || typeof tier !== 'object') return {};

  const result = {};

  for (const field of REQUIREMENT_FIELDS) {
    const value = tier[field]?.value;
    if (isSupplied(value)) {
      result[field] = value.trim();
    }
  }

  return result;
};

/**
 * Whether a tier carries at least one supplied value.
 *
 * A tier counts as supplied only when it holds a genuinely non-blank
 * value. The form's tier shape is **dense**: every tier always carries
 * all six keys, each initialised to an empty string. Counting keys
 * would therefore report an untouched tier as supplied, and an empty
 * tier would be mistaken for real requirement data.
 *
 * @param {object} tier
 * @returns {boolean}
 */
export const hasAiDescriptionRequirementValues = (tier) => {
  if (!tier || typeof tier !== 'object') return false;

  return Object.values(tier).some((value) => isSupplied(value));
};

/* ── Model metadata ────────────────────────────────────────────────────────── */

/**
 * The model metadata, for display.
 *
 * @param {object} translation The translation response.
 * @returns {{ provider: string, modelId: string, promptVersion: string, durationMs: number, retrievedAt: string }}
 */
export const extractAiDescriptionModelMeta = (translation) => ({
  provider: translation?.model?.provider || '',
  modelId: translation?.model?.modelId || '',
  promptVersion: translation?.model?.promptVersion || '',
  durationMs: Number(translation?.model?.durationMs) || 0,
  retrievedAt: typeof translation?.retrievedAt === 'string' ? translation.retrievedAt : ''
});

/* ── Applying a translation ────────────────────────────────────────────────── */

/**
 * Compute the form changes for an explicit "apply".
 *
 * The rules, in full:
 *   - The description is applied when the administrator's edited text is
 *     non-empty. An empty edited text is never applied, because that
 *     would erase a description for no reason.
 *   - The platform string is applied only when the translation actually
 *     carries platform values, and only when the administrator has
 *     chosen which value(s) to persist.
 *   - The release date is applied only when the response supplies one.
 *   - Each requirement field is applied only when the response supplies
 *     a value for it.
 *   - No other form field is touched.
 *
 * The platform is passed in **already decided** by the caller. The
 * frontend never picks a platform by itself: the product form has a
 * single platform string, and silently choosing one of several would
 * discard real facts.
 *
 * @param {object} translation The translation response.
 * @param {object} options
 * @param {string} options.descriptionText The administrator's edited text.
 * @param {string} [options.platform] The platform string to persist, already chosen.
 * @returns {object} A sparse patch of form fields.
 */
export const buildAiDescriptionApplyPatch = (translation, { descriptionText, platform } = {}) => {
  const patch = {};

  const text = typeof descriptionText === 'string'
    ? descriptionText
    : extractAiDescriptionText(translation);
  if (isSupplied(text)) {
    patch.description = text;
  }

  if (isSupplied(platform)) {
    patch.platform = platform.trim();
  }

  const releaseDate = extractAiDescriptionReleaseDate(translation);
  if (releaseDate) {
    patch.releaseDate = releaseDate;
  }

  const requirements = extractAiDescriptionRequirements(translation);

  const minimum = requirements.minimum;
  if (hasAiDescriptionRequirementValues(minimum)) {
    patch.minimum = { ...minimum };
  }

  const recommended = requirements.recommended;
  if (hasAiDescriptionRequirementValues(recommended)) {
    patch.recommended = { ...recommended };
  }

  return patch;
};

/**
 * Merge an apply patch into the form's system requirements.
 *
 * Only the supplied fields are overwritten; every other field in the
 * form's tiers is preserved exactly.
 *
 * @param {object} currentRequirements The form's current tiers.
 * @param {object} patch The patch from {@link buildAiDescriptionApplyPatch}.
 * @returns {object} The merged tiers.
 */
export const mergeAiDescriptionRequirements = (currentRequirements = {}, patch = {}) => {
  const current = currentRequirements || {};
  const currentMinimum = current.minimum || {};
  const currentRecommended = current.recommended || {};

  const mergeTier = (existing, incoming) => {
    if (!incoming) return { ...existing };
    return { ...existing, ...incoming };
  };

  return {
    minimum: mergeTier(currentMinimum, patch.minimum),
    recommended: mergeTier(currentRecommended, patch.recommended)
  };
};
