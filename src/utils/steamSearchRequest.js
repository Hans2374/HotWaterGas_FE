/**
 * Request shaping and response/error classification for the admin Steam
 * Store Search route.
 *
 * This module is deliberately **dependency-free**: it imports nothing, so
 * it can be exercised offline by the test suite without a bundler, a
 * browser, or a network — exactly like `utils/aiDescriptionRequest.js`.
 * The axios call itself lives in `services/steamSearchService.js`.
 *
 * ── Contract note ────────────────────────────────────────────────────────────
 * The backend route is `POST /api/admin/products/search-steam-games`.
 * Its **public** request is `{ query }` and its public response is
 * `{ total, candidateCount, invalidCount, truncatedCount, candidates }`,
 * where each candidate is `{ appId, name, type, tinyImage }`.
 *
 * The response is already camel-cased by the backend, and the shared
 * axios client camel-cases keys too, so the field names used here are
 * the public ones. `normalizeCandidates` nevertheless accepts both the
 * camelCase and the PascalCase spellings, so a future backend change
 * cannot silently produce an empty candidate list.
 *
 * ── Semantics note ──────────────────────────────────────────────────────────
 * A search result is a **candidate**, not a verified product fact. This
 * module therefore deliberately keeps only the fields the administrator
 * needs in order to *choose* a candidate. It never surfaces a price, a
 * metascore or a platform, and it never treats Steam's `type` field as
 * proof that a candidate is a full game.
 */

/** The public backend route. */
export const STEAM_SEARCH_ENDPOINT = '/api/admin/products/search-steam-games';

/** The maximum query length the backend accepts. */
export const STEAM_SEARCH_MAX_QUERY_LENGTH = 200;

/**
 * Normalize one candidate into the shape the UI renders.
 *
 * Unknown, missing or malformed fields degrade to a safe value rather
 * than throwing: a candidate with an unusable App ID is dropped, because
 * it could never be sent to the translation endpoint anyway.
 *
 * @param {object} raw A candidate as the backend returned it.
 * @returns {{ appId: number, name: string, tinyImage: string|null }|null}
 */
const normalizeCandidate = (raw) => {
  if (!raw || typeof raw !== 'object') return null;

  const appId = Number(raw.appId ?? raw.AppId ?? raw.app_id ?? raw.App_id);
  if (!Number.isInteger(appId) || appId < 1) return null;

  const name = String(raw.name ?? raw.Name ?? '').trim();
  if (!name) return null;

  const tinyImage = raw.tinyImage ?? raw.TinyImage ?? raw.tiny_image ?? null;
  const imageUrl = typeof tinyImage === 'string' && tinyImage.trim().length > 0
    ? tinyImage.trim()
    : null;

  // `type` is intentionally NOT carried through. Steam reports
  // `type="app"` for a full game, a demo and a soundtrack alike, so it
  // is not a product type and must not be shown as one.
  return { appId, name, tinyImage: imageUrl };
};

/**
 * Normalize the backend's search response.
 *
 * @param {object} raw The response body.
 * @returns {{
 *   total: number|null,
 *   candidateCount: number,
 *   invalidCount: number|null,
 *   truncatedCount: number|null,
 *   candidates: Array<{ appId: number, name: string, tinyImage: string|null }>
 * }}
 */
export const normalizeSearchResponse = (raw) => {
  const source = raw && typeof raw === 'object' ? raw : {};

  const rawCandidates = Array.isArray(source.candidates ?? source.Candidates)
    ? source.candidates ?? source.Candidates
    : [];

  const candidates = rawCandidates
    .map(normalizeCandidate)
    .filter((candidate) => candidate !== null);

  const toCount = (value) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  };

  return {
    total: toCount(source.total ?? source.Total),
    candidateCount: toCount(source.candidateCount ?? source.CandidateCount) ?? candidates.length,
    invalidCount: toCount(source.invalidCount ?? source.InvalidCount),
    truncatedCount: toCount(source.truncatedCount ?? source.TruncatedCount),
    candidates
  };
};

