# Quipu Android Context

## Runtime Shape

Quipu is an Expo/React Native client with no custom backend. Google Sign-In supplies an access token; one private Google spreadsheet remains the remote source of truth. A local JSON cache makes startup and finance interactions immediate while Sheets revalidation runs in the background.

`App.tsx` intentionally owns the cross-cutting runtime state: session restore, preferences, cache hydration, Google synchronization, optimistic writes, pager state, and modal refs. Cross-cutting logic has been extracted into dedicated hooks:

- **`useThemeCrossfade`** — manages the theme-toggle animation `Animated.Value` and synchronises with persisted preferences.
- **`useDebouncedSheetWrites`** — debounces UI preferences, deletion history, and tag catalogue writes at 1500ms. Tags are written via `writeTagsCatalog` (full catalogue overwrite, direct call), not a merge-only approach, so deletions propagate to the sheet. User tag edits additionally call `writeTagsNow`, which goes through `syncQueue` immediately so a reload cannot clobber them.
- **`usePickerCallbacks`** — consolidates `OptionSheet` openers for language, currency, font, color scheme, and Google account settings.
- **`useTabNavigation`** — owns tab state, `tabRef` mirror, pager `Animated.Value`, layout constants, and `changeTab` animation.
- **`useBootstrap`** — orchestrates `GoogleSignin.configure` (wrapped in try/catch), concurrent preference/session/PIN restore raced against an 8s timeout, and splash-screen hide.
- **`useHistoryPanel`** — owns history-entries state, loads history from SecureStore on mount, and exposes open/close callbacks.
- **`useTagSyncEffects`** — tag-load and tag-cleanup effects: loads tags, migrates legacy label refs, prunes orphaned tag ids from transactions, and syncs removals to the sheet.
- **`useConfirmCallbacks`** — typed confirm-dialog dispatcher (`delete`, `deleteSelected`, `removeAccount`, `disconnect`) and open/close helpers.
- **`useTransactionActions`** — bridges modal refs into action callbacks: `openAdd`, `openEdit`, `applySearchFilters`, `handleTransactionPress`, `openMoveMenu`, `exitSearch`, `openSearch`.
- **`useSplashGate`** — owns `splashGone` (logic) vs `splashVisible` (mount: overlay unmounts only after the veil fade ends) plus the black `postSplashBlack` veil (120ms hold + 280ms fade). Native modals (currency, merge) gate on `!splashVisible` because RN `Modal` paints above the splash overlay.
- **`usePinGate`** — owns `pinGated` and the 380ms unlock animation.
- **`useForegroundSync`** — owns the `AppState` resume listener and the debounced 1500ms sheet reload.
- **`useAppShell`** — owns the shell lifecycle in one place: `splashWanted` + `useSplashGate`, the three sheet→local wires (history, UI preferences, merge prompt) with honest deps, `usePinGate`, and `useForegroundSync`. `App.tsx` only consumes its return.
- **`usePageProps`** — owns the memoized page-prop blocks (dashboard/expenses/summary/settings/loadingBar + tabPage/header composition) with the same deps the inline memos had. `App.tsx` passes values in and renders from the return.
- **`useSummaryState`** — lives in `src/hooks/` (used by `SummaryView`); `connectFlow.ts` lives in `src/domain/` (pure offline-first functions, not a hook).
- **`useAppModals`** — owns the modal refs (transaction, detail, search, option sheet) and the App-level modal state (confirm dialog and merge prompt), plus pass-through of secondary modal visibility. Returns stable `{ refs, openers, closers, state }`.
- **`useDerivedSyncStatus`** — derives the sync-status text from `authError`/`syncError`/`hasLocalData`/`pendingSync`/`isSyncing`. Con datos locales nunca muestra "Mostrando datos guardados" (ruido): devuelve `""`.

The three main pages stay mounted inside one animated pager. Primary interaction modals open through refs so opening them does not require a root visibility-state round trip.

Deployment-specific Expo values, including `EAS_PROJECT_ID`, come from `.env` or the build environment.

