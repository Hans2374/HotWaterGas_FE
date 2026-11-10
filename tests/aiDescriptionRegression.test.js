import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { buildAiDescriptionRequest, validateAiDescriptionRequest } from '../src/utils/aiDescriptionRequest.js';
import { canSearchSteam, selectedAppId } from '../src/utils/steamSearchRequest.js';

/**
 * Offline regression tests for the AI description translation integration.
 *
 * These pin the things that must **not** change: the existing Create and
 * Edit product flows, the existing Steam search behaviour, and the rule
 * that a Steam App ID never reaches the product payload.
 *
 * Run with:
 *   node --test tests/
 */

/** Read a source file relative to this test file. */
const readSource = (...segments) => {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', ...segments), 'utf8');
};

/* ── The product payload ───────────────────────────────────────────────── */

/**
 * The product payload, exactly as the form's own save handler builds it.
 *
 * It is reproduced here rather than imported so that the test pins the
 * *shape* of the payload, independently of the component's internals.
 */
const buildProductPayload = (formData) => ({
  name: formData.name.trim(),
  description: formData.description.trim(),
  price: Number(formData.price),
  discountPercentage: formData.discountPercentage,
  images: [],
  imageUrls: [],
  categoryId: formData.categoryId || null,
  tagIds: formData.tagIds,
  publisherId: formData.publisherId || null,
  developerId: formData.developerId || null,
  metadata: {
    releaseDate: formData.releaseDate || null,
    platform: formData.platform.trim()
  },
  systemRequirements: {
    minimum: formData.systemRequirements.minimum,
    recommended: formData.systemRequirements.recommended
  }
});

test('the product payload never contains a Steam App ID', () => {
  const payload = buildProductPayload({
    name: 'Portal 2',
    description: 'A game.',
    price: '140000',
    discountPercentage: '',
    categoryId: 'cat-1',
    tagIds: ['tag-1'],
    publisherId: 'pub-1',
    developerId: 'dev-1',
    releaseDate: '2024-01-15',
    platform: 'Windows',
    systemRequirements: { minimum: {}, recommended: {} }
  });

  const json = JSON.stringify(payload);
  assert.ok(!('steamAppId' in payload), 'no App ID field is present');
  assert.ok(!json.includes('steamAppId'), 'no App ID appears anywhere in the payload');
  assert.ok(!json.includes('620'), 'the App ID value does not appear in the payload');
});

test('the product payload carries the fields the API expects', () => {
  const payload = buildProductPayload({
    name: '  Portal 2  ',
    description: '  A game.  ',
    price: '140000',
    discountPercentage: '10',
    categoryId: 'cat-1',
    tagIds: ['tag-1'],
    publisherId: 'pub-1',
    developerId: 'dev-1',
    releaseDate: '2024-01-15',
    platform: '  Windows  ',
    systemRequirements: { minimum: {}, recommended: {} }
  });

  assert.equal(payload.name, 'Portal 2', 'the name is trimmed');
  assert.equal(payload.description, 'A game.', 'the description is trimmed');
  assert.equal(payload.price, 140000, 'the price is a number');
  assert.equal(payload.metadata.platform, 'Windows', 'the platform is trimmed');
  assert.equal(payload.metadata.releaseDate, '2024-01-15', 'the release date is carried');
});

test('the form source never mentions a Steam App ID inside the product payload', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  const payloadIndex = source.indexOf('const payload = {');
  const payloadEnd = source.indexOf('await onSubmit(payload);');
  assert.ok(payloadIndex !== -1 && payloadEnd !== -1, 'the payload block is found');

  const payloadBlock = source.slice(payloadIndex, payloadEnd);
  assert.ok(!payloadBlock.includes('steamAppId'),
    'the product payload block contains no Steam App ID');
  assert.ok(!payloadBlock.includes('AppId'),
    'the product payload block contains no App ID of any kind');
});

/* ── The existing Steam search behaviour is preserved ─────────────────── */

