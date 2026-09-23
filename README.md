# Quipu — Ahorros & Gastos

Your money, clear at a glance. Quipu is a private finance tracker for
Android: income, expenses, tags, and yearly analysis, with your data living
in your own Google Sheet — no custom backend, no third-party servers.

- Track income and expenses with color tags and daily history.
- Monthly KPIs, per-tag breakdown, and a full yearly analysis with alerts.
- Every record syncs to your private Google Sheet; multi-account supported.
- Spanish and English UI, light and dark themes, customizable palette.

Play titles: ES `Quipu – Ahorros & Gastos`, EN `Quipu – Money Manager`.

React Native/Expo Android version of the Bucks Manager Google Apps Script app. Rebranded as **Quipu** for launch.

The app has no custom backend. Each user signs in with Google and uses a private Google Sheet as the database.

## Current Flow

1. Open the app.
2. If there is no Google session, show only the Quipu login screen.
3. Sign in with Google.
4. Restore the last spreadsheet and its local financial cache when available.
5. Paint cached transactions immediately and revalidate Google Sheets in the background.
6. Scan Google Drive only when there is no usable saved spreadsheet, validating candidates in bounded parallel batches.
7. Prefer an existing spreadsheet named `INCOME AND EXPENSES`; if none exists, create it with that exact name.

No demo finance data is shown during startup. A short video splash (`assets/splash.mp4`, ~1.78s, black background) plays while bootstrap restores preferences/session/PIN and the cache hydrates, then a black veil fades (120ms hold + 280ms out) into the dashboard. The shell stays mounted behind the splash overlay so there is no light flash between video and content. The splash also reopens on Google login/account switch by design.

Add, edit, delete, reorder, and frequent-income changes update the local UI first. Google Sheets reconciliation runs in the background and a failed sync keeps the local data visible with a pending/error status.

Frequent income is added through the normal transaction form using `INGRESO FRECUENTE`. Existing monthly values remain readable for legacy sheets, but the app no longer edits them through a separate modal.

If the stored spreadsheet was trashed (moved to Google Drive trash), the session clears the local cache and starts fresh.

## Google Sheet Contract

The spreadsheet must contain two tabs:

- `INCOME AND EXPENSES`
- `MONTHLY SUMMARY`

`INCOME AND EXPENSES` columns:

| Column | Header | Content |
| --- | --- | --- |
| A | Date | Transaction date (DD-mmm-YY) |
| B | Amount | Numeric value or formula |
| C | Detail | Free-text description |
| D | Type | Exact transaction type |
| E | CREATION TIME | Time the transaction was created |
| F | Tags | Comma-separated tag ids |

Legacy GAS headers (Spanish) are still accepted on read: `Fecha`, `Monto`, `Detalle`,
`Tipo` / `Tipo de gasto`, `HORA DE CREACION`, `Etiquetas`.

`MONTHLY SUMMARY` columns:

| Column | Header |
| --- | --- |
| A | MONTH |
| B | FREQUENT INCOME |
| C | NON-FREQUENT INCOME |
| D | TOTAL INCOME |
| E | FREQUENT EXPENSE |
| F | NON-FREQUENT EXPENSE |
| G | TOTAL EXPENSES |
| H | MONTHLY NET |
| I | NET WITHOUT FREQUENT INCOME |

Legacy GAS aliases (`MES`, `MES Y AÑO`, `NETO SIN ING FRECUENTE`, etc.) are still
accepted on read.

Additional cells (outside the summary table):

| Cell | Content |
| --- | --- |
| K1 | Header: `TAGS CATALOGUE` |
| K2 | Full JSON array of tag objects `{id, label, color}` |

Supported transaction types:

- `INGRESO FRECUENTE`
- `INGRESO NO FRECUENTE`
- `GASTO FRECUENTE`
- `GASTO NO FRECUENTE`

## Visual System

