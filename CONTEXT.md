# Bucks Manager Android Context

## Runtime Shape

Bucks Manager is an Expo/React Native client with no custom backend. Google Sign-In supplies an access token; one private Google spreadsheet remains the remote source of truth. A local JSON cache makes startup and finance interactions immediate while Sheets revalidation runs in the background.

`App.tsx` intentionally owns the cross-cutting runtime state: session restore, preferences, cache hydration, Google synchronization, optimistic writes, pager state, and modal refs. Cross-cutting logic has been extracted into dedicated hooks:

- **`useThemeCrossfade`** — manages the theme-toggle animation `Animated.Value` and synchronises with persisted preferences.
- **`useDebouncedSheetWrites`** — debounces UI preferences, deletion history, and tag catalogue writes at 1500ms through `syncQueue`.
- **`usePickerCallbacks`** — consolidates `OptionSheet` openers for language, currency, font, color scheme, and Google account settings.
- **`useTabNavigation`** — owns tab state, `tabRef` mirror, pager `Animated.Value`, layout constants, and `changeTab` animation.
- **`useBootstrap`** — orchestrates `GoogleSignin.configure`, concurrent preference/session/PIN restore, and splash-screen hide.
- **`useHistoryPanel`** — owns history-entries state, loads history from SecureStore on mount, and exposes open/close callbacks.
- **`useTagSyncEffects`** — tag-load and tag-cleanup effects: loads tags, migrates legacy label refs, prunes orphaned tag ids from transactions, and syncs removals to the sheet.
- **`useConfirmCallbacks`** — typed confirm-dialog dispatcher (`delete`, `deleteSelected`, `removeAccount`, `disconnect`) and open/close helpers.
- **`useTransactionActions`** — bridges modal refs into action callbacks: `openAdd`, `openEdit`, `applySearchFilters`, `handleTransactionPress`, `openMoveMenu`, `exitSearch`, `openSearch`.

The three main pages stay mounted inside one animated pager. Primary interaction modals open through refs so opening them does not require a root visibility-state round trip.

Deployment-specific Expo values, including `EAS_PROJECT_ID`, come from `.env` or the build environment.

## Startup and Sync

1. Restore preferences, PIN state, token, and spreadsheet ID concurrently.
2. If a cache exists for that spreadsheet, apply it immediately and release the splash.
3. Refresh the Google token and read transactions/summaries in the background.
4. If the stored spreadsheet is missing or incompatible, scan Drive in batches of five candidates.
5. Create `INCOME AND EXPENSES` only when no compatible named sheet is available.
6. If the stored spreadsheet was trashed in Drive, clear the local cache and start fresh.

`reloadFromGoogle()` shares one in-flight promise. `pendingSyncRef` prevents an ordinary refresh from replacing optimistic state. Mutations update React state and the local cache first, then write to Sheets and force one reconciliation read. Each mutation sets `pendingSyncRef.current = true` before the sync call so the reconciliation does not overwrite the optimistic update.

A module-level `syncQueue` serializes Sheets mutations so a fast edit cannot race the reconcile read of an earlier edit. `syncGoogleInBackground` no longer clears `pendingSyncRef` — each mutation owns its guard.

## Data Contract

- Tabs: `INCOME AND EXPENSES`, `MONTHLY SUMMARY`.
- Transaction columns: date, amount/formula, detail, exact transaction type, creation time, tags.
- Exact types: `INGRESO FRECUENTE`, `INGRESO NO FRECUENTE`, `GASTO FRECUENTE`, `GASTO NO FRECUENTE`.
- Frequent income is created through the transaction form. Legacy monthly summary values remain a read-only fallback when a month has no frequent-income transactions.
- Legacy Spanish headers are still accepted on read: `Fecha`, `Monto`, `Detalle`, `Tipo` / `Tipo de gasto`, `HORA DE CREACION`, `Etiquetas`, `MES`, `NETO SIN ING FRECUENTE`, etc.
- Tag catalogue is persisted in `MONTHLY SUMMARY!K1:K2` (K1 header, K2 full JSON array). Custom tag colours survive app data clear and device changes.
- Cosmetic UI preferences (language, currency symbol, font, accent scheme) are persisted in `MONTHLY SUMMARY!L1:L2` (L1 header `UI PREFERENCES`, L2 JSON). Writes are debounced 1.5s and serialized through the same `syncQueue` as tag and transaction writes. On `reloadFromGoogle` the sheet value wins over the local SecureStore copy; the local copy only leads the UI between launch and the first successful sync. PIN, token, and history are device-local only.
- User-entered descriptions are never translated or normalized.

## Tag Identity

Transaction tags store stable `tag.id` values, not free-form labels. The catalogue may change `label` per language without breaking the link to the colour and the transaction.

