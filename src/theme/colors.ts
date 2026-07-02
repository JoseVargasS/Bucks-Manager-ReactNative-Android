import { type ColorSchemePreference, accents } from "./accents";
export type { ColorSchemePreference };

const SHARED_TAG_COLORS = [
  "#FF6B6B",
  "#FF8E53",
  "#FFD93D",
  "#6BCB77",
  "#4D96FF",
  "#9B59B6",
  "#3498DB",
  "#1ABC9C",
  "#F39C12",
  "#E74C3C",
  "#2ECC71",
  "#E91E63",
];

export const dark = {
  bg: "#0f1117",
  card: "#171b25",
  input: "#1e2333",
  border: "#2a2f40",
  borderStrong: "#3d4560",
  text: "#eceef4",
  textSub: "#7c84a0",
  muted: "#7c84a0",
  primary: "#c8ff00",
  primarySoft: "rgba(200,255,0,0.16)",
  onPrimary: "#061008",
  green: "#56c98a",
  incomeSoft: "rgba(86,201,138,0.12)",
  red: "#e06b6b",
  expenseSoft: "rgba(224,107,107,0.12)",
  yellow: "#e0a84b",
  warnSoft: "rgba(224,168,75,0.12)",
  blue: "#75d7ff",
  infoSoft: "rgba(117,215,255,0.13)",
  periodBg: "rgba(117,215,255,0.50)",
  disabled: "#2a2f40",
  switchTrack: "#1e2333",
  editBg: "#17280f",
  editBorder: "#7aa600",
  freqExpenseRow: "rgba(224,107,107,0.10)",
  overlay: "rgba(0,0,0,0.72)",
  shadow: "#000000",
  tagColors: SHARED_TAG_COLORS,
  tagTextLight: "#ffffff",
  tagTextDark: "#18202d",
};

const light = {
  bg: "#f4efe7",
  card: "#fffaf1",
  input: "#f1eadf",
  border: "#e1d7c8",
  borderStrong: "#c7b8a5",
  text: "#201b16",
  textSub: "#75695d",
  muted: "#75695d",
  primary: "#8ab800",
  primarySoft: "rgba(138,184,0,0.22)",
  onPrimary: "#1a3300",
  green: "#1f7a4a",
  incomeSoft: "rgba(31,122,74,0.15)",
  red: "#be4b4b",
  expenseSoft: "rgba(190,75,75,0.10)",
  yellow: "#9b6c22",
  warnSoft: "rgba(155,108,34,0.12)",
  blue: "#77910f",
  infoSoft: "rgba(138,184,0,0.18)",
  periodBg: "rgba(119,145,15,0.45)",
  disabled: "#d9cebf",
  switchTrack: "#e3d8ca",
  editBg: "#e8f5b8",
  editBorder: "#8ab800",
  freqExpenseRow: "rgba(190,75,75,0.09)",
  overlay: "rgba(42,31,20,0.36)",
  shadow: "#3a3028",
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