- UI chrome supports Spanish and English from Settings. User-entered transaction descriptions stay exactly as typed, and the Google Sheets transaction type contract remains unchanged.
- Currency display uses the selected symbol from Settings and defaults from the device locale when possible.
- The current native visual direction uses a blue-slate dark theme and soft warm-gray light theme.
- The dark theme primary action color should use the app icon lime (`#C8FF00`) as the brand accent, not muted indigo. The light theme should use a pastel shell with lime/olive accents, not stark white or blue controls. Green and red are reserved for income and expense semantics.
- Cards should use soft surfaces, consistent 14px radii, and minimal outer borders.
- Inputs, selects, destructive actions, and internal separators may keep borders for affordance.
- Financial amounts should use tabular numbers where supported.
- On the Gastos screen, the active period label lives in the header subtitle so the period dropdowns stay high and compact.
- Bottom navigation is a compact translucent floating bar; the add button should protrude slightly above it without increasing or clipping the bar.
- Settings includes local preferences for language, currency symbol, and font style. Inter is the default; each alternate font is previewed in the selector. Currency starts from the device locale when no saved preference exists.
- On the first launch, language and currency start from the device locale. Google account actions allow switching/adding an account or revoking the current account without deleting its spreadsheet.
- Bottom tab focus changes immediately on press while the pager animates; modal open/close interactions should also feel nearly instant.
- The Analysis screen is optimized for mobile readability with compact KPI rows, chart labels, and a simplified monthly table.

## Commands

Use Node.js 24, matching CI. Install the exact locked dependencies:

```powershell
npm ci
```

Install the tracked pre-commit hook once per clone:

```powershell
npm run hooks:install
```

Run the full validation required before a commit or pull request:

```powershell
npm run ci
```

Individual checks:

```powershell
npm test
npm run test:watch
npm run test:coverage
npm run lint
npm run format:check
npm run eslint:fix
```

`test:coverage` prints an informational coverage report. There are no enforced coverage thresholds; `npm run ci` does not check coverage. See [TESTING.md](./TESTING.md) for scope, conventions, and known limits.

Install/run on a physical Android phone:

```powershell
npm run android
```

`npm run android` sets `JAVA_HOME`, `ANDROID_HOME`, `ANDROID_SDK_ROOT`, and Android platform-tools for that command. It targets a physical ADB-authorized phone and avoids a broken emulator being selected accidentally.

Build a release APK locally and install it on the connected phone (no Metro server, no EAS cloud):

```powershell
npm run android:release
```

`android:release` runs the same script with the `release` variant: it compiles with Gradle directly (`assembleRelease`, all ABIs), signs with the debug key, and installs over the existing app with `adb install -r -d`. Use it to validate a packaged build on a real phone — and to take final screenshots without the dev-launcher gear.

Install the release **over** the debug build, never uninstall first: same package and signature means your local data (tags, preferences, PIN, pending records) survives. Uninstalling wipes `SecureStore` and the local cache.

WiFi ADB works the same as USB: `adb pair` once, then `adb connect <ip>:<port>` on the same network, keep the phone awake, and run the commands above.

Build a development-client APK in the EAS cloud (so a tester can install a pre-built dev client and connect to your Metro):

```powershell
npm run android:build-dev
```

`android:build-dev` uses the `development` profile from `eas.json` (`developmentClient: true`, `distribution: "internal"`, `android.buildType: "apk"`). Download the resulting artifact from the EAS dashboard and install it with `adb install -r`.

Start Metro for an already installed development build:

```powershell
npx expo start
```

The QR flow only works after the phone already has a compatible dev build installed. It opens the JavaScript bundle in the installed app. It does not compile or install the native Android app.

## Play Store

- Listing languages: Spanish first; add the English listing only when ready (EN artwork is generated from the same templates on demand).
- Phone screenshots: 1080×1920 portrait (built at 2x for crispness). Feature graphic: 1024×500 PNG. App icon: `assets/icon-bucks.png` (512px export for the store).
- Artwork sources live in the gitignored local folder `store-listing/` (`template.html` + `shoot.mjs`, Playwright). Regenerate with `node store-listing/shoot.mjs es`; never commit screenshots — they contain real user data.
- Publish a locally built release (`npm run android:release`) for final validation and store screenshots: no dev gear, real performance.

## Google OAuth

Environment variables are loaded from `.env`:

- `GOOGLE_ANDROID_CLIENT_ID`
- `GOOGLE_WEB_CLIENT_ID`
- `EAS_PROJECT_ID`

Required scopes:

