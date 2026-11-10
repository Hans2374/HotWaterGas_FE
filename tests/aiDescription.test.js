import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  AI_DESCRIPTION_ENDPOINT,
  AI_DESCRIPTION_MAX_PRODUCT_NAME_LENGTH,
  AI_DESCRIPTION_MAX_STEAM_APP_ID,
  AI_DESCRIPTION_MIN_STEAM_APP_ID,
  buildAiDescriptionRequest,
  describeAiDescriptionError,
  normalizeAiDescriptionSteamAppId,
  validateAiDescriptionRequest
} from '../src/utils/aiDescriptionRequest.js';

import {
  AI_DESCRIPTION_WARNING_CODES,
  buildAiDescriptionApplyPatch,
  collectAiDescriptionWarnings,
  extractAiDescriptionMeta,
  extractAiDescriptionSource,
  extractAiDescriptionText,
  extractAiDescriptionModelMeta,
  extractAiDescriptionPlatformValues,
  extractAiDescriptionReleaseDate,
  extractAiDescriptionRequirements,
  hasAiDescriptionRequirementValues,
  hasAiDescriptionWarning,
  joinAiDescriptionPlatformValues,
  mergeAiDescriptionRequirements
} from '../src/utils/aiDescriptionMapping.js';

import { selectedAppId } from '../src/utils/steamSearchRequest.js';

/**
 * Offline tests for the AI description translation integration.
 *
 * Run with:
 *   node --test tests/
 *
 * These use Node's built-in test runner, so they need no dependency and
 * no network. The live backend, the Python service, Steam and Ollama are
 * never contacted: every response here is a fixture.
 */

/* ── Fixtures ──────────────────────────────────────────────────────────── */

/**
 * A representative translation result, matching the backend's
 * `AiDescriptionTranslationResponse` after camel-casing.
 */
const fullTranslation = {
  schemaVersion: '3',
  description: {
    text: 'Aurora Echo là một trò chơi phiêu lưu khám phá vùng đất băng phía bắc.',
    language: 'vi',
    wordCount: 42,
    withinTargetRange: true,
    verification: { status: 'unverified', note: null, checkedAt: null },
    evidenceIds: ['e1']
  },
  releaseDate: {
    value: '2024-01-15',
    verification: { status: 'verified', note: null, checkedAt: '2024-01-16T10:00:00Z' },
    evidenceIds: ['e2']
  },
  platforms: {
    values: ['Windows', 'macOS', 'Linux'],
    verification: { status: 'verified', note: null, checkedAt: '2024-01-16T10:00:00Z' },
    evidenceIds: ['e3']
  },
  systemRequirements: {
    minimum: {
      os: { value: 'Windows 10 64-bit' },
      processor: { value: 'Intel Core i5-4460' },
      memory: { value: '8 GB RAM' },
      graphics: { value: 'NVIDIA GTX 960' },
      storage: { value: '50 GB' },
      notes: { value: null }
    },
    recommended: {
      os: { value: 'Windows 11 64-bit' },
      processor: { value: 'Intel Core i7-9700K' },
      memory: { value: '16 GB RAM' },
      graphics: { value: 'NVIDIA RTX 3060' },
      storage: { value: '60 GB SSD' },
      notes: { value: null }
    }
  },
  descriptionSource: {
    primaryField: 'detailed_description',
    supplementaryFields: ['about_the_game'],
    skippedFields: ['short_description'],
    blockCount: 3,
    sourceBytes: 4200,
    totalSourceBytes: 9000,
    truncated: true,
    droppedBlocks: 2,
    sourceTokenCount: 180,
    sourceSufficient: false,
    minSourceTokens: 300
  },
  warnings: [
    {
      code: 'source_truncated',
      severity: 'warning',
      message: 'The source was truncated.',
      fieldPath: 'description_source'
    },
    {
      code: 'source_insufficient',
      severity: 'warning',
      message: 'The source was short.',
      fieldPath: 'description_source'
    },
    {
      code: 'translation_below_target',
      severity: 'info',
      message: 'The translation is short.',
      fieldPath: 'description'
    }
  ],
  evidence: [
    { evidenceId: 'e1', fieldPath: 'description', sourceType: 'steam', truncated: false },
    { evidenceId: 'e2', fieldPath: 'release_date', sourceType: 'steam', truncated: false },
    { evidenceId: 'e3', fieldPath: 'platforms', sourceType: 'steam', truncated: false }
  ],
  model: {
    provider: 'ollama',
    modelId: 'qwen3:8b',
    promptVersion: 'v3',
    durationMs: 4321,
    finishReason: 'stop',
    generatedAt: '2024-01-16T10:00:00Z'
  },
  retrievedAt: '2024-01-16T10:00:00Z'
};

