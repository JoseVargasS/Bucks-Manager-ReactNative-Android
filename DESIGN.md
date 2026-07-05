# Bucks Manager Android — Design System

## Typography

- **Default font**: DM Sans. Additional font options (Inter, Roboto, JetBrains Mono) configurable in Settings.
- **Font weights**: 700 for titles/primary amounts, 600 for list labels, 500 for table headers, 400 for body text.
- Avoid `fontWeight: "900"` as default.

## Color

- **Default scheme (cyprus)**: dark `#004741` Cyprus green shell with `#9ed9c8` sand-mint primary. Light `#F0EDE4` Sand bg with Cyprus as primary. Botanical-museum, the calmest and most universal green in the catalogue.
- **11 accent schemes**: cyprus, ocean, vulcanico, tiffany, charcoalline, truepink, silver, milky, sky, turmeric, bridal. Each has dark/light variants and redeclares every palette token (including `periodBg` and `text`) so scheme switches never leak the base value.
- **Semantic colors**: Green for income, red for expense. Hue is tuned per scheme so the financial signal stays recognisable while harmonising with the accent.
- **Palette resolution**: `getPalette` memoized per `(theme, scheme)` pair in a small LRU.
- **WCAG AA**: every scheme's text-vs-bg and primary-vs-bg contrast is verified ≥ 4.5:1; semantic colors vs their card surface ≥ 4.5:1 (or ≥ 4.8:1 for non-text affordances on the warmer schemes).

## Component Tokens

- **Card radius**: 14px (`borderRadius: 14`).
- **Card surfaces**: Soft, minimal outer borders.
- **Borders**: Only on inputs, selects, destructive/secondary buttons, and internal row separators. Avoid border-heavy cards.
- **Tabular numbers**: For finance values where React Native supports `fontVariant: ["tabular-nums"]`.

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

- Shell background and `HeaderShell` animate `backgroundColor` over 180ms via `Animated.Value`.
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