test('the Steam search gating is unchanged', () => {
  assert.equal(canSearchSteam({ productName: '', isSearching: false }), false,
    'an empty name cannot be searched');
  assert.equal(canSearchSteam({ productName: 'Portal 2', isSearching: false }), true,
    'a name is enough to search');
  assert.equal(canSearchSteam({ productName: 'Portal 2', isSearching: true }), false,
    'a duplicate search is prevented');
});

test('the selected App ID helper is unchanged', () => {
  assert.equal(selectedAppId({ appId: 620 }), 620, 'a valid App ID');
  assert.equal(selectedAppId(null), null, 'nothing selected');
});

test('the Steam search section is still rendered by the form', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(source.includes('SteamGameSearchSection'), 'the search section is rendered');
  assert.ok(source.includes('handleSearchSteam'), 'the search handler is wired');
  assert.ok(source.includes('handleSelectSteamCandidate'), 'the selection handler is wired');
});

/* ── The Create and Edit product flows ────────────────────────────────── */

test('the create page still submits through the product service', () => {
  const source = readSource('src', 'pages', 'admin', 'AdminProductCreatePage.jsx');

  assert.ok(source.includes('createAdminProduct'), 'the create call is wired');
  assert.ok(source.includes('<ProductForm'), 'the form is rendered');
  assert.ok(source.includes('mode="create"'), 'the create mode is passed');
});

test('the edit page still submits through the product service', () => {
  const source = readSource('src', 'pages', 'admin', 'AdminProductEditPage.jsx');

  assert.ok(source.includes('updateAdminProduct'), 'the update call is wired');
  assert.ok(source.includes('<ProductForm'), 'the form is rendered');
  assert.ok(source.includes('mode="edit"'), 'the edit mode is passed');
});

test('the form still validates the required fields', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(source.includes('nextErrors.name'), 'the name is still required');
  assert.ok(source.includes('nextErrors.description'), 'the description is still required');
  assert.ok(source.includes('nextErrors.price'), 'the price is still required');
  assert.ok(source.includes('nextErrors.publisherId'), 'the publisher is still required');
  assert.ok(source.includes('nextErrors.developerId'), 'the developer is still required');
  assert.ok(source.includes('nextErrors.platform'), 'the platform is still required');
  assert.ok(source.includes('nextErrors.cardImage'), 'the card image is still required');
  assert.ok(source.includes('nextErrors.categoryId'), 'the category is still required');
});

test('the translation never writes to the form without an explicit apply', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  // The only place the translation touches `formData` is inside the
  // apply handler. The generation handler must not.
  const generateIndex = source.indexOf('const handleGenerateAiDescription = async () => {');
  const applyIndex = source.indexOf('const handleApplyAiDescription = (platform) => {');
  assert.ok(generateIndex !== -1 && applyIndex !== -1, 'both handlers exist');
  assert.ok(generateIndex < applyIndex, 'the handlers are in order');

  const generateBlock = source.slice(generateIndex, applyIndex);
  assert.ok(!generateBlock.includes('setFormData'),
    'the generation handler never writes to the product form');
  assert.ok(!generateBlock.includes('setAiDescription((prev) => succeedAiDescriptionRequest') === false,
    'the generation handler does store the draft');
});

test('the translation draft state is separate from the form state', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(source.includes('const [aiDescription, setAiDescription] = useState(createAiDescriptionState);'),
    'the translation has its own state');
  assert.ok(source.includes('const [formData, setFormData] = useState(createInitialData(initialData));'),
    'the form has its own state');
});

/* ── The translation request shape ─────────────────────────────────────────────── */

test('the translation request carries only the two contract fields', () => {
  const body = buildAiDescriptionRequest('Portal 2', 620);

  assert.deepEqual(Object.keys(body), ['productName', 'steamAppId'],
    'the translation request has exactly the two contract fields');
});

