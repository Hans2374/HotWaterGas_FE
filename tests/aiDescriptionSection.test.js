import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * A render smoke test for the AI translation review panel.
 *
 * The component is a `.jsx` file, so it is loaded through Vite's SSR
 * module loader — the same transformer the production build uses.
 *
 * The requirements this pins down:
 *   - the translated description is shown, with its language, word count
 *     and target-range status;
 *   - the description is labelled **unverified** and never as verified
 *     or fact-checked;
 *   - warnings are rendered **by their stable code**;
 *   - source truncation and source sufficiency are visible;
 *   - missing requirements stay unknown rather than being invented;
 *   - macOS/Linux system requirements are never shown;
 *   - the platform list stays a list until the administrator chooses.
 */

/** The Vite dev server used to transform the JSX. */
let viteServer;
let AiDescriptionDraftSection;

/** Render the section with sensible defaults. */
const render = (props = {}) =>
  renderToStaticMarkup(
    createElement(AiDescriptionDraftSection, {
      isGenerating: false,
      error: null,
      translation: null,
      draftText: '',
      onDraftTextChange: () => {},
      onGenerate: () => {},
      onRegenerate: () => {},
      onApply: () => {},
      onDismiss: () => {},
      canApply: false,
      hasSteamSelection: false,
      hasEditedDraft: false,
      isConfirmingReplace: false,
      selectedPlatform: null,
      onPlatformSelect: () => {},
      onRequestReplace: () => {},
      onConfirmReplace: () => {},
      onCancelReplace: () => {},
      isDisabled: false,
      ...props
    })
  );

/** A representative translation result. */
const translation = {
  schemaVersion: '3',
  description: {
    text: 'Aurora Echo là một trò chơi phiêu lưu khám phá vùng đất băng.',
    language: 'vi',
    wordCount: 42,
    withinTargetRange: true,
    verification: { status: 'unverified' }
  },
  releaseDate: { value: '2024-01-15' },
  platforms: { values: ['Windows', 'macOS', 'Linux'] },
  systemRequirements: {
    minimum: {
      os: { value: 'Windows 10 64-bit' },
      processor: { value: null },
      memory: { value: null },
      graphics: { value: null },
      storage: { value: null },
      notes: { value: null }
    },
    recommended: {
      os: { value: null },
      processor: { value: null },
      memory: { value: null },
      graphics: { value: null },
      storage: { value: null },
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
    }
  ],
  model: { provider: 'ollama', modelId: 'qwen3:8b', promptVersion: 'v3', durationMs: 4321 }
};

before(async () => {
  const vite = await import('vite');

  viteServer = await vite.createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error'
  });

  const module = await viteServer.ssrLoadModule(
    '/src/components/admin/AiDescriptionDraftSection.jsx'
  );
  AiDescriptionDraftSection = module.AiDescriptionDraftSection;
});

after(async () => {
  if (viteServer) await viteServer.close();
});

/* ── The description ─────────────────────────────────────────────────── */

test('the translated description is shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Aurora Echo là một trò chơi/, 'the translated text is rendered');
});

test('the language and the server word count are shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Language: vi/, 'the language is shown');
  assert.match(html, /42 words/, 'the server-returned word count is shown');
});

test('the target-range status is shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /within the target length/, 'a within-range translation says so');
});

test('a translation outside the target range says so without failing', () => {
  const outside = {
    ...translation,
    description: { ...translation.description, withinTargetRange: false }
  };
  const html = render({ translation: outside, draftText: outside.description.text });

  assert.match(html, /outside the target length/, 'the status is shown');
  assert.match(html, /informational/, 'it is marked as informational');
});

/* ── The unverified label ────────────────────────────────────────────── */

test('the description is labelled unverified', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Not verified/, 'the description is marked as not verified');
  assert.match(html, /machine translation/i, 'it says what the text actually is');
});

test('the description is never labelled verified or fact-checked', () => {
  const html = render({ translation, draftText: translation.description.text });

  // The only "fact-check" wording in the panel is the *negation* — the
  // label says the translation was NOT fact-checked. A bare claim is
  // never made.
  const claims = html.match(/(?<!not )fact-?checked/gi) || [];
  assert.equal(claims.length, 0,
    'the panel never claims the description was fact-checked');

  // No bare "Verified" label is rendered either.
  assert.ok(!/>Verified</.test(html), 'no bare "Verified" label is rendered');
  assert.match(html, /Not verified/, 'the description is labelled as not verified');
});

