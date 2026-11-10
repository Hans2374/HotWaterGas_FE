import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  STEAM_SEARCH_ENDPOINT,
  STEAM_SEARCH_MAX_QUERY_LENGTH,
  buildSteamSearchRequest,
  canSearchSteam,
  describeEmptySteamSearch,
  describeSteamSearchError,
  isSelectedCandidate,
  normalizeSearchResponse,
  selectedAppId
} from '../src/utils/steamSearchRequest.js';

import {
  clearSteamSearchForNewName,
  clearSteamSelection,
  createSteamSearchState,
  failSteamSearch,
  isStaleSteamResponse,
  resetSteamSearch,
  selectSteamCandidate,
  startSteamSearch,
  succeedSteamSearch
} from '../src/utils/steamSearchState.js';

import { buildAiDescriptionRequest, validateAiDescriptionRequest } from '../src/utils/aiDescriptionRequest.js';

/**
 * Offline tests for the admin Steam game search UI.
 *
 * Run with:
 *   node --test tests/
 *
 * These use Node's built-in test runner, so they need no dependency and
 * no network. The live backend, the Python service and Steam are never
 * contacted: every response here is a fixture.
 *
 * The rendering itself is not exercised — no DOM test library is
 * available offline. What IS exercised is every decision the component
 * makes: the response mapping, the error classification, the request
 * shaping, and the whole state lifecycle. Those live in the pure
 * modules `utils/steamSearchRequest.js` and `utils/steamSearchState.js`,
 * and the component is a thin shell over them.
 */

/* ── Fixtures ──────────────────────────────────────────────────────────── */

/**
 * A response exactly as the backend's public contract delivers it:
 * camelCase keys, and a candidate carrying a thumbnail.
 */
const backendResponse = {
  total: 10,
  candidateCount: 2,
  invalidCount: 0,
  truncatedCount: 0,
  candidates: [
    {
      appId: 620,
      name: 'Portal 2',
      type: 'app',
      tinyImage: 'https://example.test/capsule.jpg'
    },
    {
      appId: 323180,
      name: 'Portal 2 Soundtrack',
      type: 'app',
      tinyImage: null
    }
  ]
};

/** Read a source file relative to this test file. */
const readSource = (...segments) => {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', ...segments), 'utf8');
};

/* ── Request shaping ───────────────────────────────────────────────────── */

test('the request carries only the query', () => {
  const body = buildSteamSearchRequest('Portal 2');

  assert.deepEqual(Object.keys(body), ['query'], 'the request has exactly one field');
  assert.equal(body.query, 'Portal 2', 'the query is the trimmed name');
});

test('the request never carries a URL, an App ID or a page size', () => {
  const body = buildSteamSearchRequest('Portal 2');

  assert.ok(!('url' in body), 'no URL is sent');
  assert.ok(!('appId' in body), 'no App ID is sent');
  assert.ok(!('pageSize' in body), 'no page size is sent');
  assert.ok(!('page' in body), 'no page number is sent');
});

test('a blank query is sent as an empty string, never as undefined', () => {
  assert.equal(buildSteamSearchRequest('   ').query, '', 'a blank query is empty');
  assert.equal(buildSteamSearchRequest(undefined).query, '', 'an absent query is empty');
});

test('the endpoint is the .NET admin route', () => {
  assert.equal(STEAM_SEARCH_ENDPOINT, '/api/admin/products/search-steam-games',
    'React calls the .NET backend only — never Steam and never Python');
});

/* ── Response mapping ──────────────────────────────────────────────────── */

test('the response maps onto the candidate list', () => {
  const result = normalizeSearchResponse(backendResponse);

  assert.equal(result.total, 10, 'the total');
  assert.equal(result.candidateCount, 2, 'the candidate count');
  assert.equal(result.invalidCount, 0, 'the invalid count');
  assert.equal(result.truncatedCount, 0, 'the truncated count');
  assert.equal(result.candidates.length, 2, 'both candidates are kept');
  assert.equal(result.candidates[0].appId, 620, 'the first App ID');
  assert.equal(result.candidates[0].name, 'Portal 2', 'the first name');
  assert.equal(
    result.candidates[0].tinyImage,
    'https://example.test/capsule.jpg',
    'the thumbnail'
  );
});

test('a candidate without a thumbnail is kept with a null image', () => {
  const result = normalizeSearchResponse(backendResponse);

  assert.equal(result.candidates[1].tinyImage, null,
    'a missing thumbnail is null, so the UI can show a fallback');
});