/**
 * Build the public request body.
 *
 * The body carries the query and nothing else. There is deliberately no
 * URL, host, App ID or pagination parameter: the upstream route is
 * fixed and the candidate count is capped server-side.
 *
 * @param {string} query
 * @returns {{ query: string }}
 */
export const buildSteamSearchRequest = (query) => ({
  query: typeof query === 'string' ? query.trim() : ''
});

/**
 * Decide whether a search may be started.
 *
 * A search needs a non-empty product name and must not run while
 * another search is already running.
 *
 * @param {object} state
 * @param {string} state.productName
 * @param {boolean} state.isSearching
 * @returns {boolean}
 */
export const canSearchSteam = ({ productName, isSearching }) => {
  if (isSearching) return false;
  return typeof productName === 'string' && productName.trim().length > 0;
};

/**
 * Decide whether a candidate is the currently selected one.
 *
 * @param {{ appId: number }|null} selected
 * @param {{ appId: number }} candidate
 * @returns {boolean}
 */
export const isSelectedCandidate = (selected, candidate) => {
  if (!selected || !candidate) return false;
  return Number(selected.appId) === Number(candidate.appId);
};

/**
 * The selected candidate's App ID, or `null` when nothing is selected.
 *
 * @param {{ appId: number }|null} selected
 * @returns {number|null}
 */
export const selectedAppId = (selected) => {
  if (!selected) return null;

  const appId = Number(selected.appId);
  return Number.isInteger(appId) && appId >= 1 ? appId : null;
};

/**
 * Map an HTTP status onto a message the administrator can act on.
 *
 * The backend already sanitises its own error bodies, so the backend's
 * `message` is preferred when present. The fallbacks below cover the
 * cases where the body was empty or carried no message.
 *
 * ── The two 429 cases ───────────────────────────────────────────────────────
 * The backend distinguishes the repeated-query cooldown from Steam's own
 * rate limit, but it exposes that distinction only through a **free-text
 * message** — there is no stable machine-readable error code in the
 * public envelope. Matching on that text would be brittle: the wording
 * could change without the contract changing, and a user-visible string
 * is a poor thing to branch on.
 *
 * So this function deliberately does **not** try to tell the two apart.
 * Both are reported with the same accurate, actionable message. The
 * administrator learns that the search is temporarily rate-limited and
 * should wait — which is correct for both causes and does not depend on
 * the backend's wording.
 *
 * @param {number} status
 * @param {string} fallbackMessage
 * @returns {string}
 */
export const describeSteamSearchError = (status, fallbackMessage) => {
  switch (status) {
    case 400:
    case 422:
      return 'The search query was rejected as invalid. Check the product name and try again.';
    case 401:
      return 'Your session has expired. Sign in again to search Steam.';
    case 403:
      return 'You do not have permission to search Steam.';
    case 429:
      return 'Steam search is temporarily rate-limited. Please wait and try again.';
    case 502:
      return 'Steam search is unavailable right now. Please try again in a moment.';
    case 503:
      return 'Steam search is disabled on the server right now. Please try again later.';
    case 504:
      return 'Steam search took too long to respond. You can try again.';
    case 0:
      return 'Network error. Please check your backend connection.';
    default:
      return fallbackMessage || 'Steam search failed. Please try again.';
  }
};

/**
 * The message shown when a search returns no usable candidate.
 *
 * @param {{ candidateCount: number, total: number|null }} result
 * @returns {string}
 */
export const describeEmptySteamSearch = (result) => {
  const total = Number(result?.total ?? 0);

  if (Number.isFinite(total) && total > 0) {
    return `Steam reported ${total} result${total === 1 ? '' : 's'}, but none could be used as a candidate. Try a different name.`;
  }

  return 'No matching games were found on Steam. Try a different name.';
};