/* ── Warnings, by code ───────────────────────────────────────────────── */

test('the warnings are rendered with their stable code', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /data-warning-code="source_truncated"/,
    'the warning carries its stable code as an attribute');
  assert.match(html, /source_truncated/, 'the code is visible as text');
});

test('the warning wording does not depend on the upstream message', () => {
  const reworded = {
    ...translation,
    warnings: [{
      code: 'source_truncated',
      severity: 'warning',
      message: 'A completely different sentence than before.',
      fieldPath: 'description_source'
    }]
  };
  const html = render({ translation: reworded, draftText: reworded.description.text });

  assert.match(html, /Partial translation/, 'the label comes from the code');
  assert.ok(!html.includes('A completely different sentence than before.'),
    'the upstream message is not the thing the UI shows');
});

/* ── The description source ──────────────────────────────────────────── */

test('the primary source field is shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Primary field/, 'the primary field is labelled');
  assert.match(html, /Detailed description/, 'the primary field is named');
});

test('the supplementary and skipped source fields are shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Supplementary fields:/, 'the supplementary fields are listed');
  assert.match(html, /About this game/, 'the supplementary field is named');
  assert.match(html, /Skipped fields:/, 'the skipped fields are listed');
  assert.match(html, /Short description/, 'the skipped field is named');
});

test('source truncation is visible', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Truncated/, 'truncation is labelled');
  assert.match(html, /2 block\(s\) dropped/, 'the dropped-block count is shown');
});

test('a non-truncated source says so', () => {
  const complete = {
    ...translation,
    descriptionSource: { ...translation.descriptionSource, truncated: false, droppedBlocks: 0 },
    warnings: []
  };
  const html = render({ translation: complete, draftText: complete.description.text });

  assert.match(html, /Truncated<\/span><span[^>]*>No/, 'the source is not truncated');
});

test('source sufficiency is visible', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Source sufficient/, 'sufficiency is labelled');
  assert.match(html, /too little material/, 'the insufficient source says so');
});

test('a sufficient source says so', () => {
  const sufficient = {
    ...translation,
    descriptionSource: { ...translation.descriptionSource, sourceSufficient: true },
    warnings: []
  };
  const html = render({ translation: sufficient, draftText: sufficient.description.text });

  assert.match(html, /enough material/, 'the sufficient source says so');
});

/* ── Release date ────────────────────────────────────────────────────── */

test('the release date is shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /2024-01-15/, 'the release date is rendered');
});

test('an unknown release date stays unknown', () => {
  const unknown = { ...translation, releaseDate: { value: null } };
  const html = render({ translation: unknown, draftText: unknown.description.text });

  assert.match(html, /Not stated by Steam/, 'the unknown date is stated');
  assert.match(html, /no value has been invented/, 'it is explicit that nothing was invented');
});

/* ── Requirements ────────────────────────────────────────────────────── */

test('the Windows minimum requirement is shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Windows 10 64-bit/, 'the minimum OS is rendered');
});

test('a missing requirement stays unknown rather than being invented', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Unknown/, 'the missing field is shown as unknown');
  assert.match(html, /not stated by Steam/i, 'the missing tier is stated');
});

test('the recommended tier is shown separately from the minimum', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, />Minimum</, 'the minimum tier has its own heading');
  assert.match(html, />Recommended</, 'the recommended tier has its own heading');
});

test('no macOS or Linux system requirement is ever shown', () => {
  const html = render({ translation, draftText: translation.description.text });

  // The *platform list* may include macOS and Linux — Steam publishes
  // them. What must never appear is a macOS/Linux **requirements
  // block**: the contract carries the PC tier only.
  const headings = html.match(/class="ai-review-title"[^>]*>[^<]*(<[^>]*>)*[^<]*requirements/gi) || [];
  assert.equal(headings.length, 1, 'there is exactly one requirements block');
  assert.match(headings[0], /Windows \/ PC requirements/i,
    'the single requirements block is the Windows/PC one');

  // No requirement *value* mentions a macOS or Linux operating system.
  const requirementSection = html.slice(html.indexOf('Windows / PC requirements'));
  const values = requirementSection.match(/<dd class="ai-description-req-value">.*?<\/dd>/g) || [];
  for (const value of values) {
    assert.ok(!/mac\s*os|linux/i.test(value),
      'no requirement value mentions macOS or Linux');
  }
});

