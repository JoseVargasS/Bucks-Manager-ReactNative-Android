import { type ColorSchemePreference, accents } from "./accents";
export type { ColorSchemePreference };

const SHARED_TAG_COLORS = [
  "#f43f5e",
  "#f59e0b",
  "#10b981",
  "#0ea5e9",
  "#8b5cf6",
  "#84cc16",
  "#d946ef",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#ec4899",
  "#06b6d4",
];

// Base palette when no scheme override is applied. Mirrors the `cyprus`
// scheme (the new default). cyprus.dark / cyprus.light redeclare every
// token, so getPalette(theme, "cyprus") produces the same effective
// palette as falling through to these bases.

export const dark = {
  bg: "#003530",
  card: "#0c625c",
  input: "#126e68",
  border: "#1c867e",
  borderStrong: "#28a098",
  text: "#fafcf8",
  textSubtle: "#a8d4cc",
  muted: "#82b8b0",
  primary: "#a8dcc8",
  primarySoft: "rgba(168,220,200,0.18)",
  onPrimary: "#001a16",
  income: "#7ce8ac",
  incomeSoft: "rgba(124,232,172,0.13)",
  expense: "#ff9c80",
  expenseSoft: "rgba(255,156,128,0.14)",
  warn: "#f0c878",
  warnSoft: "rgba(240,200,120,0.13)",
  info: "#6cd6dc",
  infoSoft: "rgba(108,214,220,0.14)",
  periodBg: "rgba(168,220,200,0.42)",
  disabled: "#0c625c",
  switchTrack: "#126e68",
  editBg: "#002824",
  editBorder: "#a8dcc8",
  freqExpenseRow: "rgba(255,156,128,0.13)",
  overlay: "rgba(0,12,10,0.76)",
  shadow: "#000000",
  tagColors: SHARED_TAG_COLORS,
  tagTextLight: "#ffffff",
  tagTextDark: "#18202d",
};

const light = {
  bg: "#F0EDE4",
  card: "#fdfaf3",
  input: "#e6dfd2",
  border: "#cfc4b0",
  borderStrong: "#a89878",
  text: "#1a2622",
  textSubtle: "#5a6660",
  muted: "#6a7670",
  primary: "#003c37",
  primarySoft: "rgba(0,60,55,0.14)",
  onPrimary: "#ffffff",
  income: "#0e6e4a",
  incomeSoft: "rgba(14,110,74,0.12)",
  expense: "#b83020",
  expenseSoft: "rgba(184,48,32,0.10)",
  warn: "#8a5818",
  warnSoft: "rgba(138,88,24,0.10)",
  info: "#1a6878",
  infoSoft: "rgba(26,104,120,0.12)",
  periodBg: "rgba(0,60,55,0.30)",
  disabled: "#cfc4b0",
  switchTrack: "#dad2c0",
  editBg: "#d6ebe2",
  editBorder: "#003c37",
  freqExpenseRow: "rgba(184,48,32,0.07)",
  overlay: "rgba(8,14,12,0.34)",
  shadow: "#a89878",
  tagColors: SHARED_TAG_COLORS,
  tagTextLight: "#ffffff",
  tagTextDark: "#18202d",
};

type PaletteBase = typeof dark;
export interface Palette extends Omit<PaletteBase, "tagColors"> {
  tagColors: string[];
}

const paletteCache = new Map<string, Palette>();
const PALETTE_CACHE_LIMIT = 24;

function cacheGet(key: string): Palette | undefined {
  const value = paletteCache.get(key);
  if (value !== undefined) {
    paletteCache.delete(key);
    paletteCache.set(key, value);
  }
  return value;
}

function cacheSet(key: string, value: Palette): void {
  if (paletteCache.has(key)) paletteCache.delete(key);
  if (paletteCache.size >= PALETTE_CACHE_LIMIT) {
    const oldest = paletteCache.keys().next().value;
    if (oldest !== undefined) paletteCache.delete(oldest);
  }
  paletteCache.set(key, value);
}

export function getPalette(
  theme: "dark" | "light",
  scheme: ColorSchemePreference,
): Palette {
  const cacheKey = `${theme}|${scheme}`;
  const cached = cacheGet(cacheKey);
  if (cached) return cached;
  const base = theme === "dark" ? dark : light;
  const palette = { ...base, ...accents[scheme][theme] } as Palette;
  cacheSet(cacheKey, palette);
  return palette;
}