- `https://www.googleapis.com/auth/drive.metadata.readonly`
- `https://www.googleapis.com/auth/spreadsheets`

The app requests these Drive/Sheets scopes incrementally after the user chooses a Google account. Do not add them to the initial `GoogleSignin.configure()` call; keep the first login as basic identity and request Workspace access only when connecting the private spreadsheet.

The Android OAuth client must use package:

```text
com.kuskalabs.quipu
```

The debug/release SHA-1 in Google Cloud must match the keystore used to build the installed app.

## Project Structure

```text
App.tsx                         Main app composition and runtime state (splash overlay + black veil)
assets/icon-bucks.png           Single app icon (icon, adaptiveIcon x3, web favicon)
assets/splash.mp4               Video splash (expo-video, muted, no loop)
assets/splash-icon-bucks.png    Native splash poster (frame of splash.mp4, black bg)
src/api/googleAuth.ts           Google Sign-In and token management
src/api/googleWorkspace.ts      Google Drive and Sheets integration
src/api/sheetFormats.ts         Sheet date/number/header parsing
src/data/connectedAccounts.ts   Multi-account registry (sheet, scopes, cached token per account)
src/hooks/useSession.ts         Session, login, and silent-first multi-account switching
src/domain/bucksLogic.ts        Sheet contract, summaries, dates, and transaction rules
src/data/localCache.ts          Local-first financial cache
src/hooks/useFinancialState.ts      Aggregated financial state + wrapper methods
src/hooks/usePreferences.ts         Local preference persistence helpers
src/hooks/useTransactionMutations.ts  Optimistic transaction CRUD
src/hooks/useDebouncedSheetWrites.ts  Debounced sheet writes (1500ms)
src/hooks/usePickerCallbacks.ts     OptionSheet openers for settings
src/hooks/useThemeCrossfade.ts      Theme toggle animation state
src/hooks/useTabNavigation.ts       Tab state, pager animation, layout constants
src/hooks/useBootstrap.ts           Startup orchestration (GoogleSignin, restore, splash)
src/hooks/useSplashGate.ts          Splash visibility + black veil after video
src/hooks/usePinGate.ts             PIN gate + unlock animation
src/hooks/useForegroundSync.ts      AppState resume + debounced sheet reload
src/domain/connectFlow.ts           Offline-first connect (pure functions, not a hook)
src/hooks/useHistoryPanel.ts        History entries state + SecureStore load
src/hooks/useTagSync.ts             Tag lifecycle effects (load, migrate, cleanup)
src/hooks/useConfirmDialog.ts       Typed confirm-dialog callbacks
src/hooks/useTransactionActions.ts  Modal-ref → action callback bridge
src/utils/transactions.ts       Transaction filtering, sorting, and date grouping
src/utils/tags.ts               Tag catalogue, migration, and resolution
src/utils/history.ts            Transaction history tracking
src/utils/pin.ts                PIN storage and verification
src/utils/errorHandler.ts       Logging and error normalization
src/components/screens/         Dashboard, Expenses, Settings, Login, PIN, Search, Summary, StartupSplash (video)
src/components/modals/          Detail, Export, History, Search, TagEditor, Transaction, OptionSheet
src/components/layout/          BottomNav, Header, PeriodControls
src/components/ui/              StatCard, Kpi, BarChart, PieChart, Select, CalendarPicker
src/theme/                      ThemeContext, colors, constants
src/styles/baseStyles.ts        Shared React Native style definitions
tests/                          Unit tests (bucksLogic, error-handler, google-workspace, etc.)
.github/workflows/ci.yml        Push and pull-request validation
scripts/run-android.ps1         Physical-device Android run helper
scripts/check-format.mjs        Dependency-free source whitespace check
pnpm-workspace.yaml             pnpm hoisted linker config for Expo
CONTEXT.md                      Runtime map and performance invariants
AGENTS.md                       Agent instructions and project rules
.codebase-memory/               Optional shared knowledge-graph artifact
.codegraph/                     Local codegraph index (regenerable)
```

## Codebase Knowledge Graph

The project has two optional MCP-powered knowledge graphs that AI agents use for fast code navigation — they are not required to build or run the app.

### codebase-memory-mcp