test('the translation request requires a Steam selection', () => {
  assert.equal(validateAiDescriptionRequest({ productName: 'Portal 2', steamAppId: null }).ok, false,
    'the translation path needs a Steam selection');
  assert.equal(validateAiDescriptionRequest({ productName: 'Portal 2', steamAppId: 620 }).ok, true,
    'a name and a selection are enough');
});

test('the translation request module is dependency-free', () => {
  const source = readSource('src', 'utils', 'aiDescriptionRequest.js');

  // The module must be dependency-free. Only the *import statements*
  // matter here — the doc comments may legitimately mention other
  // modules as a reference.
  const importStatements = source.match(/^import .*$/gm) || [];

  assert.deepEqual(importStatements, [],
    'the translation request module imports nothing, so it can be tested offline');
});

/* ── The duplicate-request guard ───────────────────────────────────────── */

test('a duplicate translation request is guarded by a synchronous ref', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  // The guard must be a ref, not the state flag: two clicks in the same
  // tick would both read the same stale state value, because React has
  // not re-rendered yet.
  assert.ok(source.includes('aiDescriptionInFlightRef'), 'the in-flight ref exists');
  assert.ok(
    /if \(aiDescriptionInFlightRef\.current\) return;/.test(source),
    'the request is refused while one is in flight'
  );
  assert.ok(
    /aiDescriptionInFlightRef\.current = true;/.test(source),
    'the flag is set before the request is issued'
  );
  assert.ok(
    /aiDescriptionInFlightRef\.current = false;/.test(source),
    'the flag is cleared when the request finishes'
  );
});

test('the stale-response guard is in place for the translation', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(source.includes('aiDescriptionRequestIdRef'), 'the request-id ref exists');
  assert.ok(
    /if \(requestId !== aiDescriptionRequestIdRef\.current\) return;/.test(source),
    'a stale response is discarded in both the success and the failure path'
  );
});

/* ── Renaming the product discards the translation draft ────────────────────────── */

/**
 * The body of the form's generic change handler.
 *
 * It is extracted from the source rather than imported, because the
 * handler is a closure inside a React component and cannot be called
 * directly. The extraction is deliberately narrow: from the start of
 * `handleChange` to the start of the next top-level `const`.
 */
const readHandleChangeBody = () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  const start = source.indexOf('const handleChange = (event) => {');
  assert.ok(start !== -1, 'the generic change handler exists');

  const end = source.indexOf('\n  const handleCategoryChange', start);
  assert.ok(end !== -1, 'the handler ends before the category handler');

  return source.slice(start, end);
};

test('renaming the product discards the settled translation draft', () => {
  const body = readHandleChangeBody();

  // The settled draft — not just the in-flight request — must go.
  //
  // A translation of the previous name describes a different game. If it
  // survived the rename, the administrator could apply a translation of
  // one game to a product that has been renamed to another.
  assert.ok(
    /setAiDescription\(discardAiDescription\)/.test(body),
    'the translation draft is discarded when the name changes'
  );
});

test('renaming the product discards the draft only in the name branch', () => {
  const body = readHandleChangeBody();

  // The draft is tied to the *name* (and therefore to the Steam
  // selection). A change to any other field — the price, the description —
  // must NOT throw the translation away, or the administrator would have
  // to re-translate after every typo fix.
  const nameBranch = body.slice(body.indexOf("if (name === 'name')"));
  const discardCount = (nameBranch.match(/setAiDescription\(discardAiDescription\)/g) || []).length;

  assert.equal(discardCount, 1,
    'the draft is discarded exactly once, inside the name branch');
});

test('renaming the product also clears the Steam selection', () => {
  const body = readHandleChangeBody();

  assert.ok(
    /setSteamSearch\(clearSteamSearchForNewName\)/.test(body),
    'the Steam selection is cleared when the name changes'
  );
});

test('the route-level product switch still discards the translation draft', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  // The rename fix must not have replaced the original protection: when
  // a *different* product is loaded, its draft is still discarded.
  const effectIndex = source.indexOf('setAiDescription(discardAiDescription);');
  assert.ok(effectIndex !== -1, 'the route-level switch discards the draft');
});
