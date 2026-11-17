import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  AI_JOB_ENDPOINT,
  AI_JOB_MAX_PRODUCT_NAME_LENGTH,
  AI_JOB_OPERATION_TYPES,
  buildAiJobRequest,
  describeAiJobError,
  isValidAiJobOperationType,
  normalizeAiJobProductId,
  validateAiJobRequest
} from '../src/utils/aiJobRequest.js';

import {
  AI_DESCRIPTION_MAX_STEAM_APP_ID,
  AI_DESCRIPTION_MIN_STEAM_APP_ID,
  normalizeAiDescriptionSteamAppId
} from '../src/utils/aiDescriptionRequest.js';

import { selectedAppId } from '../src/utils/steamSearchRequest.js';

/**
 * Offline tests for the AI generation job request shaping and error
 * classification.
 *
 * Run with:
 *   node --test tests/
 *
 * These use Node's built-in test runner, so they need no dependency and
 * no network. The live backend, the Python service, Steam and Ollama are
 * never contacted: every response here is a fixture.
 */

/** Read a source file relative to this test file. */
const readSource = (...segments) => {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', ...segments), 'utf8');
};

/* ── The endpoint ─────────────────────────────────────────────────────── */

test('the endpoint is the .NET admin route', () => {
  assert.equal(AI_JOB_ENDPOINT, '/api/admin/ai-generation-jobs',
    'React calls the .NET backend only — never Steam and never Python');
});

test('the service module never contacts Python, Steam or Ollama directly', () => {
  const source = readSource('src', 'services', 'aiJobService.js');

  assert.ok(!source.includes('/internal/'), 'no internal Python route is contacted');
  assert.ok(!source.includes('store.steampowered.com'), 'no Steam URL is contacted');
  assert.ok(!source.includes('11434'), 'no Ollama port is contacted');
  assert.ok(source.includes('axiosClient'), 'the shared authenticated client is used');
});

test('the service module never references the retired synchronous route', () => {
  const source = readSource('src', 'services', 'aiJobService.js');

  assert.ok(!source.includes('generate-description'),
    'the retired synchronous translation route is never called');
});

/* ── The request shape ────────────────────────────────────────────────── */

test('a create request carries the name, the App ID and the operation type', () => {
  const body = buildAiJobRequest({
    productName: '  Aurora Echo  ',
    steamAppId: 620,
    operationType: 'Create'
  });

  assert.deepEqual(Object.keys(body).sort(),
    ['operationType', 'productId', 'productName', 'steamAppId'],
    'the request has exactly the four contract fields');
  assert.equal(body.productName, 'Aurora Echo', 'the name is trimmed');
  assert.equal(body.steamAppId, 620, 'the App ID is a number');
  assert.equal(body.operationType, 'Create', 'the operation type is carried');
  assert.equal(body.productId, null, 'a create carries no product');
});

test('an edit request carries the product id', () => {
  const body = buildAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: 'Edit',
    productId: '11111111-1111-1111-1111-111111111111'
  });

  assert.equal(body.productId, '11111111-1111-1111-1111-111111111111', 'the product id is carried');
  assert.equal(body.operationType, 'Edit', 'the operation type is carried');
});

test('the request never carries a price, a token, a Steam key or an id list', () => {
  const body = buildAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: 'Create'
  });

  for (const forbidden of [
    'price',
    'token',
    'steamKeys',
    'tagIds',
    'categoryId',
    'developerId',
    'publisherId',
    'result',
    'editedDraft'
  ]) {
    assert.ok(!(forbidden in body), `the request carries no ${forbidden}`);
  }
});

test('the operation type defaults to Create', () => {
  const body = buildAiJobRequest({ productName: 'Aurora Echo', steamAppId: 620 });

  assert.equal(body.operationType, AI_JOB_OPERATION_TYPES.Create,
    'an absent operation type defaults to Create');
});

