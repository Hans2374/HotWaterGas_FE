/**
 * The AI translation draft lifecycle — pure state transitions.
 *
 * This module is deliberately **dependency-free**, so the whole lifecycle
 * can be exercised offline by the test suite without a bundler, a
 * browser, or a network — exactly like `utils/steamSearchState.js`.
 *
 * ── The rules this module owns ────────────────────────────────────────────
 * The interesting rules of this feature are all about *when* state may
 * change:
 *
 *   * a draft lives apart from the product form, and reaches it only
 *     through an explicit apply;
 *   * a failed translation must not destroy an existing draft or the
 *     administrator's edits to it;
 *   * an edited draft must never be replaced without a confirmation;
 *   * a response for an old product name or an old Steam selection must
 *     never replace the current draft;
 *   * a duplicate request must be refused;
 *   * a discarded draft must leave the product form exactly as it was;
 *   * a multi-platform result must never be reduced to one platform
 *     without the administrator's explicit choice.
 *
 * Expressing those rules as pure functions — rather than as scattered
 * `setState` calls inside a component — is what makes them verifiable
 * without a DOM. The component owns the state and the request-id ref;
 * this module owns the rules.
 */

/**
 * The initial translation state.
 *
 * @returns {{
 *   translation: object|null,
 *   text: string,
 *   isGenerating: boolean,
 *   error: { status: number, message: string }|null,
 *   isConfirmingReplace: boolean,
 *   chosenPlatform: string|null
 * }}
 */
export const createAiDescriptionState = () => ({
  translation: null,
  text: '',
  isGenerating: false,
  error: null,
  isConfirmingReplace: false,
  chosenPlatform: null
});

/**
 * Decide whether a response may still be applied.
 *
 * A response is stale when it belongs to a request that is no longer the
 * latest one — because a newer translation started, because the product
 * name changed, because a different Steam candidate was selected, or
 * because the draft was discarded.
 *
 * @param {number} responseRequestId The id the request was issued with.
 * @param {number} currentRequestId  The id of the latest issued request.
 * @returns {boolean} True when the response must be discarded.
 */
export const isStaleAiDescriptionResponse = (responseRequestId, currentRequestId) =>
  responseRequestId !== currentRequestId;

/**
 * A translation request has started.
 *
 * The previous error is cleared, so a retry never shows a stale outcome,
 * and the replacement confirmation is dismissed.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const startAiDescriptionRequest = (state) => ({
  ...state,
  isGenerating: true,
  error: null,
  isConfirmingReplace: false
});

/**
 * A translation succeeded.
 *
 * The draft and its text are replaced. The **platform choice is reset**:
 * the previous choice referred to the previous result's platform list,
 * and carrying it over would apply a stale decision to a new set of
 * platforms.
 *
 * @param {object} state
 * @param {object} translation The translation response.
 * @param {string} text The translated text.
 * @returns {object} The next state.
 */
export const succeedAiDescriptionRequest = (state, translation, text) => ({
  ...state,
  translation,
  text: typeof text === 'string' ? text : '',
  isGenerating: false,
  error: null,
  isConfirmingReplace: false,
  chosenPlatform: null
});

/**
 * A translation failed.
 *
 * The existing draft **and the administrator's edits to it** are
 * preserved: the failure sets the error and nothing else. Losing a
 * draft because a retry failed would be the worst possible outcome.
 *
 * @param {object} state
 * @param {{ status: number, message: string }} error The controlled error.
 * @returns {object} The next state.
 */
export const failAiDescriptionRequest = (state, error) => ({
  ...state,
  isGenerating: false,
  error: error || null
});

/**
 * The draft was discarded.
 *
 * Everything about the translation is cleared. The product form is not
 * touched by this transition at all — discarding a draft leaves the form
 * exactly as it was.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const discardAiDescription = (state) => ({
  ...state,
  translation: null,
  text: '',
  isGenerating: false,
  error: null,
  isConfirmingReplace: false,
  chosenPlatform: null
});

/**
 * The administrator edited the translated text.
 *
 * @param {object} state
 * @param {string} text The edited text.
 * @returns {object} The next state.
 */
export const editAiDescriptionText = (state, text) => ({
  ...state,
  text: typeof text === 'string' ? text : ''
});

/**
 * Ask for confirmation before replacing an edited draft.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const requestAiDescriptionReplaceConfirmation = (state) => ({
  ...state,
  isConfirmingReplace: true
});

/**
 * The administrator declined to replace the edited draft.
 *
 * The draft and its edits are untouched.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const cancelAiDescriptionReplaceConfirmation = (state) => ({
  ...state,
  isConfirmingReplace: false
});

/**
 * The administrator confirmed the replacement.
 *
 * The platform choice is reset, because the new result carries a
 * different platform list.
 *
 * @param {object} state
 * @returns {object} The next state.
 */
export const confirmAiDescriptionReplace = (state) => ({
  ...state,
  isConfirmingReplace: false,
  chosenPlatform: null
});

/**
 * The administrator chose the platform to persist.
 *
 * The choice is explicit by construction: there is no path that derives
 * a platform from the returned list without the administrator acting.
 *
 * @param {object} state
 * @param {string|null} platform The chosen platform, or null to clear.
 * @returns {object} The next state.
 */
export const selectAiDescriptionPlatform = (state, platform) => ({
  ...state,
  chosenPlatform: platform ?? null
});
