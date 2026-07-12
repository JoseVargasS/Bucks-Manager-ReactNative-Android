import { SHEET_NAMES } from "@/domain/bucksLogic";
import { googleFetch, readValuesUrl, SHEETS } from "./googleFetch";
import { type ColorSchemePreference, accents } from "@/theme/accents";
import { type FontPreference, type LanguageMode, type ThemeMode } from "@/types";

export const UI_PREFERENCES_HEADER = "UI PREFERENCES";
const UI_PREFERENCES_RANGE = `${SHEET_NAMES.summary}!L1:L2`;
const VALID_COLOR_SCHEMES = Object.keys(accents) as ColorSchemePreference[];
const VALID_LANGUAGES: LanguageMode[] = ["es", "en"];
const VALID_FONT_PREFERENCES: FontPreference[] = [
  "dmsans", "serif", "mono", "condensed", "light", "casual",
  "cursive", "smallcaps", "inter", "intervariable", "jetbrainsmono",
  "spacemono", "orbitron", "playfair", "bebasneue", "fredoka",
  "comicneue", "sora", "patrickhand", "plusjakartasans", "comicsansms",
  "proggysquare", "redstarbold", "sansi", "sfscribbledsans",
];

// Shape persisted to the sheet. v2 = v1 + theme (dark/light).
// Bump the version key in code and the on-sheet value when adding fields
// the on-disk shape changes; old data is read best-effort with fallbacks.
export type UiPreferences = {
  v: 2;
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  colorScheme: ColorSchemePreference;
  theme: ThemeMode;
};

export function buildUiPreferences(params: {
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  colorScheme: ColorSchemePreference;
  theme: ThemeMode;
}): UiPreferences {
  return { v: 2, ...params };
}

// Read L2 of MONTHLY SUMMARY. Returns null when the cell is empty, the
// header is missing, or the JSON is malformed. Callers fall back to local
// SecureStore values.
export async function readUiPreferences(
  token: string,
  spreadsheetId: string,
): Promise<UiPreferences | null> {
  try {
    const range = `${SHEET_NAMES.summary}!L1:L2`;
    const data = await googleFetch<{ values?: string[][] }>(
      token,
      readValuesUrl(spreadsheetId, range),
    );
    const header = String(data.values?.[0]?.[0] || "").trim();
    if (header !== UI_PREFERENCES_HEADER) return null;
    const raw = String(data.values?.[1]?.[0] || "").trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return sanitizeUiPreferences(parsed);
  } catch {
    return null;
  }
}

// Write L1:L2 of MONTHLY SUMMARY. L1 keeps the human-readable header so
// the block stays self-describing in the spreadsheet UI; L2 holds the
// compact JSON.
export async function writeUiPreferences(
  token: string,
  spreadsheetId: string,
  prefs: UiPreferences,
): Promise<void> {
  const url = `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(UI_PREFERENCES_RANGE)}?valueInputOption=USER_ENTERED`;
  await googleFetch(token, url, {
    method: "PUT",
    body: JSON.stringify({
      values: [[UI_PREFERENCES_HEADER], [JSON.stringify(prefs)]],
    }),
  });
}

// Drop unknown / out-of-vocabulary fields. This is the single point of
// truth for "is this preference valid?".
export function sanitizeUiPreferences(value: unknown): UiPreferences | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  const language = v.language;
  const fontPreference = v.fontPreference;
  const colorScheme = v.colorScheme;
  const currencySymbol = v.currencySymbol;
  const theme = v.theme;
  if (!VALID_LANGUAGES.includes(language as LanguageMode)) return null;
  if (!VALID_FONT_PREFERENCES.includes(fontPreference as FontPreference)) return null;
  if (!VALID_COLOR_SCHEMES.includes(colorScheme as ColorSchemePreference)) return null;
  if (typeof currencySymbol !== "string" || !currencySymbol) return null;
  const validThemes: ThemeMode[] = ["dark", "light"];
  const resolvedTheme: ThemeMode = validThemes.includes(theme as ThemeMode)
    ? (theme as ThemeMode)
    : "dark";
  return {
    v: 2,
    language: language as LanguageMode,
    fontPreference: fontPreference as FontPreference,
    colorScheme: colorScheme as ColorSchemePreference,
    currencySymbol,
    theme: resolvedTheme,
  };
}

export const UI_PREFERENCES_INIT_JSON = JSON.stringify(
  buildUiPreferences({
    language: "es",
    currencySymbol: "S/",
    fontPreference: "dmsans",
    colorScheme: "sky",
    theme: "dark",
  }),
);