- Default tags carry fixed ids such as `default-comida`, `default-salud`, `default-viaje`, `default-transporte`, `default-ocio`, `default-educacion`. They are translated through the catalogue; their colours persist across language switches.
- Custom user tags keep the label the user typed in the language they typed it. They are not translated.
- `slugifyTagLabel(label)` produces a deterministic `custom-{slug}` id so recreating a deleted tag reattaches the same id.
- `migrateTagReferences(refs, tagsList)` runs once in `App.tsx` when the tag catalogue finishes loading. It resolves ids first, then `DEFAULT_TAGS` labels in both Spanish and English, then creates a `custom-{slug}` orphan id for unknown legacy labels.
- The tag catalogue is persisted in `MONTHLY SUMMARY!K2` as a JSON array and also mirrored to `SecureStore`. On reload, `readTagsCatalog` fetches the sheet version; `writeTagsCatalog` pushes local changes back with a 1.5s debounce.
- In `reloadFromGoogle`: sheet tags are merged into the in-memory `tagsList`. Custom tags use the sheet as source of truth (label + colour); default tags keep the language-correct label but adopt the sheet colour. Orphan scan then assigns deterministic palette colours only to truly unknown `custom-*` ids.
- Components resolve an id to its label and colour through `findTagById`, `labelForTagId`, and shared maps. The local cache uses `schemaVersion: 2` so legacy caches surface for the in-memory migration on first load.

## Theme and Palette

The theme is split into three contexts to keep rerenders scoped to what actually changed:

- `ThemeModeContext` exposes `{ theme, toggleTheme }`.
- `ColorSchemeContext` exposes `{ colorScheme, setColorScheme }`.
- `PaletteContext` exposes the resolved `Palette`.
- `useTheme()` remains available for callers that genuinely need everything; new code should prefer the split hooks.

The toggle animates the shell and `HeaderShell` background through an `Animated.Value` interpolated over 180ms. The two SVG fades (`HeaderFade`, `HeaderTitleFade`) snap because they accept a string colour. `HeaderActionButton` fires `onPress` on `onPressIn` so the toggle lands while the finger is still down. `getPalette` memoizes the result for each `(theme, scheme)` pair in a small LRU.

## Hot Paths

- `src/utils/transactions.ts`: rolling-period filter, decorated descending sort, and map-based date grouping.
- `src/api/googleWorkspace.ts`: tag readiness inferred from the transaction read, bounded Drive validation, batched reads, row mutations, and tag catalogue read/write to `MONTHLY SUMMARY!K1:K2`.
- `src/data/localCache.ts`: stale-while-revalidate snapshot for transactions, summaries, frequent income, and last sync time. `CACHE_VERSION = 2`.
- `src/components/screens/ExpensesView.tsx`: virtualized `SectionList`; clipping stays disabled because Android previously rendered blank rows after edits.
- `src/components/modals/TransactionModal.tsx`, `DetailModal.tsx`, `SearchModal.tsx`, and `OptionSheet.tsx`: ref-driven open path for immediate presentation.
- `src/components/ui/Select.tsx`: opens an `OptionSheet` (bottom sheet via Modal) instead of an inline dropdown or portal. This avoids Android z-index issues with nested ScrollViews.
- UI files import the direct `MaterialCommunityIcons` entry so Android exports include only that icon font.
- `src/theme/ThemeContext.tsx`: three contexts as described above. Do not re-merge them.
- `App.tsx`: mutation pipeline with `pendingSyncRef.current = true` guards, `rehydratingCache` state for splash visibility during cache restore, `isSheetTrashed` check on cached sessions.

## Memoization Contract

Every reusable UI primitive is `React.memo`-wrapped: `StatCard`, `Kpi`, `ModalHeader`, `ActionRow`, `Field`, `HighlightedText`, `BarChart`, `Select`, `CalendarPicker`, `Text`, `TextInput`, plus the layout primitives `BottomNav`, `BottomNavItem`, `PeriodControls`, `HeaderActionButton`, `HeaderFade`, `HeaderTitleFade`, `BottomFade`, `TabPage`, `HeaderShell`. New primitives must be memoized at creation time.

The app shell uses memoized grouped props (`tabPageProps`, `headerProps`) so screen children receive stable references when the relevant inputs do not change. The memo lists should grow with the inputs the screen actually consumes.

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

The critical non-UI test suite uses Node's built-in runner and coverage. Native UI rendering, gestures, Google Sign-In, and animation timing still require device validation.

Use `npm run android` for a physical ADB-authorized phone. For performance work, capture one focused flow with `gfxinfo`, Perfetto, or Simpleperf; do not treat a broad or unstable emulator run as timing evidence.

