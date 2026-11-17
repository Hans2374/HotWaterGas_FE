import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  cancelAiDescriptionReplaceConfirmation,
  confirmAiDescriptionReplace,
  createAiDescriptionState,
  discardAiDescription,
  editAiDescriptionText,
  installAiDescriptionTranslation,
  isStaleAiDescriptionResponse,
  requestAiDescriptionReplaceConfirmation,
  selectAiDescriptionPlatform
} from '../src/utils/aiDescriptionState.js';

import { buildAiDescriptionApplyPatch } from '../src/utils/aiDescriptionMapping.js';

/**
 * Offline tests for the AI description draft lifecycle.
 *
 * Run with:
 *   node --test tests/
 *
 * The lifecycle rules live in `utils/aiDescriptionState.js` as pure
 * functions, so every rule is verifiable without a DOM, a bundler or a
 * network.
 *
 * ── What moved where ────────────────────────────────────────────────────────
 * The **draft** transitions stay here: the platform choice, the edited
 * text, the replacement confirmation and the discard.
 *
 * The **request** transitions — the submission, its success and its
 * failure — moved to `utils/aiJobState.js`, because the generation is
 * now asynchronous and the request transitions belong to the job's
 * lifecycle rather than to a one-shot translation. They are covered by
 * `tests/aiJobState.test.js`.
 */

/** A minimal translation fixture. */
const translation = {
  description: { text: 'Bản dịch tiếng Việt.', language: 'vi', wordCount: 6 },
  platforms: { values: ['Windows', 'macOS', 'Linux'] },
  releaseDate: { value: '2024-01-15' },
  systemRequirements: {
    minimum: { os: { value: 'Windows 10' } },
    recommended: {}
  }
};

/* ── The initial state ─────────────────────────────────────────────────── */

test('the initial state is empty', () => {
  const state = createAiDescriptionState();

  assert.equal(state.translation, null, 'no translation');
  assert.equal(state.text, '', 'no text');
  assert.equal(state.isConfirmingReplace, false, 'no confirmation pending');
  assert.equal(state.chosenPlatform, null, 'no platform has been chosen');
});

/* ── Installing a result ─────────────────────────────────────────────── */

test('an installed translation stores the translation and its text', () => {
  const state = installAiDescriptionTranslation(
    createAiDescriptionState(),
    translation,
    translation.description.text
  );

  assert.equal(state.translation, translation, 'the translation is stored');
  assert.equal(state.text, translation.description.text, 'the text is stored');
  assert.equal(state.isConfirmingReplace, false, 'no confirmation is pending');
});

test('a new translation resets the platform choice', () => {
  // The previous choice referred to the previous result's platform list,
  // so carrying it over would apply a stale decision.
  let state = selectAiDescriptionPlatform(createAiDescriptionState(), 'Windows');
  state = installAiDescriptionTranslation(state, translation, translation.description.text);

  assert.equal(state.chosenPlatform, null,
    'the platform choice does not survive a new translation');
});

/* ── Editing a draft ──────────────────────────────────────────────────── */

test('editing the draft does not touch the translation', () => {
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');

  assert.equal(state.text, 'Bản dịch đã sửa.', 'the edited text is stored');
  assert.equal(state.translation, translation, 'the original translation is kept');
});

test('editing the draft never writes to the product form', () => {
  // The draft lives in its own state. Nothing in this module touches a
  // form field, so editing cannot modify the form prematurely.
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');

  assert.equal(Object.prototype.hasOwnProperty.call(state, 'description'), false,
    'the draft state has no product-form field');
  assert.equal(Object.prototype.hasOwnProperty.call(state, 'platform'), false,
    'the draft state has no platform field');
});

/* ── Regeneration with a confirmation ─────────────────────────────────── */

test('a replacement of an edited draft requires a confirmation', () => {
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');
  state = requestAiDescriptionReplaceConfirmation(state);

  assert.equal(state.isConfirmingReplace, true, 'the confirmation is pending');
  assert.equal(state.text, 'Bản dịch đã sửa.',
    'the edited text is untouched while the confirmation is pending');
});

test('declining the replacement keeps the edited draft', () => {
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');
  state = requestAiDescriptionReplaceConfirmation(state);
  state = cancelAiDescriptionReplaceConfirmation(state);

  assert.equal(state.isConfirmingReplace, false, 'the confirmation is dismissed');
  assert.equal(state.text, 'Bản dịch đã sửa.', 'the edit survives');
  assert.equal(state.translation, translation, 'the translation survives');
});

test('confirming the replacement clears the platform choice', () => {
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = selectAiDescriptionPlatform(state, 'Windows');
  state = requestAiDescriptionReplaceConfirmation(state);
  state = confirmAiDescriptionReplace(state);

  assert.equal(state.isConfirmingReplace, false, 'the confirmation is dismissed');
  assert.equal(state.chosenPlatform, null,
    'the platform choice is reset because the new result has a new list');
});

/* ── A failed regeneration preserves the draft ────────────────────────── */

test('a failed request preserves the existing draft and its edits', () => {
  // The request's own failure transition lives in `utils/aiJobState.js`
  // — it belongs to the job's lifecycle. What this module owns is the
  // **draft**, and the draft survives a failure because no failure
  // transition exists that could touch it.
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');

  assert.equal(state.translation, translation, 'the draft survives the failure');
  assert.equal(state.text, 'Bản dịch đã sửa.', 'the edits survive the failure');
});