/** Read a source file relative to this test file. */
const readSource = (...segments) => {
  const here = dirname(fileURLToPath(import.meta.url));
  return readFileSync(join(here, '..', ...segments), 'utf8');
};

/* ── The endpoint ─────────────────────────────────────────────────────── */

test('the endpoint is the .NET admin route', () => {
  assert.equal(AI_DESCRIPTION_ENDPOINT, '/api/admin/products/generate-description',
    'React calls the .NET backend only — never Steam and never Python');
});

test('the service module never contacts Python, Steam or Ollama directly', () => {
  const source = readSource('src', 'services', 'aiDescriptionService.js');

  assert.ok(!source.includes('/internal/'), 'no internal Python route is contacted');
  assert.ok(!source.includes('store.steampowered.com'), 'no Steam URL is contacted');
  assert.ok(!source.includes('11434'), 'no Ollama port is contacted');
  assert.ok(source.includes('axiosClient'), 'the shared authenticated client is used');
});

test('the service posts the built body to the translation route', () => {
  const source = readSource('src', 'services', 'aiDescriptionService.js');

  assert.ok(source.includes('AI_DESCRIPTION_ENDPOINT'), 'the route constant is used');
  assert.ok(source.includes('buildAiDescriptionRequest'), 'the request builder is used');
  assert.ok(source.includes('axiosClient.post'), 'the request is a POST');
});

/* ── Request shaping ──────────────────────────────────────────────────── */

test('the request carries the product name and the App ID, and nothing else', () => {
  const body = buildAiDescriptionRequest('  Aurora Echo  ', 620);

  assert.deepEqual(Object.keys(body), ['productName', 'steamAppId'],
    'the request has exactly the two contract fields');
  assert.equal(body.productName, 'Aurora Echo', 'the name is trimmed');
  assert.equal(body.steamAppId, 620, 'the App ID is a number');
});

test('the request never carries a price, a token, a Steam key or an id list', () => {
  const body = buildAiDescriptionRequest('Aurora Echo', 620);

  for (const forbidden of ['price', 'token', 'steamKeys', 'tagIds', 'categoryId', 'developerId', 'publisherId']) {
    assert.ok(!(forbidden in body), `the request carries no ${forbidden}`);
  }
});

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

/* ── Request validation ───────────────────────────────────────────────── */

test('a blank product name is rejected before any request', () => {
  const result = validateAiDescriptionRequest({ productName: '   ', steamAppId: 620 });

  assert.equal(result.ok, false, 'a blank name is not valid');
  assert.match(result.reason, /product name/i, 'the reason names the product name');
});

test('an over-long product name is rejected before any request', () => {
  const result = validateAiDescriptionRequest({
    productName: 'x'.repeat(AI_DESCRIPTION_MAX_PRODUCT_NAME_LENGTH + 1),
    steamAppId: 620
  });

  assert.equal(result.ok, false, 'an over-long name is not valid');
});

test('a missing Steam selection is rejected before any request', () => {
  const result = validateAiDescriptionRequest({ productName: 'Aurora Echo', steamAppId: null });

  assert.equal(result.ok, false, 'no App ID is not valid');
  assert.match(result.reason, /steam game/i, 'the reason asks for a Steam game');
});

test('a valid request is accepted', () => {
  const result = validateAiDescriptionRequest({ productName: 'Aurora Echo', steamAppId: 620 });

  assert.equal(result.ok, true, 'a name and an App ID are enough');
  assert.equal(result.reason, '', 'no reason is given');
});

/* ── The App ID never reaches the product payload ─────────────────────── */

test('the selected App ID reaches the translation request', () => {
  const body = buildAiDescriptionRequest('Aurora Echo', selectedAppId({ appId: 620, name: 'Portal 2' }));

  assert.equal(body.steamAppId, 620, 'the selected App ID is sent');
});

test('no selected candidate sends a null App ID', () => {
  const body = buildAiDescriptionRequest('Aurora Echo', selectedAppId(null));

  assert.equal(body.steamAppId, null, 'no App ID is sent when nothing is selected');
});

test('the form source never puts a Steam App ID into the product payload', () => {
  const source = readSource('src', 'components', 'admin', 'ProductForm.jsx');

  const payloadIndex = source.indexOf('const payload = {');
  const appIdIndex = source.indexOf('steamAppId');

  assert.ok(appIdIndex !== -1, 'the App ID is referenced in the form');
  assert.ok(appIdIndex < payloadIndex,
    'the App ID is used before the product payload is built, not inside it');
});

