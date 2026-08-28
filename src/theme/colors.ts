import { type ColorSchemePreference, accents } from "./accents";
export type { ColorSchemePreference };

export const SHARED_TAG_COLORS_DARK = [
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

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function rgbToHsl(
  r: number,
  g: number,
  b: number,
): { h: number; s: number; l: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const l = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) return { h: 0, s: 0, l };

  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === rn) h = ((gn - bn) / delta) % 6;
  else if (max === gn) h = (bn - rn) / delta + 2;
  else h = (rn - gn) / delta + 4;
  h *= 60;
  if (h < 0) h += 360;

  return { h, s, l };
}

function hslToRgb(
  h: number,
  s: number,
  l: number,
): { r: number; g: number; b: number } {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  let r: number;
  let g: number;
  let b: number;

  if (h < 60) {
    r = c;
    g = x;
    b = 0;
  } else if (h < 120) {
    r = x;
    g = c;
    b = 0;
  } else if (h < 180) {
    r = 0;
    g = c;
    b = x;
  } else if (h < 240) {
    r = 0;
    g = x;
    b = c;
  } else if (h < 300) {
    r = x;
    g = 0;
    b = c;
  } else {
    r = c;
    g = 0;
    b = x;
  }

  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

export function adjustTagColorForLight(hex: string): string {
  const { r, g, b } = hexToRgb(hex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const nextL = Math.max(10, l * 100 - 18) / 100;
  const rgb = hslToRgb(h, s, nextL);
  return rgbToHex(rgb.r, rgb.g, rgb.b);
}

export const SHARED_TAG_COLORS_LIGHT = SHARED_TAG_COLORS_DARK.map(
  adjustTagColorForLight,
);

// Base palette when no scheme override is applied. Mirrors the `cyprus`
// scheme (the new default). cyprus.dark / cyprus.light redeclare every
// token, so getPalette(theme, "cyprus") produces the same effective
// palette as falling through to these bases.

// WCAG contrast helpers
function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const toLinear = (v: number) => {
    const s = v / 255;
    return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}
export function getContrastRatio(fg: string, bg: string): number {
  const l1 = getLuminance(fg);
  const l2 = getLuminance(bg);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}
export function meetsWCAG_AA(fg: string, bg: string): boolean {
  return getContrastRatio(fg, bg) >= 4.5;
}
export function meetsWCAG_AA_Large(fg: string, bg: string): boolean {
  return getContrastRatio(fg, bg) >= 3;
}

export const dark = {
  bg: "#003530",
  card: "#0c625c",
  input: "#126e68",
  border: "#1c867e",
  borderStrong: "#28a098",
  text: "#fafcf8",
  textSubtle: "#a8d4cc",
  muted: "#82b8b0",
  // semantic: primary = lime #C8FF00
  primary: "#C8FF00",
  primaryHover: "#D4FF33",
  primaryPressed: "#B8E600",
  primarySoft: "rgba(200,255,0,0.16)",
  onPrimary: "#0D0F12",
  secondary: "#A8C050",
  secondarySoft: "rgba(168,192,80,0.14)",
  onSecondary: "#0D0F12",
  // aliases: income/success, expense/error, warn/warning
  success: "#7ce8ac",
  successSoft: "rgba(124,232,172,0.13)",
  onSuccess: "#001a16",
  income: "#7ce8ac",
  incomeSoft: "rgba(124,232,172,0.13)",
  error: "#ffbeaa",
  errorSoft: "rgba(255,190,170,0.14)",
  onError: "#2a0c08",
  expense: "#ffbeaa",
  expenseSoft: "rgba(255,190,170,0.14)",
  warning: "#f0c878",
  warningSoft: "rgba(240,200,120,0.13)",
  onWarning: "#1a1400",
  warn: "#f0c878",
  warnSoft: "rgba(240,200,120,0.13)",
  info: "#6ce0e6",
  infoSoft: "rgba(108,224,230,0.14)",
  onInfo: "#001a16",
  // highlight / interactive states
  highlight: "#C8FF00",
  highlightSoft: "rgba(200,255,0,0.14)",
  hover: "rgba(200,255,0,0.08)",
  pressed: "rgba(200,255,0,0.16)",
  focusRing: "#C8FF00",
  surfaceHover: "#134a44",
  surfacePressed: "#0e3d38",
  periodBg: "rgba(200,255,0,0.22)",
  disabled: "#0c625c",
  disabledText: "#5a8a84",
  onDisabled: "#82b8b0",
  switchTrack: "#126e68",
  editBg: "#002824",
  editBorder: "#C8FF00",
  freqExpenseRow: "rgba(255,190,170,0.12)",
  overlay: "rgba(0,12,10,0.76)",
  shadow: "#000000",
  tagColors: SHARED_TAG_COLORS_DARK,
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
  // semantic: pastel base with olive/lime accent — WCAG AA on #F0EDE4 requires olive #4A6500 (5.69:1)
  primary: "#4A6500",
  primaryHover: "#5A7A00",
  primaryPressed: "#3d4d00",
  primarySoft: "rgba(74,101,0,0.14)",
  onPrimary: "#ffffff",
  secondary: "#7a8a3a",
  secondarySoft: "rgba(122,138,58,0.12)",
  onSecondary: "#ffffff",
  success: "#0e6e4a",
  successSoft: "rgba(14,110,74,0.12)",
  onSuccess: "#ffffff",
  income: "#0e6e4a",
  incomeSoft: "rgba(14,110,74,0.12)",
  error: "#b83020",
  errorSoft: "rgba(184,48,32,0.10)",
  onError: "#ffffff",
  expense: "#b83020",
  expenseSoft: "rgba(184,48,32,0.10)",
  warning: "#8a5818",
  warningSoft: "rgba(138,88,24,0.10)",
  onWarning: "#ffffff",
  warn: "#8a5818",
  warnSoft: "rgba(138,88,24,0.10)",
  info: "#1a6878",
  infoSoft: "rgba(26,104,120,0.12)",
  onInfo: "#ffffff",
  highlight: "#4A6500",
  highlightSoft: "rgba(74,101,0,0.12)",
  hover: "rgba(74,101,0,0.06)",
  pressed: "rgba(74,101,0,0.12)",
  focusRing: "#4A6500",
  surfaceHover: "#ece8dc",
  surfacePressed: "#e2ddd0",
  periodBg: "rgba(74,101,0,0.16)",
  disabled: "#cfc4b0",
  disabledText: "#8a7f6a",
  onDisabled: "#5a6660",
  switchTrack: "#dad2c0",
  editBg: "#eef6d8",
  editBorder: "#4A6500",
  freqExpenseRow: "rgba(184,48,32,0.07)",
  overlay: "rgba(8,14,12,0.34)",
  shadow: "#a89878",
  tagColors: SHARED_TAG_COLORS_LIGHT,
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
  paletteCache.delete(key);
  if (paletteCache.size >= PALETTE_CACHE_LIMIT) {
    const oldest = paletteCache.keys().next().value;
    paletteCache.delete(oldest as string);
  }
  paletteCache.set(key, value);
}

export function getPaletteCacheStats(): { size: number; limit: number } {
  return { size: paletteCache.size, limit: PALETTE_CACHE_LIMIT };
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