test('the product id is normalized to a GUID or to null', () => {
  assert.equal(normalizeAiJobProductId('11111111-1111-1111-1111-111111111111'),
    '11111111-1111-1111-1111-111111111111', 'a GUID is accepted');
  assert.equal(normalizeAiJobProductId('11111111-1111-1111-1111-11111111111A'),
    '11111111-1111-1111-1111-11111111111a', 'the id is lower-cased');
  assert.equal(normalizeAiJobProductId('not-a-guid'), null, 'a non-GUID is rejected');
  assert.equal(normalizeAiJobProductId(null), null, 'an absent id is null');
  assert.equal(normalizeAiJobProductId(''), null, 'a blank id is null');
  assert.equal(normalizeAiJobProductId(true), null, 'a boolean is rejected');
});

/* ── The Steam App ID ─────────────────────────────────────────────────── */

test('the App ID is validated as a positive integer in range', () => {
  assert.equal(normalizeAiDescriptionSteamAppId(620), 620, 'a valid App ID');
  assert.equal(normalizeAiDescriptionSteamAppId('620'), 620, 'a numeric string is accepted');
  assert.equal(normalizeAiDescriptionSteamAppId(0), null, 'zero is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId(-5), null, 'a negative App ID is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId('abc'), null, 'a non-numeric App ID is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId(1.5), null, 'a fractional App ID is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId(true), null, 'a boolean is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId(''), null, 'a blank App ID is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId(null), null, 'an absent App ID is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId(AI_DESCRIPTION_MAX_STEAM_APP_ID), AI_DESCRIPTION_MAX_STEAM_APP_ID,
    'the highest App ID is accepted');
  assert.equal(normalizeAiDescriptionSteamAppId(AI_DESCRIPTION_MAX_STEAM_APP_ID + 1), null,
    'an out-of-range App ID is rejected');
  assert.equal(normalizeAiDescriptionSteamAppId(AI_DESCRIPTION_MIN_STEAM_APP_ID - 1), null,
    'below the range is rejected');
});

test('the job request reuses the existing App ID normalization', () => {
  // The rule has exactly one implementation. If the job builder had its
  // own copy, a change to the accepted range could be applied to one
  // path and missed on the other.
  const source = readSource('src', 'utils', 'aiJobRequest.js');

  assert.ok(source.includes('normalizeAiDescriptionSteamAppId'),
    'the shared normalization is imported and used');
  assert.ok(!/AI_DESCRIPTION_MIN_STEAM_APP_ID|AI_DESCRIPTION_MAX_STEAM_APP_ID/.test(
    source.replace(/import[^;]+;/g, '')
  ), 'the range constants are not duplicated in the job module');
});

test('the selected App ID reaches the job request', () => {
  const body = buildAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: selectedAppId({ appId: 620, name: 'Portal 2' }),
    operationType: 'Create'
  });

  assert.equal(body.steamAppId, 620, 'the selected App ID is sent');
});

test('no selected candidate sends a null App ID', () => {
  const body = buildAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: selectedAppId(null),
    operationType: 'Create'
  });

  assert.equal(body.steamAppId, null, 'no App ID is sent when nothing is selected');
});

/* ── Validation ───────────────────────────────────────────────────────── */

test('a create without a product name is rejected', () => {
  const result = validateAiJobRequest({
    productName: '   ',
    steamAppId: 620,
    operationType: 'Create'
  });

  assert.equal(result.ok, false, 'a blank name is not valid');
  assert.match(result.reason, /product name/i, 'the reason names the product name');
});

test('a create with an over-long product name is rejected', () => {
  const result = validateAiJobRequest({
    productName: 'x'.repeat(AI_JOB_MAX_PRODUCT_NAME_LENGTH + 1),
    steamAppId: 620,
    operationType: 'Create'
  });

  assert.equal(result.ok, false, 'an over-long name is not valid');
});

test('an edit without a product id is rejected', () => {
  const result = validateAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: 'Edit',
    productId: null
  });

  assert.equal(result.ok, false, 'no product is not valid');
  assert.match(result.reason, /product is required/i, 'the reason asks for the product');
});