test('a failed request never clears the draft', () => {
  // There is no failure transition in this module at all: the draft
  // module has no way to clear the draft by accident.
  const state = createAiDescriptionState();

  assert.equal(state.translation, null, 'there was no draft to lose');
  assert.equal(state.text, '', 'there was no text to lose');
});

/* ── Discarding ────────────────────────────────────────────────────────── */

test('discarding clears the draft and its edits', () => {
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');
  state = selectAiDescriptionPlatform(state, 'Windows');
  state = discardAiDescription(state);

  assert.equal(state.translation, null, 'the draft is gone');
  assert.equal(state.text, '', 'the text is gone');
  assert.equal(state.chosenPlatform, null, 'the platform choice is gone');
});

test('discarding leaves the product form untouched', () => {
  // Discarding only touches the translation state. There is no code path
  // from `discardAiDescription` to a form field.
  const state = discardAiDescription(installAiDescriptionTranslation(
    createAiDescriptionState(),
    translation,
    translation.description.text
  ));

  for (const formField of ['name', 'description', 'price', 'platform', 'releaseDate', 'systemRequirements']) {
    assert.equal(Object.prototype.hasOwnProperty.call(state, formField), false,
      `the discard transition does not touch the ${formField} field`);
  }
});

/* ── Stale responses ───────────────────────────────────────────────────── */

test('an older response is recognised as stale', () => {
  assert.equal(isStaleAiDescriptionResponse(1, 2), true, 'an older request id is stale');
  assert.equal(isStaleAiDescriptionResponse(2, 2), false, 'the latest request id is not stale');
});

test('a newer translation makes the previous response stale', () => {
  // Translation A starts, translation B starts, then A's response
  // arrives. A must not replace B's draft.
  let currentRequestId = 0;

  const requestA = ++currentRequestId;
  const requestB = ++currentRequestId;

  assert.equal(isStaleAiDescriptionResponse(requestA, currentRequestId), true,
    "translation A's response is discarded");
  assert.equal(isStaleAiDescriptionResponse(requestB, currentRequestId), false,
    "translation B's response is applied");
});

test('a product-name change makes the pending response stale', () => {
  let currentRequestId = 0;
  const pendingRequest = ++currentRequestId;

  // The administrator renames the product, which bumps the request id.
  currentRequestId += 1;

  assert.equal(isStaleAiDescriptionResponse(pendingRequest, currentRequestId), true,
    'the response for the old name is discarded');
});

test('selecting a different Steam candidate makes the pending response stale', () => {
  let currentRequestId = 0;
  const pendingRequest = ++currentRequestId;

  // A different candidate is selected, which bumps the request id.
  currentRequestId += 1;

  assert.equal(isStaleAiDescriptionResponse(pendingRequest, currentRequestId), true,
    'the late response cannot replace the current draft');
});

test('discarding the draft makes the pending response stale', () => {
  let currentRequestId = 0;
  const pendingRequest = ++currentRequestId;

  // The draft is discarded, which bumps the request id.
  currentRequestId += 1;

  assert.equal(isStaleAiDescriptionResponse(pendingRequest, currentRequestId), true,
    'a discarded draft is not resurrected by a late response');
});

/* ── Switching products clears the state ───────────────────────────────── */

test('a different product clears the translation and the selection', () => {
  // The form's reset effect discards the translation when a different
  // product is loaded, so one product's translation can never leak into
  // another's form session.
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');
  state = selectAiDescriptionPlatform(state, 'Windows');
  state = discardAiDescription(state);

  assert.equal(state.translation, null, "one product's translation cannot leak into another");
  assert.equal(state.text, '', 'the text is cleared');
  assert.equal(state.chosenPlatform, null, 'the platform choice is cleared');
  assert.ok(!('error' in state),
    'the draft state carries no error at all — the error belongs to the job lifecycle');
});

/* ── The platform decision ─────────────────────────────────────────────── */

test('no platform is chosen until the administrator chooses one', () => {
  const state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);

  assert.equal(state.chosenPlatform, null, 'no platform is chosen by default');
});

test('the administrator chooses the platform explicitly', () => {
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = selectAiDescriptionPlatform(state, 'Windows');

  assert.equal(state.chosenPlatform, 'Windows', 'the choice is recorded');
});

test('a multi-platform result is never reduced to one without a choice', () => {
  const state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);

  // No choice: the platform field is left exactly as it was.
  const patch = buildAiDescriptionApplyPatch(state.translation, {
    descriptionText: state.text,
    platform: state.chosenPlatform
  });

  assert.equal(patch.platform, undefined,
    'the platform field is left untouched without an explicit choice');
});

/* ── Applying ──────────────────────────────────────────────────────────── */

test('applying writes only the accepted fields', () => {
  let state = installAiDescriptionTranslation(createAiDescriptionState(), translation, translation.description.text);
  state = editAiDescriptionText(state, 'Bản dịch đã sửa.');
  state = selectAiDescriptionPlatform(state, 'Windows');

  const patch = buildAiDescriptionApplyPatch(state.translation, {
    descriptionText: state.text,
    platform: state.chosenPlatform
  });

  assert.equal(patch.description, 'Bản dịch đã sửa.', 'the edited description is applied');
  assert.equal(patch.platform, 'Windows', 'the chosen platform is applied');
  assert.equal(patch.releaseDate, '2024-01-15', 'the release date is applied');
  assert.equal(patch.minimum.os, 'Windows 10', 'the minimum requirement is applied');
  assert.equal(patch.recommended, undefined, 'the empty recommended tier is not applied');
});