test('the panel states that only Windows requirements are included', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Windows \/ PC requirements/, 'the block is titled for Windows/PC');
  assert.match(html, /not part of this translation/i,
    'the panel explains that the other platforms are not included');
});

/* ── Platforms ───────────────────────────────────────────────────────── */

test('the platform list is shown as a list', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Windows/, 'Windows is listed');
  assert.match(html, /macOS/, 'macOS is listed');
  assert.match(html, /Linux/, 'Linux is listed');
});

test('the platform field is left alone until the administrator chooses', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Choose which value to persist/i,
    'the panel asks for an explicit choice');
  assert.match(html, /left unchanged until you choose/i,
    'the panel states that nothing is written yet');
});

test('the platform choices are a radio group', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /role="radiogroup"/, 'the choices are a radio group');
  assert.match(html, /aria-label="Platform to persist"/, 'the group is labelled');
  assert.match(html, /All of them \(joined\)/, 'the joined option is offered');
});

/* ── Lifecycle ───────────────────────────────────────────────────────── */

test('without a translation the panel offers to translate', () => {
  const html = render({ translation: null });

  assert.match(html, /Translate Steam Description/, 'the generate button is offered');
});

test('without a translation the panel says a Steam game is needed', () => {
  const html = render({ translation: null, hasSteamSelection: false });

  assert.match(html, /select a game above first/i,
    'the panel explains that a Steam selection is required');
});

test('a translation offers a regenerate and a discard control', () => {
  const html = render({ translation, draftText: translation.description.text });

  assert.match(html, /Regenerate Translation/, 'the regenerate control is offered');
  assert.match(html, /Discard/, 'the discard control is offered');
});

test('an edited draft requires a confirmation before it is replaced', () => {
  const html = render({
    translation,
    draftText: 'A completely different text.',
    hasEditedDraft: true,
    isConfirmingReplace: true
  });

  assert.match(html, /Replace your edited translation\?/,
    'the confirmation is shown');
  assert.match(html, /your edits are lost/i,
    'the confirmation says what is at stake');
  assert.match(html, /Keep My Edit/, 'the edit can be kept');
});

test('an edited draft does not show the confirmation until it is requested', () => {
  const html = render({
    translation,
    draftText: 'A completely different text.',
    hasEditedDraft: true,
    isConfirmingReplace: false
  });

  assert.ok(!/Replace your edited translation\?/.test(html),
    'the confirmation is not shown until it is asked for');
});

test('an unedited draft is regenerated without a confirmation', () => {
  const html = render({
    translation,
    draftText: translation.description.text,
    hasEditedDraft: false
  });

  assert.ok(!/Replace your edited translation\?/.test(html),
    'no confirmation is shown');
});

test('an error is shown as an alert and leaves the form usable', () => {
  const html = render({
    error: { status: 502, message: 'The Steam store could not be reached.' }
  });

  assert.match(html, /role="alert"/, 'the error is an alert');
  assert.match(html, /could not be reached/, 'the message is shown');
  assert.match(html, /Translate Steam Description/, 'the form is still usable');
});

test('the busy state is announced politely', () => {
  const html = render({ isGenerating: true });

  assert.match(html, /role="status"/, 'the busy state is a live region');
  assert.match(html, /aria-live="polite"/, 'the busy state announces politely');
});

/* ── The asynchronous job states ─────────────────────────────────────── */

test('a queued job that was never attempted shows the waiting message', () => {
  const html = render({
    jobStatus: 'Queued',
    jobStage: null,
    jobAttemptCount: 0,
    jobNextAttemptAt: null
  });

  assert.match(html, /Waiting for the generation worker/,
    'the queued message is shown');
  assert.ok(!/%/.test(html), 'no percentage is invented');
  assert.match(html, /role="status"/, 'the state is a live region');
  assert.match(html, /aria-live="polite"/, 'the state announces politely');
});