test('an edit with a valid product id is accepted without a name', () => {
  // The backend reads the name from the product row for an Edit, so the
  // client does not have to supply one.
  const result = validateAiJobRequest({
    productName: '',
    steamAppId: 620,
    operationType: 'Edit',
    productId: '11111111-1111-1111-1111-111111111111'
  });

  assert.equal(result.ok, true, 'an edit with a product id is enough');
  assert.equal(result.reason, '', 'no reason is given');
});

test('an invalid operation type is rejected', () => {
  const result = validateAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: 'Delete'
  });

  assert.equal(result.ok, false, 'an unknown operation type is not valid');
  assert.match(result.reason, /operation type/i, 'the reason names the operation type');
});

test('the operation type predicate accepts only the two values', () => {
  assert.equal(isValidAiJobOperationType('Create'), true, 'Create is valid');
  assert.equal(isValidAiJobOperationType('Edit'), true, 'Edit is valid');
  assert.equal(isValidAiJobOperationType('create'), false, 'the check is exact');
  assert.equal(isValidAiJobOperationType('Delete'), false, 'Delete is not valid');
  assert.equal(isValidAiJobOperationType(null), false, 'an absent type is not valid');
});

test('a missing Steam selection is rejected', () => {
  const result = validateAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: null,
    operationType: 'Create'
  });

  assert.equal(result.ok, false, 'no App ID is not valid');
  assert.match(result.reason, /steam game/i, 'the reason asks for a Steam game');
});

test('an out-of-range App ID is rejected', () => {
  const result = validateAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: AI_DESCRIPTION_MAX_STEAM_APP_ID + 1,
    operationType: 'Create'
  });

  assert.equal(result.ok, false, 'an out-of-range App ID is not valid');
});

test('a valid create request is accepted', () => {
  const result = validateAiJobRequest({
    productName: 'Aurora Echo',
    steamAppId: 620,
    operationType: 'Create'
  });

  assert.equal(result.ok, true, 'a name and an App ID are enough');
  assert.equal(result.reason, '', 'no reason is given');
});

/* ── Error classification ─────────────────────────────────────────────── */

test('the HTTP statuses map onto actionable messages', () => {
  assert.match(describeAiJobError(400, ''), /rejected/i, '400 is an invalid request');
  assert.match(describeAiJobError(401, ''), /session/i, '401 is an authentication failure');
  assert.match(describeAiJobError(403, ''), /permission/i, '403 is an authorization failure');
  assert.match(describeAiJobError(404, ''), /could not be found/i, '404 is a missing job');
  assert.match(describeAiJobError(409, ''), /already have|progress/i, '409 is a conflict');
  assert.match(describeAiJobError(413, ''), /too large/i, '413 is a size error');
  assert.match(describeAiJobError(422, ''), /invalid/i, '422 is an invalid request');
  assert.match(describeAiJobError(429, ''), /busy/i, '429 is rate-limited');
  assert.match(describeAiJobError(500, ''), /unexpected problem/i, '500 is a server problem');
  assert.match(describeAiJobError(502, ''), /could not be reached|try again/i, '502 is an upstream failure');
  assert.match(describeAiJobError(503, ''), /unavailable|disabled/i, '503 is unavailable');
  assert.match(describeAiJobError(504, ''), /too long|try again/i, '504 is a retryable timeout');
  assert.match(describeAiJobError(0, ''), /network/i, 'a network failure is reported');
});

test('a backend message is preferred over the fallback', () => {
  assert.equal(
    describeAiJobError(409, 'You already have a description generation in progress.'),
    'You already have a description generation in progress.',
    'the backend message is shown'
  );
});

test('a 202 is not an error', () => {
  // The cancellation of a processing job is acknowledged with 202: the
  // request is accepted, and the cancellation is not yet terminal. It is
  // a success, not a failure, so it never reaches the error mapper.
  const message = describeAiJobError(202, '');

  assert.ok(!/failed|rejected|error/i.test(message),
    'a 202 is not described as a failure');
});
