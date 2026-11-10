import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

/**
 * A render smoke test for <SteamGameSearchSection>.
 *
 * The component is a `.jsx` file, and Node's test runner cannot import
 * JSX or CSS directly. So the component is loaded through **Vite's own
 * SSR module loader** — the same transformer the production build uses
 * — which means the markup under test is the real, transformed
 * component, not a re-implementation.
 *
 * It needs no extra dependency (Vite is already a dev dependency) and
 * no browser.
 *
 * It is deliberately not a full DOM test: there is no jsdom or testing
 * library available offline, so interactions (clicking a candidate) are
 * covered by the pure state-machine tests in `steamSearch.test.js`. What
 * this file proves is that the component renders, that the states are
 * visually distinguishable, and that the accessibility affordances are
 * actually present in the markup.
 */

/** The Vite dev server used to transform the JSX. */
let viteServer;
let SteamGameSearchSection;

/** Render the section with sensible defaults. */
const render = (props = {}) =>
  renderToStaticMarkup(
    createElement(SteamGameSearchSection, {
      productName: 'Portal 2',
      canSearch: true,
      isSearching: false,
      candidates: [],
      selectedCandidate: null,
      errorMessage: null,
      emptyMessage: null,
      hasSearched: false,
      onSearch: () => {},
      onSelect: () => {},
      onClearSelection: () => {},
      isDisabled: false,
      ...props
    })
  );

/** One candidate fixture. */
const candidate = {
  appId: 620,
  name: 'Portal 2',
  tinyImage: 'https://example.test/capsule.jpg'
};

before(async () => {
  const vite = await import('vite');

  viteServer = await vite.createServer({
    server: { middlewareMode: true },
    appType: 'custom',
    logLevel: 'error'
  });

  const module = await viteServer.ssrLoadModule(
    '/src/components/admin/SteamGameSearchSection.jsx'
  );
  SteamGameSearchSection = module.SteamGameSearchSection;
});

after(async () => {
  if (viteServer) await viteServer.close();
});

test('the search button is labelled and enabled', () => {
  const html = render();

  assert.match(html, /Search Steam/, 'the button has a clear label');
  assert.match(html, /type="button"/, 'the button is not a submit button');
  assert.ok(!html.includes('disabled'), 'the button is enabled');
});

test('the search button is disabled when the product name is empty', () => {
  const html = render({ productName: '', canSearch: false });

  assert.match(html, /Search Steam/, 'the button is still labelled');
  assert.match(html, /disabled/, 'the button is disabled');
});

test('the search button is disabled while a search is running', () => {
  const html = render({ isSearching: true, canSearch: false });

  assert.match(html, /Searching\.\.\./, 'the button shows the busy label');
  assert.match(html, /disabled/, 'the button is disabled');
});

test('the loading state is announced to assistive technology', () => {
  const html = render({ isSearching: true });

  assert.match(html, /role="status"/, 'the busy state is a live region');
  assert.match(html, /aria-live="polite"/, 'the busy state announces politely');
});

test('the error state is announced as an alert', () => {
  const html = render({ errorMessage: 'Steam search failed. Please try again.' });

  assert.match(html, /role="alert"/, 'the error is an alert');
  assert.match(html, /Steam search failed\./, 'the message is shown');
});

test('the candidates are rendered as a radio group', () => {
  const html = render({ candidates: [candidate], hasSearched: true });

  assert.match(html, /role="radiogroup"/, 'the list is a radio group');
  assert.match(html, /aria-label="Steam game candidates"/, 'the group is labelled');
  assert.match(html, /role="radio"/, 'each candidate is a radio');
  assert.match(html, /Portal 2/, 'the candidate name is shown');
  assert.match(html, /App ID 620/, 'the App ID is shown as secondary information');
});

test('the thumbnail is rendered as an image source only', () => {
  const html = render({ candidates: [candidate], hasSearched: true });

  assert.match(html, /src="https:\/\/example\.test\/capsule\.jpg"/, 'the image source is set');
  // The image is decorative, so it carries an empty alt and the
  // candidate's name is the real, accessible label.
  assert.match(html, /alt=""/, 'the image is decorative, so it has an empty alt');
  assert.ok(!html.includes('<script'), 'no script is rendered');
});

test('a candidate without a thumbnail renders a fallback', () => {
  const html = render({
    candidates: [{ appId: 620, name: 'Portal 2', tinyImage: null }],
    hasSearched: true
  });

  assert.match(html, /steam-candidate-image-fallback/, 'the fallback icon is rendered');
  assert.ok(!html.includes('<img'), 'no broken image element is rendered');
});

test('the selected candidate is announced without relying on colour', () => {
  const html = render({
    candidates: [candidate],
    selectedCandidate: { appId: 620, name: 'Portal 2' },
    hasSearched: true
  });

  assert.match(html, /aria-checked="true"/, 'the selected radio reports its state');
  assert.match(html, /Selected/, 'a text label states the selection');
  assert.match(html, /is-selected/, 'the selected class is applied');
  assert.match(html, /Selected Steam game/, 'the selected summary is shown');
});

test('an unselected candidate is not marked as selected', () => {
  const html = render({
    candidates: [candidate],
    selectedCandidate: { appId: 999, name: 'Other' },
    hasSearched: true
  });

  assert.match(html, /aria-checked="false"/, 'the radio reports it is not selected');
});

test('the empty result message is shown', () => {
  const html = render({
    candidates: [],
    hasSearched: true,
    emptyMessage: 'No matching games were found on Steam. Try a different name.'
  });

  assert.match(html, /No matching games were found/, 'the message is shown');
});

test('the hint states that a Steam game selection is required', () => {
  const html = render({ hasSearched: false });

  assert.match(html, /Steam game selection is required/i,
    'the hint states that generation needs a selected Steam game');
  assert.ok(!/without a Steam game/i.test(html),
    'the hint does not claim generation works without a Steam game');
});

test('the selected candidate can be cleared', () => {
  const html = render({
    candidates: [candidate],
    selectedCandidate: { appId: 620, name: 'Portal 2' },
    hasSearched: true
  });

  assert.match(html, /Clear/, 'the clear control is labelled');
});

test('the Steam type is never rendered as a product type', () => {
  const html = render({ candidates: [candidate], hasSearched: true });

  // The candidate fixture deliberately has no `type`; the component must
  // not invent one, and must not render "app" as a label.
  assert.ok(!/>app</.test(html), 'the raw Steam type value is not rendered');
  assert.ok(!/Full game/i.test(html), 'no full-game claim is made');
});

test('no price, metascore or platform is rendered', () => {
  const html = render({ candidates: [candidate], hasSearched: true });

  assert.ok(!/price/i.test(html), 'no price is shown');
  assert.ok(!/metascore/i.test(html), 'no metascore is shown');
  assert.ok(!/platform/i.test(html), 'no platform is shown');
});