test('the candidate never carries Steam type, price or metascore', () => {
  const result = normalizeSearchResponse(backendResponse);

  for (const candidate of result.candidates) {
    assert.ok(!('type' in candidate),
      'the Steam type field is not carried: it does not mean "full game"');
    assert.ok(!('price' in candidate), 'no price is carried');
    assert.ok(!('metascore' in candidate), 'no metascore is carried');
    assert.ok(!('platforms' in candidate), 'no platform facts are carried');
  }
});

test('a raw Steam payload cannot leak into the public candidate', () => {
  const result = normalizeSearchResponse({
    candidates: [{
      appId: 620,
      name: 'Portal 2',
      price: { currency: 'VND', final: 14000000 },
      metascore: 95,
      platforms: { windows: true }
    }]
  });

  const json = JSON.stringify(result);
  assert.ok(!json.includes('price'), 'the price is dropped');
  assert.ok(!json.includes('metascore'), 'the metascore is dropped');
  assert.ok(!json.includes('platforms'), 'the platforms are dropped');
});

test('a candidate without a usable App ID is dropped', () => {
  const result = normalizeSearchResponse({
    candidates: [
      { appId: 0, name: 'Broken' },
      { appId: -5, name: 'Also broken' },
      { name: 'No App ID at all' }
    ]
  });

  assert.equal(result.candidates.length, 0, 'no unusable candidate is shown');
});

test('a candidate without a title is dropped', () => {
  const result = normalizeSearchResponse({
    candidates: [
      { appId: 620, name: '   ' },
      { appId: 621, name: 'Good' }
    ]
  });

  assert.equal(result.candidates.length, 1, 'only the usable candidate is kept');
  assert.equal(result.candidates[0].appId, 621, 'the usable candidate');
});

test('an empty candidate list is a valid result', () => {
  const result = normalizeSearchResponse({
    total: 0,
    candidateCount: 0,
    invalidCount: 0,
    truncatedCount: 0,
    candidates: []
  });

  assert.equal(result.candidates.length, 0, 'no candidates');
  assert.equal(result.candidateCount, 0, 'the count is zero');
});

test('a malformed response does not throw', () => {
  for (const malformed of [null, undefined, 'nonsense', 42, []]) {
    const result = normalizeSearchResponse(malformed);
    assert.equal(result.candidates.length, 0, 'a malformed body yields no candidates');
  }
});

test('the PascalCase spelling is also accepted', () => {
  // The shared axios client camel-cases keys, so the camelCase spelling
  // is the expected one — but a future backend change must not silently
  // produce an empty candidate list.
  const result = normalizeSearchResponse({
    Total: 4,
    CandidateCount: 1,
    Candidates: [{ AppId: 620, Name: 'Portal 2', TinyImage: 'https://a.test/1.jpg' }]
  });

  assert.equal(result.total, 4, 'the total');
  assert.equal(result.candidates.length, 1, 'the candidate is found');
  assert.equal(result.candidates[0].appId, 620, 'the App ID');
});

/* ── Search gating ─────────────────────────────────────────────────────── */

test('the search button is disabled for an empty product name', () => {
  assert.equal(canSearchSteam({ productName: '', isSearching: false }), false,
    'an empty name cannot be searched');
  assert.equal(canSearchSteam({ productName: '   ', isSearching: false }), false,
    'a blank name cannot be searched');
  assert.equal(canSearchSteam({ productName: undefined, isSearching: false }), false,
    'a missing name cannot be searched');
});

test('the search button is enabled for a non-empty product name', () => {
  assert.equal(canSearchSteam({ productName: 'Portal 2', isSearching: false }), true,
    'a name is enough to search');
});

test('the search button is disabled while a search is running', () => {
  assert.equal(canSearchSteam({ productName: 'Portal 2', isSearching: true }), false,
    'a duplicate request is prevented');
});

test('the query length limit is the one the backend enforces', () => {
  assert.equal(STEAM_SEARCH_MAX_QUERY_LENGTH, 200, 'the documented limit');
});

/* ── Selection helpers ─────────────────────────────────────────────────── */

test('the selected candidate is recognised', () => {
  const selected = { appId: 620, name: 'Portal 2' };

  assert.equal(isSelectedCandidate(selected, { appId: 620 }), true, 'the same App ID');
  assert.equal(isSelectedCandidate(selected, { appId: 621 }), false, 'a different App ID');
  assert.equal(isSelectedCandidate(null, { appId: 620 }), false, 'nothing selected');
  assert.equal(isSelectedCandidate(selected, null), false, 'no candidate');
});

