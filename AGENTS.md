# AGENTS.md - Quipu Android

## ⚠️ LÉEME PRIMERO — Instrucciones para el agente

Antes de comenzar cualquier tarea, el agente DEBE:

1. **Leer este archivo completo** antes de ejecutar cualquier comando o modificar archivos.
2. **Cargar los skills relevantes** según la tarea (git-commit, design-taste-frontend, impeccable, etc.)
3. **Leer CONTEXT.md** antes de cambiar startup, sync, navegación o modales.
4. **Leer los tests existentes** antes de modificar lógica.
5. **Ejecutar `npm run ci`** antes de commitear.
6. **Seguir las reglas de commits** al pie de la letra (abajo).

---

## Project Overview

Quipu Android is the React Native/Expo Android version of the Bucks Manager Google Apps Script app (rebranded as Quipu for launch). It must preserve the mobile GAS workflow and use each user's private Google Sheet as the database. There is no custom backend.

The app is built to scale to thousands of transactions per user across many years of history. All performance, memoization, and split decisions below are written with that growth in mind.

## Core Rules

- Do not show demo finance data during app startup.
- If there is no Google session, show the minimal Quipu login screen with only Google sign-in.
- Treat Google Drive data as private user data. Read or write Drive/Sheets only through the app runtime or when the user explicitly authorizes it.
- Do not commit `.env`, OAuth secrets, spreadsheet IDs, `.expo/`, logs, `dist/`, build outputs, `store-listing/` (regenerable artwork with real user data), or `node_modules/`.
- Keep deployment-specific IDs such as `EAS_PROJECT_ID` in `.env` or build environment variables, not hardcoded in source.
- Treat `DESIGN.md` as a local design brief, not a durable repo contract. Fold lasting decisions into this file and `README.md` instead.
- Keep the Google Sheets transaction contract unchanged. UI chrome can switch between Spanish and English from Settings, while user-entered transaction descriptions must stay exactly as typed.
- Display money with the selected currency symbol from Settings, defaulting from the device locale when no preference is saved.
- Preserve the four exact transaction types:
  - `INGRESO FRECUENTE`
  - `INGRESO NO FRECUENTE`
  - `GASTO FRECUENTE`
  - `GASTO NO FRECUENTE`

## Google Sheets Contract

The app uses one spreadsheet with two tabs:

- `INCOME AND EXPENSES`
- `MONTHLY SUMMARY`

When no compatible spreadsheet exists, create a new spreadsheet named `INCOME AND EXPENSES`, with sheet tabs `INCOME AND EXPENSES` and `MONTHLY SUMMARY`.

## OAuth Scope Flow

- Configure Google Sign-In without Drive/Sheets scopes for the initial account login.
- Request Google Workspace scopes incrementally with `GoogleSignin.addScopes()` immediately before reading or writing Drive/Sheets. `GoogleSignin.configure()` carries only `webClientId` (explicit Cloud project anchor) plus an `accountName` hint on switch fallback; never scopes.
- Keep the required scopes limited to Drive metadata read-only and Google Sheets access:
  - `https://www.googleapis.com/auth/drive.metadata.readonly`
  - `https://www.googleapis.com/auth/spreadsheets`

## Android Development

Use:

```powershell
npm run android
```

The script in `scripts/run-android.ps1` sets Java and Android SDK paths and targets a physical ADB-authorized phone. Use `npx expo start` only when a compatible development build is already installed on the phone. WiFi ADB works the same as USB (`adb pair` once, then `adb connect`). `npm run android:release` builds the release APK with Gradle and installs it over the debug build — never uninstall first, or local data (tags, preferences, PIN, pending records) is wiped.

## Architecture and Performance Invariants

These rules reflect the current shape of the app and the scale it must support. Update them in the same commit that changes the underlying mechanism.

### Runtime state