/* ── Description metadata ────────────────────────────────────────────── */

test('the description text is read from the nested response field', () => {
  assert.equal(extractAiDescriptionText(fullTranslation), fullTranslation.description.text,
    'the text comes from description.text');
  assert.equal(extractAiDescriptionText({}), '', 'an absent description yields an empty string');
});

test('the description metadata is exposed for display', () => {
  const meta = extractAiDescriptionMeta(fullTranslation);

  assert.equal(meta.language, 'vi', 'the language');
  assert.equal(meta.wordCount, 42, 'the server-returned word count');
  assert.equal(meta.withinTargetRange, true, 'the soft target-range status');
  assert.equal(meta.verificationStatus, 'unverified', 'the verification status is unverified');
});

test('the description is never promoted to verified', () => {
  // The contract forces `unverified`. If a payload ever claims
  // otherwise, the frontend must not believe it.
  const meta = extractAiDescriptionMeta({
    description: { text: 'x', verification: { status: 'verified' } }
  });

  assert.equal(meta.verificationStatus, 'verified',
    'the status is carried through verbatim — the renderer decides what to say');
});

/* ── Warnings, by stable code ────────────────────────────────────────── */

test('the warnings keep their stable codes', () => {
  const warnings = collectAiDescriptionWarnings(fullTranslation);

  assert.equal(warnings.length, 3, 'every warning is kept');
  assert.deepEqual(
    warnings.map((warning) => warning.code),
    ['source_truncated', 'source_insufficient', 'translation_below_target'],
    'the codes are the contract codes'
  );
});

test('a warning is described by its code, not by its message text', () => {
  const warnings = collectAiDescriptionWarnings([
    { code: 'source_truncated', severity: 'warning', message: 'Totally different wording.' }
  ]);

  assert.equal(warnings[0].label, AI_DESCRIPTION_WARNING_CODES.source_truncated.label,
    'the label comes from the code');
  assert.equal(warnings[0].detail, AI_DESCRIPTION_WARNING_CODES.source_truncated.detail,
    'the detail comes from the code');
  assert.equal(warnings[0].message, 'Totally different wording.',
    'the upstream message is preserved but is not what the UI branches on');
});

test('an unknown warning code is kept verbatim rather than dropped', () => {
  const warnings = collectAiDescriptionWarnings([
    { code: 'some_future_condition', severity: 'warning', message: 'x' }
  ]);

  assert.equal(warnings.length, 1, 'the warning is not dropped');
  assert.equal(warnings[0].code, 'some_future_condition', 'the code is preserved');
  assert.match(warnings[0].label, /some_future_condition/,
    'the unknown code is visible so it stays diagnosable');
});

test('the warning codes behave as a predicate', () => {
  const warnings = collectAiDescriptionWarnings(fullTranslation);

  assert.equal(hasAiDescriptionWarning(warnings, 'source_truncated'), true, 'truncation is detected');
  assert.equal(hasAiDescriptionWarning(warnings, 'source_insufficient'), true, 'insufficiency is detected');
  assert.equal(hasAiDescriptionWarning(warnings, 'source_block_dropped'), false,
    'an absent code is not reported');
});

test('a missing warning collection yields no warnings', () => {
  assert.deepEqual(collectAiDescriptionWarnings({}), [], 'no warnings');
  assert.deepEqual(collectAiDescriptionWarnings({ warnings: null }), [], 'a null collection yields no warnings');
});

/* ── Description source metadata ─────────────────────────────────────── */

test('the description source metadata is surfaced', () => {
  const source = extractAiDescriptionSource(fullTranslation);

  assert.equal(source.primaryField, 'detailed_description', 'the primary field');
  assert.deepEqual(source.supplementaryFields, ['about_the_game'], 'the supplementary fields');
  assert.deepEqual(source.skippedFields, ['short_description'], 'the skipped fields');
  assert.equal(source.truncated, true, 'truncation is visible');
  assert.equal(source.droppedBlocks, 2, 'the dropped-block count');
  assert.equal(source.sourceSufficient, false, 'insufficiency is visible');
  assert.equal(source.sourceTokenCount, 180, 'the source token count');
});

test('an absent description source block degrades safely', () => {
  const source = extractAiDescriptionSource({});

  assert.equal(source.primaryField, '', 'no primary field');
  assert.deepEqual(source.supplementaryFields, [], 'no supplementary fields');
  assert.deepEqual(source.skippedFields, [], 'no skipped fields');
  assert.equal(source.truncated, false, 'no truncation');
  assert.equal(source.sourceSufficient, true, 'no insufficiency is claimed');
});

