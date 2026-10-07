# Quipu Android — Design System

## Typography

- **Default font**: Inter. Additional font options configurable in Settings (14 families).
- **Font weights**: 700 for titles/primary amounts, 600 for list labels, 500 for table headers, 400 for body text.
- Avoid `fontWeight: "900"` as default.

## Color

- **Default scheme (sky)**: dark `#060a16` night-sky shell with `#58b8ff` blue primary. Light `#eef4fc` mist bg with `#1868b8` blue primary. Neutral and universal; new installs and new sheets start here.
- **9 accent schemes** (kept maximally distinct so switching themes shows a real difference): cyprus, vulcanico, charcoalline, truepink, silver, sky, bridal, obsidian, arcilla. Each has dark/light variants and redeclares every scheme token so scheme switches never leak the base value.
- **arcilla (Andean earth)**: dark `#241109` roasted-earth shell with `#E8B83A` maiz-gold primary. Light `#F3EAD9` raw-cream bg with `#7A4E0C` bronze primary. Grounded in the app icon quadrants (earth brown + gold chakana motif).
- **Andean affinity pass**: sky primary is lapis `#4A90D9`/`#1E5FA8`, charcoalline shell is dusk maroon-violet with copper `#D98A4E`/`#8A4F1E` primary, silver primary is leaf green `#3ED598`/`#1E7A34`, arcilla expense is cochineal `#ff6f61` so the red reads on brown. Income/expense hues of the other schemes are untouched.
- **Semantic colors**: Green for income, red for expense. Hue is tuned per scheme so the financial signal stays recognisable while harmonising with the accent.
- **Palette resolution**: `getPalette` memoized per `(theme, scheme)` pair in a small LRU.
- **WCAG AA**: every scheme's text-vs-bg and primary-vs-bg contrast is verified ≥ 4.5:1; semantic colors vs their card surface ≥ 4.5:1 (or ≥ 4.8:1 for non-text affordances on the warmer schemes).

## Component Tokens

- **Radii** (`src/theme/radii.ts`): sm 8 (chips/small buttons), md 10 (inputs/selects), lg 12 (cards/rows), xl 14 (stat cards/modals/settings groups), 2xl 20 (main transaction modal), pill 999 (circular).
- **Card surfaces**: Soft, minimal outer borders.
- **Borders**: Only on inputs, selects, destructive/secondary buttons, and internal row separators. Avoid border-heavy cards.
- **Tabular numbers**: For finance values where React Native supports `fontVariant: ["tabular-nums"]`.
- **OptionSheet (bottom sheet)**: 20px top radius (`RADIUS["2xl"]`), header with title and minimal close X (no background), rows without hairline dividers. Selected row uses a shaded background (softBg → tone+20alpha → primarySoft) instead of a checkmark. Options with an explicit `tone` (transaction types, color schemes) show coloured text for all items; unselected items with no tone use neutral `colors.text`.

## Layout

- **Mobile-first**: Two-column KPI/stat card layout.
- **Bottom nav**: Compact, translucent/floating. Squircle add button protruding slightly above the container without making the bar taller or clipping the button. Subtle active indicator.
- **Pager**: Three main pages mounted inside one `Animated.View`. Translates on native driver (`useNativeDriver: true`).

## Theme Architecture

Three split contexts to scope rerenders:

- `ThemeModeContext` — dark/light preference
- `ColorSchemeContext` — accent/scheme selection
- `PaletteContext` — resolved palette object

Do not merge or bundle these contexts.

## Theme Crossfade

- Shell background snaps over ~20ms via two opacity overlays (dark/light) over a solid base, `useNativeDriver: false` on purpose — native driver races ahead of the palette commit (full app re-render) and shows old-theme content over the new background.
- `HeaderActionButton` fires on `onPressIn` (not release) so the toggle lands while the finger is still down.
- Feedback animation: 60ms in, 60ms out.

## Modals

- Rounded panels, dark/light variants, clear labels, bordered inputs, large action buttons.
- Theme overlay tokens for modal backgrounds.
- Primary interaction modals open through refs to avoid root visibility-state round trip.

## Tabs

- Bottom tab focus updates on press without waiting for pager animation.
- Modal open/close interactions feel nearly instant.

## Money Display

- Currency symbol from Settings, defaulting from device locale.
- `formatMoney` with explicit plus/minus signs for income/expense.

## Languages

- UI chrome: Spanish and English, toggleable from Settings.
- Transaction descriptions: stored exactly as typed, never translated.