## Startup and Sync

1. Restore preferences, PIN state, token, and spreadsheet ID concurrently.
2. If a cache exists for that spreadsheet, apply it immediately and release the splash.
3. Refresh the Google token and read transactions/summaries in the background.
4. If the stored spreadsheet is missing or incompatible, scan Drive in batches of five candidates.
5. Create `INCOME AND EXPENSES` only when no compatible named sheet is available.
6. If the stored spreadsheet was trashed in Drive, clear the local cache and start fresh.
7. Account switch always tries silent entry first with no day limit (validity is decided by Google via tokeninfo/silent; picker only as fallback). The switch fallback passes an `accountName` hint so Google enters directly without the chooser. The fresh token is persisted to the account record on every successful auth, and the previous session is snapshotted before cleanup so a failed/cancelled switch restores account A untouched.
8. Foreground resume refreshes the token without UI and retries once on 401/403; background writes use the session token when the SDK stayed on the other account.
9. Cold start never adopts a token from another account: the sheet owner is resolved via `findAccountBySheet` and a divergent SDK token is ignored (stored token retried, `TOKEN_KEY` untouched).

## Splash (Video) and First Frame

- `StartupSplash` (`src/components/screens/StartupSplash.tsx`) plays `assets/splash.mp4` (720x904, ~1.78s) centered at 260px wide (`contain`) on `SPLASH_BG #000000`. `expo-video` (`useVideoPlayer` + `VideoView`, muted, no loop) owns playback; exit requires `exiting && ended` where `ended` comes from `playToEnd` or a 2300ms fallback, then a 220ms fade plus a 600ms safety-net timer.
- `expo-splash-screen` is configured with `duration: 0, fade: false` (`App.tsx`); the JS video owns the exit. The native poster is `assets/splash-icon-bucks.png` (frame extracted from the mp4) on `#000000` so the handoff is black-on-black.
- `App.tsx` keeps the shell mounted behind the splash: `mainContent` (PIN / gated / themed shell) renders first, the black veil (`postSplashBlack`, 120ms hold + 280ms fade, native driver) sits above it, and `StartupSplash` is an `absoluteFill` overlay on top. `hideSplash` calls `hideAsync()` then `setSplashGone(true)`, so there is no one-frame `themeBg` flash between video and dashboard.
- `splashWanted = bootstrapping || accountTransition || rehydratingCache || (accessToken && isFirstRemoteLoad && !hasLocalData)`. The splash reopens on login/account switch by design (current behavior); `ConnectingOverlay` covers the in-shell `scanning/loading/creating/merging/syncing` states underneath.
- Branding assets are deduplicated: `app.json` points `icon`, `adaptiveIcon.foreground/background/monochrome`, and `web.favicon` all at `./assets/icon-bucks.png` (`backgroundColor #000000`). `assets/` holds only `icon-bucks.png`, `splash-icon-bucks.png`, `splash.mp4`, plus `fonts/`. Icon/video changes require a native rebuild (`npx expo prebuild --clean` + `npm run android`); an `r` reload only refreshes JS.

`reloadFromGoogle()` shares one in-flight promise. `pendingSyncRef` prevents an ordinary refresh from replacing optimistic state. Mutations update React state and the local cache first, then write to Sheets and force one reconciliation read. Each mutation sets `pendingSyncRef.current = true` before the sync call so the reconciliation does not overwrite the optimistic update. Pull-to-refresh on the four tab screens calls `reloadFromGoogle(token, sheetId, false, true)` (manual spinner only via `refreshCount`, so background syncs stay silent; no-op while `pendingSyncRef` is set or offline); modals and bottom sheets are excluded.

A module-level `syncQueue` serializes Sheets mutations so a fast edit cannot race the reconcile read of an earlier edit. The queue lives in `useGoogleSync.ts` and is exported for use by `connectFlow.ts` during offline-first connect.