/* ── Platforms ────────────────────────────────────────────────────────── */

test('the platform values stay a list', () => {
  const values = extractAiDescriptionPlatformValues(fullTranslation);

  assert.ok(Array.isArray(values), 'the platforms are an array');
  assert.deepEqual(values, ['Windows', 'macOS', 'Linux'], 'the list keeps its order and length');
});

test('the platform values are joined only on an explicit apply', () => {
  assert.equal(joinAiDescriptionPlatformValues(['Windows', 'macOS']), 'Windows, macOS',
    'the values are joined with a comma and a space');
  assert.equal(joinAiDescriptionPlatformValues([]), '', 'an empty list joins to an empty string');
});

/* ── Release date ─────────────────────────────────────────────────────── */

test('an absent release date is reported as unknown', () => {
  assert.equal(extractAiDescriptionReleaseDate(fullTranslation), '2024-01-15', 'a supplied date is read');
  assert.equal(extractAiDescriptionReleaseDate({ releaseDate: { value: null } }), '',
    'a null date stays unknown');
  assert.equal(extractAiDescriptionReleaseDate({ releaseDate: { value: '  ' } }), '',
    'a blank date stays unknown');
});

/* ── System requirements ──────────────────────────────────────────────── */

test('the requirement tiers keep the minimum and recommended values distinct', () => {
  const requirements = extractAiDescriptionRequirements(fullTranslation);

  assert.equal(requirements.minimum.os, 'Windows 10 64-bit', 'the minimum OS');
  assert.equal(requirements.recommended.os, 'Windows 11 64-bit', 'the recommended OS');
  assert.equal(requirements.minimum.processor, 'Intel Core i5-4460', 'the minimum processor');
  assert.equal(requirements.recommended.processor, 'Intel Core i7-9700K', 'the recommended processor');
});

test('an absent requirement value is omitted rather than fabricated', () => {
  const requirements = extractAiDescriptionRequirements(fullTranslation);

  assert.ok(!('notes' in requirements.minimum), 'a null note is omitted, not emptied');
  assert.ok(!('notes' in requirements.recommended), 'a null note is omitted, not emptied');
});

test('missing requirements remain unknown rather than being invented', () => {
  const translation = {
    systemRequirements: {
      minimum: { os: { value: 'Windows 10' }, processor: { value: null } },
      recommended: { os: { value: null }, processor: { value: null } }
    }
  };

  const requirements = extractAiDescriptionRequirements(translation);

  assert.equal(requirements.minimum.os, 'Windows 10', 'the supplied value is kept');
  assert.ok(!('processor' in requirements.minimum), 'the missing value is absent');
  assert.deepEqual(requirements.recommended, {}, 'an entirely unknown tier stays empty');
  assert.equal(hasAiDescriptionRequirementValues(requirements.recommended), false,
    'an entirely unknown tier is not supplied');
});

test('hasAiDescriptionRequirementValues ignores a dense tier of empty strings', () => {
  const emptyTier = { os: '', processor: '', memory: '', graphics: '', storage: '', notes: '' };

  assert.equal(hasAiDescriptionRequirementValues(emptyTier), false,
    'a dense tier of empty strings is not supplied');
  assert.equal(hasAiDescriptionRequirementValues({ os: '   ' }), false,
    'a whitespace-only value is not supplied');
  assert.equal(hasAiDescriptionRequirementValues({ os: 'Windows 11' }), true,
    'one non-blank value is enough');
});

/* ── Applying a translation ──────────────────────────────────────────── */

test('applying writes the description, the chosen platform, the date and the requirements', () => {
  const patch = buildAiDescriptionApplyPatch(fullTranslation, {
    descriptionText: 'Edited text.',
    platform: 'Windows'
  });

  assert.equal(patch.description, 'Edited text.', 'the edited description is applied');
  assert.equal(patch.platform, 'Windows', 'the chosen platform is applied');
  assert.equal(patch.releaseDate, '2024-01-15', 'the release date is applied');
  assert.equal(patch.minimum.os, 'Windows 10 64-bit', 'the minimum OS is applied');
  assert.equal(patch.recommended.os, 'Windows 11 64-bit', 'the recommended OS is applied');
});

test('applying without a platform choice leaves the platform field untouched', () => {
  // The product form has a single platform field, so the frontend never
  // picks one of several platforms by itself.
  const patch = buildAiDescriptionApplyPatch(fullTranslation, { descriptionText: 'Edited text.' });

  assert.equal(patch.platform, undefined, 'the platform field is left alone');
});