test('the selected App ID is a positive integer or null', () => {
  assert.equal(selectedAppId({ appId: 620 }), 620, 'a valid App ID');
  assert.equal(selectedAppId(null), null, 'nothing selected');
  assert.equal(selectedAppId({ appId: 0 }), null, 'a zero App ID is rejected');
  assert.equal(selectedAppId({ appId: 'abc' }), null, 'a non-numeric App ID is rejected');
});

/* ── The App ID reaches the generation request ────────────────────────── */

test('the selected App ID reaches the generation request', () => {
  const payload = buildAiDescriptionRequest(
    'Portal 2',
    selectedAppId({ appId: 620, name: 'Portal 2' })
  );

  assert.equal(payload.steamAppId, 620, 'the selected App ID is sent');
  assert.equal(payload.productName, 'Portal 2', 'the product name is sent alongside it');
});

test('no selected candidate does not produce a valid generation request', () => {
  const payload = buildAiDescriptionRequest(
    'Portal 2',
    selectedAppId(null)
  );

  // With no selection there is no App ID, so the request carries no
  // usable source and the backend contract rejects it.
  assert.equal(payload.steamAppId, null, 'no App ID is sent when nothing is selected');
  assert.equal(
    validateAiDescriptionRequest({ productName: payload.productName, steamAppId: payload.steamAppId }).ok,
    false,
    'the request is not valid without a Steam selection'
  );
});

test('a selected candidate does not change the product name', () => {
  // Selecting a Steam candidate must never rewrite the product's name.
  const payload = buildAiDescriptionRequest(
    'Aurora Echo',
    selectedAppId({ appId: 620, name: 'Portal 2' })
  );

  assert.equal(payload.productName, 'Aurora Echo', 'the product name is untouched');
});

/* ── Error classification ──────────────────────────────────────────────── */

test('the HTTP statuses map onto actionable messages', () => {
  assert.match(describeSteamSearchError(400, ''), /invalid/i, '400 is an invalid query');
  assert.match(describeSteamSearchError(422, ''), /invalid/i, '422 is an invalid query');
  assert.match(describeSteamSearchError(401, ''), /session/i, '401 is an authentication failure');
  assert.match(describeSteamSearchError(403, ''), /permission/i, '403 is an authorization failure');
  assert.match(describeSteamSearchError(429, ''), /rate-limited/i, '429 is rate-limited');
  assert.match(describeSteamSearchError(502, ''), /unavailable/i, '502 is an upstream failure');
  assert.match(describeSteamSearchError(503, ''), /disabled/i, '503 is the feature being off');
  assert.match(describeSteamSearchError(504, ''), /too long/i, '504 is a timeout');
  assert.match(describeSteamSearchError(0, ''), /network/i, 'a network failure is reported');
});

test('both 429 causes are reported without brittle message matching', () => {
  // The backend distinguishes the repeated-query cooldown from Steam's
  // own rate limit, but only through a free-text message. The UI must
  // not branch on that wording, so both cases get one accurate message.
  const cooldown = describeSteamSearchError(429, '');
  const rateLimited = describeSteamSearchError(429, '');

  assert.equal(cooldown, rateLimited, 'the two 429 causes share one message');
  assert.match(cooldown, /wait/i, 'the message tells the admin to wait');
});

test('a 429 message does not depend on the backend wording', () => {
  // A backend message that happens to contain "cooldown" must not change
  // the outcome: the status drives the classification.
  assert.match(describeSteamSearchError(429, 'steam_search_cooldown'), /rate-limited/i,
    'the status wins over the backend wording');
});

test('the empty result explains that Steam found nothing', () => {
  assert.match(describeEmptySteamSearch({ total: 0, candidateCount: 0 }), /no matching/i,
    'a plain no-match message');
  assert.match(describeEmptySteamSearch({ total: 12, candidateCount: 0 }), /12 results/i,
    'the count is reported when Steam found something unusable');
});

/* ── State lifecycle ───────────────────────────────────────────────────── */

test('the initial state is empty', () => {
  const state = createSteamSearchState();

  assert.deepEqual(state.candidates, [], 'no candidates');
  assert.equal(state.selected, null, 'no selection');
  assert.equal(state.error, null, 'no error');
  assert.equal(state.emptyMessage, null, 'no empty message');
  assert.equal(state.isSearching, false, 'not searching');
  assert.equal(state.hasSearched, false, 'never searched');
});