- `App.tsx` owns cross-cutting runtime state: session restore, preferences, cache hydration, Google synchronization, optimistic writes, pager state, and modal refs. Cross-cutting logic has been extracted into dedicated hooks including splash/pin/foreground gates (see `CONTEXT.md` for the full list).
- The three main pages stay mounted inside one animated pager. Primary interaction modals open through refs so opening them does not require a root visibility-state round trip.
- The shell stays mounted behind the video splash: `App.tsx` renders `mainContent` first, then a black `postSplashBlack` veil (120ms hold + 280ms fade, native driver), then `StartupSplash` as an `absoluteFill` overlay on a `#000000` root. `hideSplash` calls `hideAsync()` before `setSplashGone(true)`. Do not return early from the splash branch or the first frame flashes `themeBg`.
- Branding is deduplicated: `app.json` points `icon`, all three `adaptiveIcon` images, and `web.favicon` at `./assets/icon-bucks.png` (`backgroundColor #000000`). `assets/` holds only `icon-bucks.png`, `splash.mp4`, `splash-icon-bucks.png` (native poster), plus `fonts/`.
- `StartupSplash` plays `assets/splash.mp4` via `expo-video` (muted, no loop, `contain`, 260px centered on `SPLASH_BG #000000`); exit needs `exiting && ended` (`playToEnd` or 2300ms fallback) then a 220ms fade. Native `expo-splash-screen` uses `duration: 0, fade: false` so the JS video owns the exit. Icon/video/`app.json` changes need `npx expo prebuild --clean` + `npm run android`; `r` only refreshes JS.
- Mutations update React state and the local cache first, then write to Sheets and force one reconciliation read.
- `reloadFromGoogle()` shares one in-flight promise. `pendingSyncRef` prevents an ordinary refresh from replacing optimistic state. Each mutation sets `pendingSyncRef.current = true` before the sync call so the reconciliation does not overwrite the optimistic update. Pull-to-refresh on the four tab screens reuses it as `reloadFromGoogle(token, sheetId, false, true)` (manual spinner only via `refreshCount`, no-op while pending/offline); background syncs never drive the spinner. Modals and bottom sheets are excluded.

### Hydration and sync

- Hydrate the local financial cache before waiting on Google Sheets, then revalidate in the background.
- Reuse the saved spreadsheet ID before calling `findCompatibleSheets()`.
- Keep Drive structure validation bounded. Do not make it fully sequential or launch an unbounded request burst.
- Add, edit, delete, and move interactions must update locally before remote reconciliation.
- Add frequent income as a normal transaction with type `INGRESO FRECUENTE`; the legacy monthly summary value is read-only fallback data.
- If column F already has the normalized `Tags` header, do not repeat tag migration or formatting writes.
- On `reloadFromGoogle`: read the tag catalogue from `MONTHLY SUMMARY!K2`, merge with in-memory `tagsList` using `mergeTagsFromSheet` which starts from sheet tags (source of truth) and adds only local custom tags not yet synced. The debounced write-back uses `writeTagsCatalog` to push the full local catalogue to the sheet so deletions and label updates propagate. User tag edits additionally call `writeTagsNow` immediately (same `syncQueue`) so a reload cannot clobber them with stale sheet values. Offline deletes leave tombstones (`bucks_deleted_tags`) that the reload filters until the sheet converges; renames to an existing label are blocked by `isDuplicateTagLabel`.
- If the stored spreadsheet was trashed in Drive, clear the local cache and start fresh without erroring out.

### Render and re-render budget

The list path must stay cheap even when a user accumulates thousands of rows over many years:

- Keep transaction grouping and sorting linear outside the actual sort; avoid date parsing inside sort comparisons or group lookup scans.
- Preserve `removeClippedSubviews={false}` on the Android transaction list unless emulator/device testing proves the historical blank-row regression is gone.
- `SectionList` virtualizes; do not introduce custom virtualization that breaks its keyExtractor contract.
- The financial cache, summaries, and frequent-income map are precached on transaction read. Do not re-parse dates inside sort/filter/group passes.
- The pager translates on the native driver (`useNativeDriver: true`) so the JS thread stays free for list work. The App `tab` state commits on slide completion (heavy tree rests idle); `BottomNav` focus is optimistic/local from press (outgoing clears instantly, incoming glides with the slide — never two lit tabs), so visuals glide with the slide. While sliding, the strip sets `renderToHardwareTextureAndroid` so 880 views composite as one layer on 120Hz panels (measured: kills 150ms freezes).

### Memoization

- Every reusable UI primitive must be wrapped in `React.memo` at creation time. This includes all components in `src/components/ui/` and `src/components/layout/`, plus screen-level list rows and headers.
- `AppText`'s `Text` and `TextInput` are memoized and observe the font preference through a sync external store so a font change does not remount rows.
- `TransactionRow` is memoized with `keyExtractor` derived from `rowId+rawDate+createdAtMs`; do not include amount or detail in the key.

