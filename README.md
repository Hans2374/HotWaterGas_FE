# HotWaterGas Frontend (React + Vite)

The React admin and storefront front end for the HotWaterGas e-commerce
platform. It is a Vite project using React 19 with the React Compiler
enabled.

The admin product form includes an **AI description translation**
feature: the administrator picks a Steam game, and the platform
translates that game's English Steam store description into Vietnamese
for review before anything is saved to the product.

---

## Requirements

* **Node.js** `^20.19.0 || >=22.12.0` (the range Vite 8 requires) and the
  npm that ships with it.
* A running **ASP.NET Core 8 backend** (`HotWaterGas_BE`) for every API
  call. The frontend never talks to the Python AI service, to Steam, or
  to Ollama directly.

---

## Configuration

The frontend reads configuration from environment variables at build
time. Only one variable is needed:

| Variable | Required | Notes |
| --- | --- | --- |
| `VITE_API_BASE_URL` | yes | Absolute base URL of the .NET backend, e.g. `https://localhost:7140`. **Must not** end with `/api` — the API calls already carry their own `/api/...` prefix. |

Copy `.env.example` to `.env.local` and adjust the value for your
machine. `.env.local` is git-ignored; `.env.example` is committed and
contains placeholders only.

In development, `vite.config.js` also proxies `/api` to
`https://localhost:7140`, so the app can run on plain HTTP while the
backend runs on HTTPS. `/auth` and `/auth/google/*` are deliberately
**not** proxied — those are frontend routes handled by React Router.

Every API call goes through the shared axios client in
`src/api/axiosClient.js`, which attaches the admin bearer token,
converts PascalCase response keys to camelCase, and performs the
silent token refresh on a 401.

---

## AI description translation

### Architecture

```
React admin UI  →  ASP.NET Core 8 API  →  Python FastAPI (HotWaterGas_AI)  →  Ollama
```

**The browser only ever calls the .NET backend.** The Python service and
the local Ollama model are reachable from the backend alone. The internal
service token is never sent to the browser, and the frontend contains no
Python route, no Steam URL, and no Ollama port.

### Endpoints used

| Route | Purpose |
| --- | --- |
| `POST /api/admin/products/search-steam-games` | Search the Steam Store for candidates matching the product name. |
| `POST /api/admin/products/generate-description` | Translate the selected Steam store description into Vietnamese. |

Both are admin-only and go through `src/api/axiosClient.js`.

### The flow

1. **Type the product name.** The name is also the Steam search query,
   so it must be present before a search can start.
2. **Search Steam and select a candidate.** The panel deliberately shows
   only the thumbnail, the title and the App ID — never a price, a
   metascore or a platform, and never Steam's `type` field as proof
   that the candidate is a full game. A candidate is a *pointer* to a
   store app, not a verified fact.
3. **Translate.** The backend retrieves the English store description
   from Steam and translates it with the local model. The request body
   is deliberately minimal — `{ productName, steamAppId }` — so a
   caller cannot smuggle an instruction into the source text.
4. **Review.** The panel shows the translated text (editable), the
   warnings **by their stable code**, the description-source metadata
   (which Steam fields were translated, whether the source was
   truncated, whether it carried enough material), the release date,
   the platform list and the Windows/PC requirements.
5. **Apply to Form.** This is explicit and deliberate. It fills the
   form fields only — it never saves, and the product is persisted
   solely by the form's own save action.

### Rules the feature enforces

* **A Steam game selection is required.** Without an App ID there is no
  English source, so there is nothing to translate. The frontend
  rejects the request before it is made, and the backend rejects it too.
* **The Steam App ID is asserted, never inferred.** It is never derived
  from the product name, because an inferred App ID would silently
  attach another game's description to the product.
* **The App ID never reaches the product.** It is transient request
  context and is held outside `formData`, so it can never be written to
  the product payload or the database.
* **A translation is not a fact set.** The description is labelled
  *unverified* by construction — the pipeline translates, it does not
  check — and the panel never labels it verified or fact-checked.
* **Nothing is invented.** An absent, null, empty or "unknown" value
  never overwrites what the administrator has already typed.
* **The platform list is never joined automatically.** The product form
  has a single platform field, so the administrator must explicitly
  choose what to persist. Until they do, the field is left untouched.
* **Generating is not saving.** The translation lives apart from the
  form and reaches it only through an explicit Apply.
* **Regeneration never destroys work.** A failed translation preserves
  the existing draft and the administrator's edits to it, and an edited
  draft is never replaced without a confirmation.
* **Stale responses are discarded.** A slow response for an old product
  name or an old Steam selection can never replace the current draft.

### Module layout

```
src/
├── api/axiosClient.js                       # shared authenticated client
├── components/admin/
│   ├── AiDescriptionDraftSection.jsx        # review panel
│   ├── AiDescriptionDraftSection.css
│   ├── SteamGameSearchSection.jsx           # search-and-select panel
│   └── SteamGameSearchSection.css
├── services/
│   ├── aiDescriptionService.js              # transport only
│   └── steamSearchService.js
└── utils/
    ├── aiDescriptionRequest.js              # request shaping + error mapping
    ├── aiDescriptionMapping.js              # response → form mapping
    ├── aiDescriptionState.js                # pure lifecycle transitions
    ├── steamSearchRequest.js
    └── steamSearchState.js
```

The three `aiDescription*` utility modules are **dependency-free** and
contain only pure functions, so the whole lifecycle can be exercised
offline by the test suite without a bundler, a browser, or a network.
The React components are strictly presentational: they render and report
intent through callbacks, and they never call the backend themselves.

---

## Commands

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server. |
| `npm run build` | Build the production bundle into `dist/`. |
| `npm run preview` | Serve the production bundle locally. |
| `npm run lint` | Run ESLint over the project. |
| `npm test` | Run the offline test suite (`node --test`). |

### Tests

```powershell
npm test
```

The suite runs on Node's built-in test runner and needs no browser, no
DOM and no network. The component tests load the real JSX through
Vite's own SSR module loader — the same transformer the production
build uses — so the markup under test is the transformed component
rather than a re-implementation.

| File | Covers |
| --- | --- |
| `tests/aiDescription.test.js` | Request shaping, validation, error classification, response mapping, apply patch. |
| `tests/aiDescriptionLifecycle.test.js` | The pure state transitions of the translation draft. |
| `tests/aiDescriptionSection.test.js` | Rendered output of the review panel. |
| `tests/aiDescriptionRegression.test.js` | Cross-module guarantees, including that the App ID never reaches the product payload. |
| `tests/steamSearch.test.js` | Steam search request and state behaviour. |
| `tests/steamSearchSection.test.js` | Rendered output of the search panel. |