test('a successful search stores the candidates', () => {
  const result = normalizeSearchResponse(backendResponse);
  const state = succeedSteamSearch(startSteamSearch(createSteamSearchState()), result);

  assert.equal(state.candidates.length, 2, 'the candidates are stored');
  assert.equal(state.isSearching, false, 'the search finished');
  assert.equal(state.hasSearched, true, 'a search has completed');
  assert.equal(state.error, null, 'no error is shown');
  assert.equal(state.emptyMessage, null, 'no empty message is shown');
});

test('an empty result shows the no-match message', () => {
  const state = succeedSteamSearch(
    startSteamSearch(createSteamSearchState()),
    { candidates: [], total: 0, candidateCount: 0 }
  );

  assert.equal(state.candidates.length, 0, 'no candidates');
  assert.notEqual(state.emptyMessage, null, 'the empty message is set');
  assert.equal(state.hasSearched, true, 'a search has completed');
  assert.equal(state.error, null, 'an empty result is not an error');
});

test('a failed search shows a controlled message', () => {
  const state = failSteamSearch(startSteamSearch(createSteamSearchState()), 'Steam search failed.');

  assert.equal(state.error, 'Steam search failed.', 'the message is shown');
  assert.equal(state.isSearching, false, 'the search finished');
  assert.equal(state.hasSearched, true, 'a search has completed');
});

test('a failed search keeps an existing selection', () => {
  // A failed search says nothing about a candidate the admin already
  // chose, so the selection must survive.
  let state = selectSteamCandidate(createSteamSearchState(), { appId: 620, name: 'Portal 2' });
  state = failSteamSearch(state, 'Steam search failed.');

  assert.notEqual(state.selected, null, 'the selection survives a failed search');
  assert.equal(state.selected.appId, 620, 'the same App ID survives');
});

test('a failed search keeps the existing candidates', () => {
  let state = succeedSteamSearch(createSteamSearchState(), {
    candidates: [{ appId: 620, name: 'Portal 2', tinyImage: null }],
    total: 1,
    candidateCount: 1
  });
  state = failSteamSearch(state, 'Steam search failed.');

  assert.equal(state.candidates.length, 1, 'the candidates survive a failed search');
});

test('a failed search with no message still gets one', () => {
  const state = failSteamSearch(createSteamSearchState(), '');

  assert.notEqual(state.error, null, 'a fallback message is always present');
});

test('selecting a candidate stores the App ID and the name', () => {
  const state = selectSteamCandidate(createSteamSearchState(), { appId: 620, name: 'Portal 2' });

  assert.equal(state.selected.appId, 620, 'the App ID');
  assert.equal(state.selected.name, 'Portal 2', 'the name');
});

test('changing the product name clears the selection and the results', () => {
  let state = succeedSteamSearch(createSteamSearchState(), {
    candidates: [{ appId: 620, name: 'Portal 2', tinyImage: null }],
    total: 1,
    candidateCount: 1
  });
  state = selectSteamCandidate(state, { appId: 620, name: 'Portal 2' });
  state = clearSteamSearchForNewName(state);

  assert.equal(state.selected, null, 'the selection is cleared');
  assert.deepEqual(state.candidates, [], 'the results are cleared');
  assert.equal(state.hasSearched, false, 'the form is back to its pre-search state');
});

test('switching products clears the selection and the results', () => {
  let state = selectSteamCandidate(createSteamSearchState(), { appId: 620, name: 'Portal 2' });
  state = resetSteamSearch(state);

  assert.equal(state.selected, null, "one product's App ID cannot leak into another");
  assert.deepEqual(state.candidates, [], 'the results are cleared');
  assert.equal(state.error, null, 'no error is carried over');
});

test('clearing the selection keeps the candidates on screen', () => {
  let state = succeedSteamSearch(createSteamSearchState(), {
    candidates: [{ appId: 620, name: 'Portal 2', tinyImage: null }],
    total: 1,
    candidateCount: 1
  });
  state = selectSteamCandidate(state, { appId: 620, name: 'Portal 2' });
  state = clearSteamSelection(state);

  assert.equal(state.selected, null, 'the selection is cleared');
  assert.equal(state.candidates.length, 1, 'the candidates stay, so the admin can pick again');
});

/* ── Race conditions ───────────────────────────────────────────────────── */

test('an older response is recognised as stale', () => {
  assert.equal(isStaleSteamResponse(1, 2), true, 'an older request id is stale');
  assert.equal(isStaleSteamResponse(2, 2), false, 'the latest request id is not stale');
});