### Theme and palette contexts

The theme is split into three contexts to keep rerenders scoped to what actually changed:

- `ThemeModeContext` exposes `{ theme, toggleTheme }`. Components that only need to know whether it is dark or light subscribe here.
- `ColorSchemeContext` exposes `{ colorScheme, setColorScheme }`. Components that only react to the accent change subscribe here.
- `PaletteContext` exposes the resolved `Palette`. Components that render colors subscribe here.
- The legacy `useTheme()` hook still returns the combined object for callers that genuinely need everything, but new code must prefer the split hooks.

Do not re-merge these contexts. Do not introduce a global "settings" context that bundles theme, language, currency, and font together; each preference gets its own subscription.

### Theme crossfade

- The shell background snaps through two opacity overlays (dark/light) over a solid base, driven by an `Animated.Value` over ~20ms on the JS driver when the toggle is pressed (native driver races ahead of the palette commit and shows both themes at once; a long fade does the same).
- The shell root and `HeaderShell` are `Animated.View`. The two SVG fades (`HeaderFade`, `HeaderTitleFade`) keep their snap-into-place behavior because they receive a string color prop and cannot interpolate.
- `HeaderActionButton` fires `onPress` on `onPressIn` (not on release) so the toggle lands while the finger is still down. Its feedback animation is 60ms in, 60ms out.
- `getPalette` memoizes the result for each `(theme, scheme)` pair in a small LRU. Do not remove that cache.

### Tag identity and language changes

- Transaction tags store stable `tag.id` values, never free-form labels. The catalogue may change its `label` per language without breaking the link.
- `migrateTagReferences` accepts a mix of legacy labels and ids. It resolves ids first, then `DEFAULT_TAGS` labels in both Spanish and English, then creates a deterministic `custom-{slug}` orphan id for unknown legacy labels.
- `slugifyTagLabel(label)` produces a stable `custom-{slug}` id so recreating a deleted tag reattaches the same id.
- Custom user tags are not translated. Default tags (`default-comida`, `default-salud`, etc.) are translated through the catalogue; their colors persist across language switches.
- Components resolve an id to its label and color through shared maps (`tagColorMap`, `tagLabelMap`, `findTagById`, `labelForTagId`).
- `applySearch` accepts an optional `tagLabelsById` map so text search matches the tag label in the current language.
- `localCache` schemaVersion is 3. The in-memory `migrateTransactionTags` runs once when tags finish loading so legacy label refs are rewritten to ids without persisting the migration separately.

### Local cache and persistence

- The local cache is a single JSON file in `documentDirectory`. Bump `CACHE_VERSION` whenever the on-disk shape changes.
- `SecureStore` is used for tokens, the saved spreadsheet id, the PIN, history, and the tag catalogue. Do not move these to `FileSystem` or `MMKV` without measured evidence.
- `loadHistory` prunes entries older than 30 days on read.
- Tag persistence uses the catalogue at the current language. The catalogue must always include the six default ids (`default-salud`, `default-comida`, `default-viaje`, `default-transporte`, `default-ocio`, `default-educacion`) even when the user hides them in the UI.

### Cloud-synced UI preferences
- Cosmetic preferences (language, currency symbol, font, accent scheme) are persisted to `MONTHLY SUMMARY!L1:L2` (L1 = header `UI PREFERENCES`, L2 = compact JSON `{ v: 1, language, currencySymbol, fontPreference, colorScheme }`). PIN, token, and history stay device-local.
- `usePreferences.save*()` schedules a 1.5s debounced write that runs through the same `syncQueue` as tags and transactions. `sanitizeUiPreferences` drops unknown / out-of-vocabulary fields so a corrupted sheet row never reaches state.
- On `reloadFromGoogle`, `readUiPreferences` is the 4th parallel read. If the sheet carries a value, `useGoogleSync` calls `usePreferences.applyRemotePreferences` to overwrite the local copy. The sheet wins; SecureStore only leads the UI between launch and the first successful sync.
- `App.tsx` wires the two hooks bidirectionally: `wireSheetPersistence(scheduleUiPreferencesWrite)` (preferences → sheet) and `wireRemoteUiPreferences(applyRemotePreferences)` (sheet → preferences).
- New spreadsheets initialize L1:L2 with a `sky` scheme and detected device language so the user always sees a coherent first-run look.

