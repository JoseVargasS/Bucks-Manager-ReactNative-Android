# Testing

## Test stack

Jest 30 + ts-jest on Node.js 24 (`jest.config.mjs`, `testEnvironment: "node"`).
React Native UI is tested with `@testing-library/react-native` (`renderHook`,
`waitFor`); hook tests mock native modules, never the function under test.

`tests/jest.setup.ts` runs before every suite and mocks `expo-secure-store`,
`expo-file-system/legacy`, `@react-native-google-signin/google-signin`,
`react-native` (per-file as needed), and friends via `__bucks*Mock` globals.
Google integrations are tested through deterministic `fetch` responses; tests
never access a real account, Drive, or spreadsheet. There is no coverage gate:
`test:coverage` is an informational report (`--coverage`), not a CI check.

## Commands

```powershell
npm test                 # Full suite once (jest, no cache)
npm run test:watch       # Re-run tests when files change
npm run test:coverage    # Full suite with coverage report (no thresholds)
npm run ci               # Format check, tsc, eslint, full jest suite
```

## Test types and locations

- Unit tests cover finance calculations, formatters, date parsing, filtering,
  sorting, grouping, search, and validation.
- Integration tests cover Google response parsing, exact spreadsheet creation
  contracts, chronological writes, formula refreshes, SecureStore flows, and
  FileSystem cache round trips.
- Hook tests (`renderHook`) cover tag sync effects, Google sync API
  (reload/merge, debounced and immediate writes), transaction mutations, and
  account switching (silent entry, fast-path restore, picker cancel).
- Regression tests cover bounded Drive scans, tag-migration request counts,
  stable transaction ordering, period-range reuse, tag tombstones, and
  rename-duplicate guards.
- Native UI rendering, gestures, navigation animation, and device-only Google
  Sign-In are outside Jest coverage. Validate those flows with
  `npm run android` on an ADB-authorized phone.

Tests live in `tests/*.test.{ts,tsx}`. Shared runtime mocks belong in
`tests/jest.setup.ts`; scenario-specific Google responses stay inside the
test that uses them. `renderHook` in this setup is async: always
`await renderHook(...)` and drive state changes with `await act(async ...)`.

## Conventions

- Name tests as behavior: condition plus expected result.
- Assert public output, persisted state, or external requests; avoid private
  implementation details.
- Every fixed bug gets a regression test that fails before the fix.
- Use real domain functions and small boundary fakes. Do not mock the
  function under test.
- Reset shared mocks (`secureStore.reset()`, mock reassignment) in
  `beforeEach`; restore `globalThis.fetch` after stubbing it.
- Do not commit skipped, pending, commented-out, or unconditional-pass tests.
- Use unique spreadsheet IDs in tests because tag readiness is cached per
  spreadsheet.

## Adding a test

1. Put a focused case beside the closest existing suite.
2. Mirror the mock setup of a neighboring test file (`jest.setup.ts`
   globals + per-file `jest.mock` as needed).
3. Reproduce the current failure first for a bug fix.
4. Run the focused file, then the full `npm test`.
5. Finish with `npm run ci`.

## Critical zones

Highest protection is expected for:

- `src/domain/bucksLogic.ts`: money, dates, search, row order, and summaries.
- `src/utils/transactions.ts`: rolling periods, stable sort, and grouping.
- `src/data/localCache.ts`: cache ownership and corrupted-data rejection;
  `CACHE_VERSION` migration (currently 3).
- `src/api/googleWorkspace.ts`: legacy headers, locale values/formulas, exact
  tab names, bounded Drive scans, and row mutations.
- `src/utils/tags.ts`: stable id generation, legacy label migration, orphan
  id resolution across both Spanish and English defaults, tombstone
  filtering, and rename-duplicate guards.
- `src/theme/ThemeContext.tsx`: split-context wiring, palette LRU, and
  provider nesting.
- `src/hooks/useSession.ts`: silent-first account switching with no day
  limit, per-account token persistence, and session snapshot/restore.
- `App.tsx`: optimistic state, `pendingSyncRef`, deduplicated reloads,
  modal/navigation ownership, and the in-memory `migrateTransactionTags`
  pass. This orchestration remains primarily device-tested because it
  directly owns native modules and mounted UI.