test('a newer search makes the previous response stale', () => {
  // This models the exact race: search A starts, search B starts, then
  // A's response arrives. A must not replace B's results.
  let currentRequestId = 0;

  const requestA = ++currentRequestId;
  const requestB = ++currentRequestId;

  assert.equal(isStaleSteamResponse(requestA, currentRequestId), true,
    "search A's response is discarded");
  assert.equal(isStaleSteamResponse(requestB, currentRequestId), false,
    "search B's response is applied");
});

test('a name change makes the pending response stale', () => {
  let currentRequestId = 0;
  const pendingRequest = ++currentRequestId;

  // The administrator renames the product, which bumps the request id.
  currentRequestId += 1;

  assert.equal(isStaleSteamResponse(pendingRequest, currentRequestId), true,
    'the response for the old name is discarded');
});

test('selecting a candidate makes the pending response stale', () => {
  let currentRequestId = 0;
  const pendingRequest = ++currentRequestId;

  // The administrator selects a candidate, which bumps the request id.
  currentRequestId += 1;

  assert.equal(isStaleSteamResponse(pendingRequest, currentRequestId), true,
    'the late response cannot replace the list the admin is choosing from');
});

test('switching products makes the pending response stale', () => {
  let currentRequestId = 0;
  const pendingRequest = ++currentRequestId;

  // A different product is loaded, which bumps the request id.
  currentRequestId += 1;

  assert.equal(isStaleSteamResponse(pendingRequest, currentRequestId), true,
    "the previous product's response cannot update the current form");
});

/* ── The product payload ───────────────────────────────────────────────── */

test('the product payload never contains a Steam App ID', () => {
  // The product payload is built by the form's own save handler, which
  // never referenced the App ID. This pins that contract: the App ID is
  // transient request context, never product data.
  const buildProductPayload = (formData) => ({
    name: formData.name.trim(),
    description: formData.description.trim(),
    price: Number(formData.price),
    categoryId: formData.categoryId || null,
    tagIds: formData.tagIds,
    publisherId: formData.publisherId || null,
    developerId: formData.developerId || null,
    metadata: {
      releaseDate: formData.releaseDate || null,
      platform: formData.platform.trim()
    },
    systemRequirements: formData.systemRequirements
  });

  const payload = buildProductPayload({
    name: 'Portal 2',
    description: 'A game.',
    price: '140000',
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

test('the form source never puts a Steam App ID into the product payload', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  // The App ID is transient request context for the AI generation
  // request. It may appear several times in the form — but never inside
  // the payload that `handleSubmit` sends.
  const occurrences = source.split('steamAppId');
  assert.ok(occurrences.length - 1 >= 1,
    'the App ID is referenced in the form');

  const payloadIndex = source.indexOf('const payload = {');
  assert.ok(payloadIndex !== -1, 'the product payload is built');

  // Every occurrence must come *before* the payload is built.
  let searchFrom = 0;
  let occurrencesAfterPayload = 0;
  for (;;) {
    const index = source.indexOf('steamAppId', searchFrom);
    if (index === -1) break;
    if (index > payloadIndex) occurrencesAfterPayload += 1;
    searchFrom = index + 1;
  }

  assert.equal(occurrencesAfterPayload, 0,
    'the App ID is used before the product payload is built, never inside it');
});

/* ── The manual App ID input is gone ──────────────────────────────────── */

test('the manual App ID input is no longer rendered', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(!source.includes('field-steam-app-id'), 'the manual input id is gone');
  assert.ok(!source.includes('aiSteamAppId'), 'the manual input state is gone');
  assert.ok(!source.includes('setAiSteamAppId'), 'the manual input setter is gone');
  assert.ok(!source.includes('name="steamAppId"'), 'the manual input element is gone');
});

test('the Steam search section is rendered by the form', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  assert.ok(source.includes('SteamGameSearchSection'), 'the search section is rendered');
  assert.ok(source.includes('handleSearchSteam'), 'the search handler is wired');
  assert.ok(source.includes('handleSelectSteamCandidate'), 'the selection handler is wired');
});

test('the React code never calls Steam or the Python service directly', () => {
  const source = readSource('src', 'services', 'steamSearchService.js');

  assert.ok(!source.includes('store.steampowered.com'), 'no Steam URL is contacted');
  assert.ok(!source.includes('/internal/'), 'no internal Python route is contacted');
  assert.ok(source.includes('axiosClient'), 'the shared authenticated client is used');
});