### Session and multi-account

- Account switching is silent-first with no day limit: fast-path on a tokeninfo-validated cached token, then `signInSilently`, then `signIn` with an `accountName` hint so Google enters directly without the chooser. The picker is only a degradation fallback. Consent is one-time per account (Google remembers grants); never re-request scopes that are already granted.
- Persist the fresh access token to the `connectedAccounts` record on every successful auth (connect, silent, picker, fast-path), not just the first connect.
- Snapshot the current session (token, sheetId, accountInfo) before `runSwitchCleanup`; if the target account fails or the user cancels, restore A via `onConnectGoogleWorkspace` instead of leaving the user logged out.
- `GoogleSignin.configure()` is always called bare except for the switch fallback hint; the `finally` re-applies bare config to clear the hint. Do not add scopes to `configure()` — Workspace scopes stay incremental via `addScopes()`.

### Mutation pipeline

- A module-level `syncQueue` in `useGoogleSync.ts` (exported for `connectFlow.ts`) serializes Sheets mutations so a fast edit cannot race the reconcile read of an earlier edit.
- Disconnect Google when the token fails and there is no local cache.
- Mutations always update local state and the cache before issuing the network call. Failed network calls keep the local data visible with a pending or error status.
- `connectFlow.ts` contains the offline-first connect logic (`combineTransactions`, `ensureTagsInCatalogue`, `scheduleBackgroundUpload`, `handleOfflineAfterConnect`) extracted from `useGoogleSync` as explicit-parameter functions with no closure coupling.

### Imports and packaging

- Import `MaterialCommunityIcons` from `@expo/vector-icons/MaterialCommunityIcons`, never the package root; the root entry bundles every icon font.

### DevDependencies

- Do not remove `test-renderer` from devDependencies. It is a peerDependency of `@testing-library/react-native@14.x` for React 19 (replaces the discontinued `react-test-renderer`). Auditing tools may flag it as "unused" because it is never directly imported — it is resolved as a peer at install time.

## Validation

Before committing app changes, run:

```powershell
npm run ci
```

`npm run ci` checks formatting, unused symbols, strict types, and the full jest suite. There is no coverage gate (`test:coverage` is informational only). For cleanup work, also verify every deleted file is unreachable from `index.ts` or an Expo config/build entry.

When possible, also install/run on a real Android device. For performance work, capture one focused flow with `gfxinfo`, Perfetto, or Simpleperf; do not treat a broad or unstable emulator run as timing evidence.

Read `CONTEXT.md` before changing startup, sync, transaction ordering, navigation, or modal ownership. Update `README.md`, `AGENTS.md`, and `CONTEXT.md` when a durable contract changes.

## Git Commits

Uses `git-commit` and `commit-policy` skill (merged from awesome-copilot/skills/git-commit + project conventions). See `~/.opencode/skills/git-commit/SKILL.md` and `~/.opencode/skills/commit-policy/SKILL.md`.

Key project rules:

- `refactor:` for P3 codebase maintenance
- Hyphen bullets in body, short body (what/why not how)
- Each bullet MUST stay on a single line — never wrap a bullet across multiple lines
- Prefer multiple focused commits unless told "no los separes"
- Verify `git status` + `git diff` before writing message
- Never commit secrets or build artifacts

## Hard Rule

**Do not commit, push, or create pull requests unless the user explicitly tells you to.**

The user will say one of: "commit", "comitea", "commitea", "haz commit", "push", "pr", or "crea el PR". Until you hear that, assume the work is in progress. No commits. No pushes. No PRs.

## What this means

- After you finish implementing a change, stop. Do not stage, commit, or push.
- If the user says "commitea" (their Spanish shorthand), that counts as explicit permission.
- If unsure, ask: "¿Commiteo?" (Spanish) / "Commit?" (English).
- This applies to every agent: opencode, codex, claude, mimo, commandcode, and any other coding agent.

## Why

The user works iteratively. An unsolicited commit creates noise, breaks their flow, and may expose incomplete or experimental code. They control when history is written.

## UI Direction

Use the mobile GAS workflow as the functional reference, but follow the current native visual system:

- Dark theme uses a blue-slate shell, not green-black. Light theme uses soft warm gray backgrounds with white surfaces.
- In dark theme, primary actions should follow the active scheme's `primary` accent instead of muted indigo. Light theme should feel pastel and warm, with scheme accents instead of stark white surfaces or blue controls. Green and red are semantic only for income and expense states.
- KPI/stat cards use two-column mobile layouts, soft surfaces, 14px radius, and minimal outer borders.
- Amounts and finance values must use tabular numbers (`fontVariant: ["tabular-nums"]`).
- Typography is centralized in `src/theme/typography.ts` (`T` tokens). Do not use arbitrary `fontSize`/`fontWeight` inline. Use semantic tokens: `caption 11/500`, `metadata 12/500`, `label 13/600`, `body 15/400`, `bodyStrong 15/600`, `section 17/700`, `title 19/700`, `pageTitle 26/700`, `amountList 16/700`, `amountHero 20/700`, `amountKpi 24/700`, `amountStat 17/700`. Ratio ~1.2-1.25 between steps, fixed scale for app UI (not fluid clamp).
- Weights allowed: `700` titles/amounts, `600` list labels, `500` metadata/inputs, `400` body. Never `900` (and avoid `300/100` except display fonts).
- Default font is `Inter` (via `src/components/ui/fontConstants.ts` and `AppText` store). `InterVariable` is preferred variable alternative. Keep additional families in Settings but preview each in its own family. `AppText` (`Text`/`TextInput`) is the only entry for `fontFamily`; do not import `NativeText` or hardcode `fontFamily` outside `fontConstants`/`typography`.
- All `Text` must come from `@/components/ui/AppText` (which injects `fontFamily` and global scale). `BarChart`/`SavingsLineChart` SVG texts must use `useAppFontFamily()` + `T.chartLabel/chartValue`.
- Keep borders for affordance on inputs, selects, destructive/secondary buttons, and internal row separators. Avoid border-heavy cards.
- On the Gastos screen, keep the active period label in the header subtitle so the period dropdowns stay high and compact.
- Bottom navigation should stay compact and translucent/floating, with a squircle add button protruding slightly above its container without making the bar taller or clipping the button, plus a subtle active indicator.
- Settings should expose local preferences for language, currency symbol, and font style. Initialize currency from the device locale when no preference has been saved.
- Bottom tab focus must update on press without waiting for the pager animation. Modal open/close interactions should also feel nearly instant.
- The Analysis screen should stay mobile-readable: compact KPI rows, chart labels, and a simplified monthly table.
- Modals should use rounded dark/light panels, clear labels, bordered inputs, large actions, and theme overlay tokens.

<!-- PERUVIAN_SPANISH -->

# Peruvian Spanish

Responde siempre en español peruano (español del Perú).

## Reglas

- **Tuteo**: usa "tú" siempre, nunca "vos".
- **No uses**: "che", "pana", "boludo", "coño", "hostia", "vosotros", "coger" (en sentido de tomar/obtener), "ordenador", "conducir" (manejar), "coche", "cerveza" (chela o fría), "guay", "mola".
- **Peruanismos comunes**: "ps" (al final de frases: "dime ps"), "dime ps" (como una forma de repreguntar algo que no se respondió), "ya" ("ya, ya"), "bacán/xvr" (genial), "de una" (inmediatamente), "al fast" (super rapido),"al toque" (rápido), "ahorita" (ahora/en un momento), "causha" (amigo), "bateria" (amigo), "flaco/flaca" (apelativo amistoso), "jato" (casa), "relax" (tranquilo), "habla p mano" (saludo mas frecuente que "causa"), "apla" (saludo: "apla causha"), "en que estás" (saludo), "así noma" (así no más), "ya, ya" (OK, entendido), "ni idea", "va" (ok), "ptmr me webee" (uy, me equivoqué en lo que hice), "la cagué" (me equivoqué terriblemente, no salió como queríamos)
- **Comida**: "ceviche", "lomo saltado", "ají", "papa rellena", "rocoto relleno", "causa", "chifa", "anticuchos", "picarones".
- **Lugares**: las referencias geográficas usan nombres peruanos: "Lima", "Miraflores", "San Isidro", "provincias".

## Modo

- Trato informal con el usuario ("tú", "oye", "qué tal") a menos que el contexto pida cortesía.
- Responde directo, sin rodeos. Si hay jerga, úsala naturalmente, no la fuerces.
- Marcas peruanas: "Inca Kola", "Pilsen", "Cusqueña", "Donofrio".
<!-- PERUVIAN_SPANISH -->