14 MCP tools including `search_graph`, `trace_path`, `query_graph`, `get_architecture`, `get_code_snippet`, and dead-code detection. Indexes 158 languages with hybrid LSP type resolution.

The shared artifact at `.codebase-memory/graph.db.zst` lets teammates skip the full reindex:

```bash
# Index this project (first time)
codebase-memory-mcp index --path .
```

On a fresh clone the binary detects the artifact, decompresses it, and runs an incremental diff — ready in seconds.

### codegraph

Single MCP tool `codegraph_explore` — answers structural questions in natural language. Local index lives in `.codegraph/` (gitignored, regenerable via `codegraph serve`).

### Auto-configuration

Both servers are configured as MCP entries in Claude Code, Codex CLI, Gemini CLI, VS Code, Cursor, KiloCode, and OpenCode. Restart the agent after cloning and the tools are available immediately.

## Performance Invariants

- Never block cached startup or optimistic UI on Google Sheets.
- Reuse a valid saved spreadsheet ID before scanning Drive.
- Deduplicate in-flight reloads and do not overwrite optimistic state with an older remote response.
- Treat an existing `Tags` header as ready; do not repeat migration or formatting writes on every cold launch.
- Keep Drive compatibility scans bounded rather than sequential or unbounded.
- Import `MaterialCommunityIcons` from its direct module so Metro does not bundle unused icon-font families.
- Preserve the mounted pager and ref-driven primary modals unless device evidence justifies a different architecture.
- The theme is split into three contexts (`ThemeModeContext`, `ColorSchemeContext`, `PaletteContext`); a toggle of one does not rerender the others' subscribers. Do not re-merge them.
- The shell background and `HeaderShell` overlay snap over ~20ms (opacity overlays, native driver) when the theme toggles. The theme crossfade logic lives in `useThemeCrossfade` hook. The two SVG header fades snap because they accept a string colour prop.
- `getPalette` memoizes the result for each `(theme, scheme)` pair in a small LRU. Do not remove that cache.
- Dropdown selection components (`Select`) open an `OptionSheet` (bottom sheet via Modal) instead of an inline dropdown or portal. This avoids Android z-index issues with nested ScrollViews.
- Transaction tags store stable ids, not labels. Custom tags keep the label the user typed; default tags are translated through the catalogue and keep their colour. `migrateTagReferences` rewrites legacy label refs to ids once when the tag catalogue finishes loading.
- Tag catalogue (including colours) is persisted in sheet cell `MONTHLY SUMMARY!K2` so custom tag colours survive app data clear and device changes.
- User tag edits (create, rename, delete) write through `writeTagsNow` immediately; offline deletes leave tombstones so the next reload does not resurrect them.
- The pull-to-refresh spinner is manual-only: background syncs stay silent and update data in place.
- Every reusable UI primitive is `React.memo`-wrapped. New UI primitives must be memoized at creation time.

## Branding Assets

- `assets/` holds only `icon-bucks.png`, `splash.mp4`, `splash-icon-bucks.png`, plus `fonts/`. All `app.json` icon slots (`icon`, `adaptiveIcon.foreground/background/monochrome` with `backgroundColor #000000`, `web.favicon`) point at `icon-bucks.png`. Removed duplicates: `android-icon-*-bucks.png`, `favicon-bucks.png`, `splash-bucks.png`.
- `expo-video` renders the splash (`contentFit: contain`, 260px wide, centered on `#000000`). The native `expo-splash-screen` poster uses the extracted mp4 frame on `#000000` with `resizeMode: contain`.
- Icon, splash poster, video, or `app.json` plugin changes need a native rebuild (`npx expo prebuild --clean` + `npm run android`); `r` in Metro only refreshes JS.

## Repository Hygiene

- Do not commit `.env`, OAuth secrets, user spreadsheet IDs, `.expo/`, logs, `dist/`, build outputs, `store-listing/` (regenerable artwork with real user data), or `node_modules/`.
- Keep design briefs such as `DESIGN.md` local unless they become durable repo documentation.
- Put durable agent/developer guidance in `AGENTS.md`.
- Google Drive inspection from Codex should be read-only unless the user explicitly asks to modify a Drive file.