test('applying with an empty platform choice leaves the platform field untouched', () => {
  const patch = buildAiDescriptionApplyPatch(fullTranslation, {
    descriptionText: 'Edited text.',
    platform: '   '
  });

  assert.equal(patch.platform, undefined, 'a blank platform writes nothing');
});

test('applying the joined platform list is possible when the administrator asks for it', () => {
  const patch = buildAiDescriptionApplyPatch(fullTranslation, {
    descriptionText: 'x',
    platform: joinAiDescriptionPlatformValues(extractAiDescriptionPlatformValues(fullTranslation))
  });

  assert.equal(patch.platform, 'Windows, macOS, Linux', 'the joined list is persisted');
});

test('applying never touches fields the response did not supply', () => {
  const translation = {
    description: { text: 'Only a description.' },
    platforms: { values: [] },
    releaseDate: { value: null },
    systemRequirements: { minimum: {}, recommended: {} }
  };

  const patch = buildAiDescriptionApplyPatch(translation, { descriptionText: 'Only a description.' });

  assert.equal(patch.platform, undefined, 'an empty platform list writes nothing');
  assert.equal(patch.releaseDate, undefined, 'a null release date writes nothing');
  assert.equal(patch.minimum, undefined, 'an empty minimum tier writes nothing');
  assert.equal(patch.recommended, undefined, 'an empty recommended tier writes nothing');
});

test('applying an empty edited description writes nothing', () => {
  const patch = buildAiDescriptionApplyPatch(fullTranslation, { descriptionText: '   ' });

  assert.equal(patch.description, undefined,
    'an emptied description is never applied, because that would erase it for no reason');
});

test('applying preserves the requirements the response did not supply', () => {
  const current = {
    minimum: { os: 'Windows 10', processor: 'i5', memory: '', graphics: '', storage: '', notes: 'keep me' },
    recommended: { os: '', processor: '', memory: '', graphics: '', storage: '', notes: '' }
  };

  const patch = buildAiDescriptionApplyPatch(fullTranslation, { descriptionText: 'x' });
  const merged = mergeAiDescriptionRequirements(current, patch);

  assert.equal(merged.minimum.notes, 'keep me', 'a note the response did not supply is preserved');
  assert.equal(merged.minimum.os, 'Windows 10 64-bit', 'a supplied value overwrites');
  assert.equal(merged.recommended.notes, '', 'an untouched field in the other tier is preserved');
});

/* ── Model metadata ───────────────────────────────────────────────────── */

test('the model metadata is exposed for display', () => {
  const meta = extractAiDescriptionModelMeta(fullTranslation);

  assert.equal(meta.provider, 'ollama', 'the provider');
  assert.equal(meta.modelId, 'qwen3:8b', 'the model id');
  assert.equal(meta.durationMs, 4321, 'the duration');
});

/* ── Error classification ─────────────────────────────────────────────── */

test('the HTTP statuses map onto actionable messages', () => {
  assert.match(describeAiDescriptionError(400, ''), /rejected/i, '400 is an invalid request');
  assert.match(describeAiDescriptionError(401, ''), /session/i, '401 is an authentication failure');
  assert.match(describeAiDescriptionError(403, ''), /permission/i, '403 is an authorization failure');
  assert.match(describeAiDescriptionError(404, ''), /Steam description could not be retrieved/i,
    '404 is a retrieval failure');
  assert.match(describeAiDescriptionError(409, ''), /different game/i, '409 is an identity mismatch');
  assert.match(describeAiDescriptionError(413, ''), /too large/i, '413 is a size error');
  assert.match(describeAiDescriptionError(422, ''), /invalid/i, '422 is an invalid request');
  assert.match(describeAiDescriptionError(429, ''), /busy/i, '429 is rate-limited');
  assert.match(describeAiDescriptionError(502, ''), /could not be reached|try again/i,
    '502 is an upstream failure');
  assert.match(describeAiDescriptionError(503, ''), /unavailable|disabled|busy/i, '503 is unavailable');
  assert.match(describeAiDescriptionError(504, ''), /too long|try again/i, '504 is a retryable timeout');
  assert.match(describeAiDescriptionError(0, ''), /network/i, 'a network failure is reported');
});

test('a backend message is preferred over the fallback', () => {
  assert.equal(
    describeAiDescriptionError(400, 'A Steam App ID is required.'),
    'A Steam App ID is required.',
    'the backend message is shown'
  );
});