test('a queued job waiting for a retry shows the attempt count and the next attempt', () => {
  const html = render({
    jobStatus: 'Queued',
    jobAttemptCount: 2,
    jobNextAttemptAt: '2024-01-16T10:05:00Z'
  });

  assert.match(html, /Retrying — next attempt at/,
    'the retry message is shown');
  assert.match(html, /Attempt 2 so far/,
    'the attempt count is shown');
});

test('a processing job shows the backend progress message', () => {
  const html = render({
    jobStatus: 'Processing',
    jobStage: 'FetchingData',
    jobProgressMessage: 'Retrieving the Steam store description.'
  });

  assert.match(html, /Retrieving the Steam store description\./,
    'the backend message is shown verbatim');
  assert.ok(!/Generating\.\.\./.test(html),
    'the client never substitutes its own "Generating…" wording');
});

test('the defensive Generating and Regenerating stages are rendered', () => {
  const generating = render({ jobStatus: 'Processing', jobStage: 'Generating' });
  assert.match(generating, /Generating/, 'the Generating stage has a label');

  const regenerating = render({
    jobStatus: 'Processing',
    jobStage: 'Regenerating',
    jobAttemptCount: 3
  });
  assert.match(regenerating, /Regenerating/, 'the Regenerating stage has a label');
  assert.match(regenerating, /attempt 3/, 'the attempt count is shown');
});

test('a cancellation request says the upstream request is still awaited', () => {
  const html = render({
    jobStatus: 'Processing',
    jobStage: 'FetchingData',
    jobCancelRequested: true
  });

  assert.match(html, /Waiting for the current AI request to finish/,
    'the wording says the request is still being awaited');
  assert.ok(!/already stopped|has stopped/i.test(html),
    'the wording never claims the work has already stopped');
});

test('a cancelled job says so', () => {
  const html = render({ jobStatus: 'Cancelled' });

  assert.match(html, /The generation was cancelled\./, 'the cancelled message is shown');
});

test('a failed job shows the error code and the message', () => {
  const html = render({
    jobStatus: 'Failed',
    jobErrorCode: 'upstream_timeout',
    jobErrorMessage: 'The provider did not respond in time.'
  });

  assert.match(html, /role="alert"/, 'the failure is an alert');
  assert.match(html, /Error code: upstream_timeout/, 'the error code is shown');
  assert.match(html, /did not respond in time/, 'the message is shown');
});

test('the draft save states are shown', () => {
  const saving = render({ translation, draftText: 'x', draftSaveState: 'saving' });
  assert.match(saving, /Saving…/, 'the saving state is shown');

  const saved = render({ translation, draftText: 'x', draftSaveState: 'saved' });
  assert.match(saved, /Saved/, 'the saved state is shown');

  const error = render({ translation, draftText: 'x', draftSaveState: 'error' });
  assert.match(error, /Could not save — retrying/, 'the retrying state is shown');
});

test('the persistent not-saved warning is shown once the retries are exhausted', () => {
  const html = render({
    translation,
    draftText: 'x',
    draftSaveState: 'error',
    draftSaveExhausted: true
  });

  assert.match(html, /Not saved — copy your text before leaving/,
    'the persistent warning is shown');
  assert.match(html, /role="alert"/, 'the warning is an alert');
});

test('the elapsed time is derived from the backend timestamps', () => {
  const html = render({
    jobStatus: 'Completed',
    translation,
    draftText: translation.description.text,
    jobElapsedMs: 30000
  });

  assert.match(html, /Elapsed: 30s/, 'the elapsed time is shown');

  const unknown = render({
    jobStatus: 'Processing',
    jobElapsedMs: null
  });

  assert.ok(!/Elapsed:/.test(unknown),
    'no elapsed time is invented when the backend supplied no start time');
});

test('the cancel control is offered while a job is running', () => {
  const html = render({ jobStatus: 'Processing', jobStage: 'FetchingData' });

  assert.match(html, />Cancel</, 'the cancel control is offered');
});

test('the retry control is offered only when a retry is possible', () => {
  const offered = render({ jobStatus: 'Failed', canRetry: true });
  assert.match(offered, /Try again/, 'the retry control is offered');

  const notOffered = render({ jobStatus: 'Queued', canRetry: false });
  assert.ok(!/Try again/.test(notOffered),
    'the retry control is not offered for a running job');
});