`src/domain/connectFlow.ts` contains the offline connect logic extracted from `useGoogleSync`: `combineTransactions`, `ensureTagsInCatalogue`, `scheduleBackgroundUpload`, and `handleOfflineAfterConnect`. These are pure or async functions that take all dependencies as explicit parameters, with no React closure coupling.

## Data Contract

- Tabs: `INCOME AND EXPENSES`, `MONTHLY SUMMARY`.
- Transaction columns: date, amount/formula, detail, exact transaction type, creation time, tags.
- Exact types: `INGRESO FRECUENTE`, `INGRESO NO FRECUENTE`, `GASTO FRECUENTE`, `GASTO NO FRECUENTE`.
- Frequent income is created through the transaction form. Legacy monthly summary values remain a read-only fallback when a month has no frequent-income transactions.
- Legacy Spanish headers are still accepted on read: `Fecha`, `Monto`, `Detalle`, `Tipo` / `Tipo de gasto`, `HORA DE CREACION`, `Etiquetas`, `MES`, `NETO SIN ING FRECUENTE`, etc.
- Tag catalogue is persisted in `MONTHLY SUMMARY!K1:K2` (K1 header, K2 full JSON array). Custom tag colours survive app data clear and device changes. The debounced write uses `writeTagsCatalog` to push the full local catalogue to the sheet, so tag deletions, additions, and label translations all propagate. User edits additionally call `writeTagsNow` immediately through `syncQueue`; offline deletes leave tombstones (`bucks_deleted_tags`) that the reload filters until the sheet converges. The sheet remains the source of truth: `mergeTagsFromSheet` starts from sheet tags and only adds local custom tags not yet synced.
- Cosmetic UI preferences (language, currency symbol, font, accent scheme) are persisted in `MONTHLY SUMMARY!L1:L2` (L1 header `UI PREFERENCES`, L2 JSON). Writes are debounced 1.5s and serialized through the same `syncQueue` as tag and transaction writes. On `reloadFromGoogle` the sheet value wins over the local SecureStore copy; the local copy only leads the UI between launch and the first successful sync. PIN, token, and history are device-local only.
- User-entered descriptions are never translated or normalized.

## Tag Identity

Transaction tags store stable `tag.id` values, not free-form labels. The catalogue may change `label` per language without breaking the link to the colour and the transaction.

- Default tags carry fixed ids such as `default-comida`, `default-salud`, `default-viaje`, `default-transporte`, `default-ocio`, `default-educacion`. They are translated through the catalogue; their colours persist across language switches.
- Custom user tags keep the label the user typed in the language they typed it. They are not translated.
- `slugifyTagLabel(label)` produces a deterministic `custom-{slug}` id so recreating a deleted tag reattaches the same id.
- `migrateTagReferences(refs, tagsList)` runs once in `App.tsx` when the tag catalogue finishes loading. It resolves ids first, then `DEFAULT_TAGS` labels in both Spanish and English, then creates a `custom-{slug}` orphan id for unknown legacy labels. Renames to an already-used label are blocked by `isDuplicateTagLabel` so two tags never collapse on the next load.
- The tag catalogue is persisted in `MONTHLY SUMMARY!K2` as a JSON array and also mirrored to `SecureStore`. On reload, `readTagsCatalog` fetches the sheet version; the debounce in `useDebouncedSheetWrites` pushes the full local catalogue back to the sheet via `writeTagsCatalog` at 1.5s, so deletions and label updates propagate.
- In `reloadFromGoogle`: sheet tags are merged into the in-memory `tagsList`. The sheet is the source of truth — `mergeTagsFromSheet` starts from sheet tags and only adds local custom tags not yet in the sheet. Default tags are restored from the sheet catalogue if missing locally; custom tags from the sheet that were deleted locally stay deleted.
- Components resolve an id to its label and colour through `findTagById`, `labelForTagId`, and shared maps. The local cache uses `schemaVersion: 3` so legacy caches surface for the in-memory migration on first load.

## Theme and Palette

The theme is split into three contexts to keep rerenders scoped to what actually changed:

- `ThemeModeContext` exposes `{ theme, toggleTheme }`.
- `ColorSchemeContext` exposes `{ colorScheme, setColorScheme }`.
- `PaletteContext` exposes the resolved `Palette`.
- `useTheme()` remains available for callers that genuinely need everything; new code should prefer the split hooks.

The toggle snaps the shell and `HeaderShell` background through two opacity overlays driven by an `Animated.Value` over ~20ms on the JS driver (native driver races ahead of the palette commit and shows both themes at once). The two SVG fades (`HeaderFade`, `HeaderTitleFade`) snap because they accept a string colour. `HeaderActionButton` fires `onPress` on `onPressIn` so the toggle lands while the finger is still down. `getPalette` memoizes the result for each `(theme, scheme)` pair in a small LRU.

## Hot Paths

- `src/utils/transactions.ts`: rolling-period filter, decorated descending sort, and map-based date grouping.
- `src/api/googleWorkspace.ts`: tag readiness inferred from the transaction read, bounded Drive validation, batched reads, row mutations, and tag catalogue read/write to `MONTHLY SUMMARY!K1:K2`.
- `src/data/localCache.ts`: stale-while-revalidate snapshot for transactions, summaries, frequent income, and last sync time. `CACHE_VERSION = 3`.
- `src/components/screens/ExpensesView.tsx`: virtualized `SectionList`; clipping stays disabled because Android previously rendered blank rows after edits.
- `src/components/modals/TransactionModal.tsx`, `DetailModal.tsx`, `SearchModal.tsx`, and `OptionSheet.tsx`: ref-driven open path for immediate presentation.
- `src/components/ui/Select.tsx`: opens an `OptionSheet` (bottom sheet via Modal) instead of an inline dropdown or portal. This avoids Android z-index issues with nested ScrollViews.
- UI files import the direct `MaterialCommunityIcons` entry so Android exports include only that icon font.
- `src/theme/ThemeContext.tsx`: three contexts as described above. Do not re-merge them.
- `App.tsx`: mutation pipeline with `pendingSyncRef.current = true` guards, `rehydratingCache` state for splash visibility during cache restore, `isSheetTrashed` check on cached sessions. Render keeps `mainContent` mounted under the splash overlay plus `postSplashBlack` veil; outer root is `#000000` so the splash→dashboard transition never flashes `themeBg`.
- `assets/`: single `icon-bucks.png` for all icon slots, `splash.mp4` + `splash-icon-bucks.png` poster for the video splash. Deleted: `splash-bucks.png`, `android-icon-*-bucks.png` duplicates, `favicon-bucks.png` duplicate.

## Memoization Contract

Every reusable UI primitive is `React.memo`-wrapped at creation time: all components in `src/components/ui/` and `src/components/layout/`, plus screen-level list rows and headers.

The app shell uses memoized grouped props (`tabPageProps`, `headerProps`) so screen children receive stable references when the relevant inputs do not change. `tabPageProps` is composed from five per-section `useMemo` blocks (dashboard, expenses, summary, settings, loadingBar) and a lightweight outer memo, so each section has 7–20 deps instead of a single list of 50+.

## Deliberate Non-Choices

- No Redux, React Query, SQLite, MMKV, or a custom backend. The local JSON cache plus `SecureStore` cover the persistence the app needs.
- No speculative re-merge of the theme contexts, no global "settings" context that bundles every preference together.
- No aggressive list clipping or native-modal remounting that reintroduces known Android rendering/open latency.
- No demo financial data, even temporarily during startup.

## Verification

```powershell
npm run ci
git diff --check
```

The critical Jest suite (`tests/*.test.{ts,tsx}`, `tests/jest.setup.ts` mocks) covers domain, persistence, sync, and hook behavior. Native UI rendering, gestures, Google Sign-In, and animation timing still require device validation.

Use `npm run android` for a physical ADB-authorized phone. For performance work, capture one focused flow with `gfxinfo`, Perfetto, or Simpleperf; do not treat a broad or unstable emulator run as timing evidence.

