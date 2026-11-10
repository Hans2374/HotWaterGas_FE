import { describeEmptySteamSearch } from './steamSearchRequest.js';

/**
 * The Steam search state machine — pure state transitions.
 *
 * This module is deliberately **dependency-free** (it imports only the
 * sibling pure helper), so the whole lifecycle can be exercised offline
 * by the test suite without a bundler, a browser, or a network.
 *
 * ── Why a state machine ─────────────────────────────────────────────────────
 * The interesting rules of this feature are all about *when* state may
 * change:
 *
 *   * a failed search must not erase a selection the administrator
 *     already made;
 *   * a product-name change must clear the selection, the results and
 *     any in-flight request;
 *   * switching products must not let one product's App ID leak into
 *     another product's form session;
 *   * a slow response for an older query must never overwrite newer
 *     results.
 *
 * Expressing those rules as pure functions — rather than as scattered
 * `setState` calls inside a component — is what makes them verifiable
 * without a DOM. The component owns the state and the request-id ref;
 * this module owns the rules.
 *
 * ── Staleness ───────────────────────────────────────────────────────────────
 * The component holds a monotonic request id in a ref. `isStaleSteamResponse`
 * is the single predicate that decides whether a response may still be
 * applied. Every transition that must invalidate an in-flight request
 * bumps that id in the component, and the response is then rejected by
 * this predicate.
 */

/**
 * The initial Steam search state.
 *
 * @returns {{
 *   candidates: Array,
 *   selected: { appId: number, name: string }|null,
 *   error: string|null,
 *   emptyMessage: string|null,
 *   isSearching: boolean,
 *   hasSearched: boolean
 * }}
 */
export const createSteamSearchState = () => ({
  candidates: [],
  selected: null,
  error: null,
  emptyMessage: null,
  isSearching: false,
  hasSearched: false
});

/**
 * Decide whether a response may still be applied.
 *
 * A response is stale when it belongs to a request that is no longer the
 * latest one — because a newer search started, because the product name
 * changed, or because the administrator selected a candidate.
 *
 * @param {number} responseRequestId The id the request was issued with.
 * @param {number} currentRequestId  The id of the latest issued request.
 * @returns {boolean} True when the response must be discarded.
 */
export const isStaleSteamResponse = (responseRequestId, currentRequestId) =>
  responseRequestId !== currentRequestId;

/**
 * A search has started.
 *
 * The previous error and the previous "no results" message are cleared,
 * so a retry never shows a stale outcome.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const startSteamSearch = (state) => ({
  ...state,
  isSearching: true,
  error: null,
  emptyMessage: null
});

/**
 * A search succeeded.
 *
 * The candidate list is replaced, the "no results" message is computed
 * when there is nothing to choose from, and any previous error is
 * cleared.
 *
 * @param {object} state
 * @param {{ candidates: Array, total: number|null }} result
 * @returns {object} The next state.
 */
export const succeedSteamSearch = (state, result) => {
  const candidates = Array.isArray(result?.candidates) ? result.candidates : [];

  return {
    ...state,
    candidates,
    isSearching: false,
    hasSearched: true,
    error: null,
    emptyMessage: candidates.length === 0 ? describeEmptySteamSearch(result) : null
  };
};

/**
 * A search failed.
 *
 * The candidate list and the selection are deliberately **kept**: a
 * failed search says nothing about a candidate the administrator already
 * chose, and silently dropping it would be surprising. Only an explicit
 * clear, or a product-name change, removes a selection.
 *
 * @param {object} state
 * @param {string} message The controlled, user-facing message.
 * @returns {object} The next state.
 */
export const failSteamSearch = (state, message) => ({
  ...state,
  isSearching: false,
  hasSearched: true,
  error: message || 'Steam search failed. Please try again.'
});

/**
 * The product name changed.
 *
 * The candidates on screen describe a different game, so the selection
 * and the results are cleared. The caller is responsible for bumping
 * the request id, so a late response for the old name is discarded too.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const clearSteamSearchForNewName = () => ({
  ...createSteamSearchState()
});

/**
 * A different product was loaded, or the form was reset.
 *
 * Everything is cleared, so one product's selected App ID can never
 * leak into another product's form session.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const resetSteamSearch = () => ({
  ...createSteamSearchState()
});

/**
 * A candidate was selected.
 *
 * @param {object} state
 * @param {{ appId: number, name: string }} candidate
 * @returns {object} The next state.
 */
export const selectSteamCandidate = (state, candidate) => ({
  ...state,
  selected: {
    appId: Number(candidate?.appId),
    name: String(candidate?.name ?? '')
  }
});

/**
 * The selection was cleared explicitly.
 *
 * The candidates stay on screen, so the administrator can pick again
 * without searching again.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const clearSteamSelection = (state) => ({
  ...state,
  selected: null
});
