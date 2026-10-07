import { useCallback, useState } from "react";
import {
  getItemAsync,
  setItemAsync,
} from "expo-secure-store";
import { type ColorSchemePreference } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeContext";
import { type LanguageMode, type FontPreference, type MaterialIconName, type ThemeMode } from "@/types";
import {
  detectDeviceLanguage,
} from "@/utils/helpers";
import { setAppFontPreference, setAppFontSizeScale } from "@/components/ui/AppText";
import { FONT_FAMILIES, FONT_ICONS, FONT_SIZE_SCALE_LEVELS, DEFAULT_FONT_SIZE_SCALE } from "@/components/ui/fontConstants";
import { type UiCopy, UI_COPY } from "@/i18n";

const LANGUAGE_KEY = "bucks_language";
const CURRENCY_SYMBOL_KEY = "bucks_currency_symbol";
const FONT_KEY = "bucks_font";
const FONT_SIZE_SCALE_KEY = "bucks_font_size_scale";
const COLOR_SCHEME_KEY = "bucks_color_scheme";
const THEME_KEY = "bucks_theme";
const FONT_PREFERENCES = Object.keys(FONT_FAMILIES) as FontPreference[];
const COLOR_SCHEME_PREFERENCES: ColorSchemePreference[] = [
  "cyprus", "vulcanico", "charcoalline",
  "truepink", "silver", "sky", "bridal", "obsidian",
];
const DEFAULT_COLOR_SCHEME: ColorSchemePreference = "sky";
const CURRENCY_OPTIONS_SET = new Set([
  "$", "S/", "MX$", "CLP$", "COP$", "Bs", "R$", "€", "£", "¥",
]);

function sanitizeColorScheme(next: string): ColorSchemePreference {
  return COLOR_SCHEME_PREFERENCES.includes(next as ColorSchemePreference)
    ? (next as ColorSchemePreference)
    : DEFAULT_COLOR_SCHEME;
}
function sanitizeFont(next: string): FontPreference {
  return FONT_PREFERENCES.includes(next as FontPreference)
    ? (next as FontPreference)
    : "inter";
}
function sanitizeFontSizeScale(next: unknown): number {
  const n = typeof next === "string" ? parseFloat(next) : (next as number);
  if (FONT_SIZE_SCALE_LEVELS && Object.values(FONT_SIZE_SCALE_LEVELS).includes(n as never)) return n;
  const rounded = Math.round((n as number) * 100) / 100;
  if (Object.values(FONT_SIZE_SCALE_LEVELS).includes(rounded as never)) return rounded;
  return DEFAULT_FONT_SIZE_SCALE;
}
function sanitizeCurrency(next: string): string {
  return CURRENCY_OPTIONS_SET.has(next) ? next : "$";
}
function sanitizeLanguage(next: string): LanguageMode {
  return next === "en" ? "en" : "es";
}

const FONT_COPY_KEYS: Record<FontPreference, keyof UiCopy> = {
  dmsans: "system",
  serif: "serif",
  condensed: "condensed",
  light: "lightFont",
  casual: "casual",
  smallcaps: "smallCaps",
  inter: "inter",
  intervariable: "interVariable",
  fredoka: "fredoka",
  comicneue: "comicNeue",
  sora: "sora",
  patrickhand: "patrickHand",
  plusjakartasans: "plusJakartaSans",
  comicsansms: "comicSansMS",
};

export function getFontPickerOptions(copy: UiCopy) {
  return FONT_PREFERENCES.map((pref) => ({
    label: copy[FONT_COPY_KEYS[pref]],
    value: pref,
    icon: FONT_ICONS[pref],
    fontFamily: FONT_FAMILIES[pref],
  }));
}

export const CURRENCY_OPTIONS: Array<{
  value: string;
  labelEs: string;
  labelEn: string;
  icon: MaterialIconName;
}> = [
  { labelEs: "Dólares ($)", labelEn: "US dollars ($)", value: "$", icon: "currency-usd" },
  { labelEs: "Soles peruanos (S/)", labelEn: "Peruvian soles (S/)", value: "S/", icon: "cash" },
  { labelEs: "Pesos mexicanos (MX$)", labelEn: "Mexican pesos (MX$)", value: "MX$", icon: "cash" },
  { labelEs: "Pesos chilenos (CLP$)", labelEn: "Chilean pesos (CLP$)", value: "CLP$", icon: "cash" },
  { labelEs: "Pesos colombianos (COP$)", labelEn: "Colombian pesos (COP$)", value: "COP$", icon: "cash" },
  { labelEs: "Bolivianos (Bs)", labelEn: "Bolivianos (Bs)", value: "Bs", icon: "cash" },
  { labelEs: "Reales (R$)", labelEn: "Brazilian reais (R$)", value: "R$", icon: "currency-brl" },
  { labelEs: "Euros (€)", labelEn: "Euros (€)", value: "€", icon: "currency-eur" },
  { labelEs: "Libras (£)", labelEn: "Pounds (£)", value: "£", icon: "currency-gbp" },
  { labelEs: "Yenes (¥)", labelEn: "Yen (¥)", value: "¥", icon: "currency-jpy" },
];

// Snapshot of all cloud-synced cosmetic preferences. Mirrors the shape
// persisted in MONTHLY SUMMARY!L1:L2. App.tsx is responsible for the
// actual sheet write — usePreferences just owns the SecureStore + state.
export type UiPreferencesSnapshot = {
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  colorScheme: ColorSchemePreference;
  theme: ThemeMode;
  fontSizeScale: number;
};

type PreferencesState = {
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  fontSizeScale: number;
  colorScheme: ColorSchemePreference;
  theme: ThemeMode;
  copy: UiCopy;
  needsCurrencyPick: boolean;
  dismissCurrencyPick: () => void;
  saveLanguage: (next: string) => void;
  saveCurrencySymbol: (next: string) => void;
  saveFontPreference: (next: string) => void;
  saveFontSizeScale: (next: number) => void;
  saveColorScheme: (next: string) => void;
  saveTheme: (next: ThemeMode) => void;
  restorePreferences: () => Promise<void>;
  applyRemotePreferences: (prefs: UiPreferencesSnapshot) => void;
  resetToDefaults: () => void;
};

function persistPreference(key: string, value: string) {
  setItemAsync(key, value).catch(() => undefined);
}

export function usePreferences(): PreferencesState {
  const { setColorScheme, setTheme: setThemeMode } = useTheme();
  const [language, setLanguage] = useState<LanguageMode>(detectDeviceLanguage);
  const [currencySymbol, setCurrencySymbol] = useState("$");
  const [fontPreference, setFontPreference] = useState<FontPreference>("inter");
  const [fontSizeScale, setFontSizeScaleState] = useState<number>(DEFAULT_FONT_SIZE_SCALE);
  const [colorScheme, setColorSchemeState] = useState<ColorSchemePreference>(DEFAULT_COLOR_SCHEME);
  const [theme, setThemeState] = useState<ThemeMode>("light");
  const [needsCurrencyPick, setNeedsCurrencyPick] = useState(false);

  const copy: UiCopy = UI_COPY[language];

  const restorePreferences = useCallback(async () => {
    const [storedLanguage, storedCurrency, storedFont, storedFontScale, storedColorScheme, storedTheme] =
      await Promise.all([
        getItemAsync(LANGUAGE_KEY),
        getItemAsync(CURRENCY_SYMBOL_KEY),
        getItemAsync(FONT_KEY),
        getItemAsync(FONT_SIZE_SCALE_KEY),
        getItemAsync(COLOR_SCHEME_KEY),
        getItemAsync(THEME_KEY),
      ]);
    const nextLanguage = sanitizeLanguage(storedLanguage || detectDeviceLanguage());
    if (storedLanguage !== nextLanguage) {
      setLanguage(nextLanguage);
      await setItemAsync(LANGUAGE_KEY, nextLanguage);
    } else {
      setLanguage(nextLanguage);
    }
    const nextCurrency = storedCurrency && CURRENCY_OPTIONS_SET.has(storedCurrency)
      ? storedCurrency
      : null;
    if (nextCurrency) {
      setCurrencySymbol(nextCurrency);
    } else {
      setCurrencySymbol("$");
      setNeedsCurrencyPick(true);
    }
    const nextFont = storedFont === "system" || FONT_PREFERENCES.includes(storedFont as FontPreference)
      ? sanitizeFont(storedFont === "system" ? "inter" : (storedFont as string))
      : "inter";
    if (storedFont !== nextFont) {
      setAppFontPreference(nextFont);
      setFontPreference(nextFont);
      await setItemAsync(FONT_KEY, nextFont);
    } else {
      setAppFontPreference(nextFont);
      setFontPreference(nextFont);
    }
    const nextScale = sanitizeFontSizeScale(storedFontScale);
    setAppFontSizeScale(nextScale);
    setFontSizeScaleState(nextScale);
    if (storedFontScale !== String(nextScale)) {
      await setItemAsync(FONT_SIZE_SCALE_KEY, String(nextScale));
    }
    const nextColor = sanitizeColorScheme(storedColorScheme || DEFAULT_COLOR_SCHEME);
    setColorScheme(nextColor);
    setColorSchemeState(nextColor);
    const validThemes: ThemeMode[] = ["dark", "light"];
    const nextTheme: ThemeMode = validThemes.includes(storedTheme as ThemeMode)
      ? (storedTheme as ThemeMode)
      : "light";
    setThemeMode(nextTheme);
    setThemeState(nextTheme);
  }, [setColorScheme, setThemeMode]);

  const applyRemotePreferences = useCallback(
    (prefs: UiPreferencesSnapshot) => {
      const nextLanguage = sanitizeLanguage(prefs.language);
      const nextCurrency = sanitizeCurrency(prefs.currencySymbol);
      const nextFont = sanitizeFont(prefs.fontPreference);
      const nextScale = sanitizeFontSizeScale((prefs as unknown as { fontSizeScale?: number }).fontSizeScale ?? 1.0);
      const nextColor = sanitizeColorScheme(prefs.colorScheme);
      const validThemes: ThemeMode[] = ["dark", "light"];
      const nextTheme: ThemeMode = validThemes.includes(prefs.theme as ThemeMode)
        ? (prefs.theme as ThemeMode)
        : "light";
      setLanguage(nextLanguage);
      setCurrencySymbol(nextCurrency);
      setAppFontPreference(nextFont);
      setFontPreference(nextFont);
      setAppFontSizeScale(nextScale);
      setFontSizeScaleState(nextScale);
      setColorScheme(nextColor);
      setColorSchemeState(nextColor);
      setThemeMode(nextTheme);
      setThemeState(nextTheme);
      persistPreference(LANGUAGE_KEY, nextLanguage);
      persistPreference(CURRENCY_SYMBOL_KEY, nextCurrency);
      persistPreference(FONT_KEY, nextFont);
      persistPreference(FONT_SIZE_SCALE_KEY, String(nextScale));
      persistPreference(COLOR_SCHEME_KEY, nextColor);
      persistPreference(THEME_KEY, nextTheme);
    },
    [setColorScheme, setThemeMode],
  );

  const dismissCurrencyPick = useCallback(() => setNeedsCurrencyPick(false), []);

  const saveLanguage = useCallback((next: string) => {
    const value = sanitizeLanguage(next);
    setLanguage(value);
    persistPreference(LANGUAGE_KEY, value);
  }, []);

  const saveCurrencySymbol = useCallback((next: string) => {
    const value = sanitizeCurrency(next);
    setCurrencySymbol(value);
    persistPreference(CURRENCY_SYMBOL_KEY, value);
  }, []);

  const saveFontPreference = useCallback((next: string) => {
    const value = sanitizeFont(next);
    setAppFontPreference(value);
    setFontPreference(value);
    persistPreference(FONT_KEY, value);
  }, []);

  const saveFontSizeScale = useCallback((next: number) => {
    const value = sanitizeFontSizeScale(next);
    setAppFontSizeScale(value);
    setFontSizeScaleState(value);
    persistPreference(FONT_SIZE_SCALE_KEY, String(value));
  }, []);

  const saveColorScheme = useCallback((next: string) => {
    const value = sanitizeColorScheme(next);
    setColorScheme(value);
    setColorSchemeState(value);
    persistPreference(COLOR_SCHEME_KEY, value);
  }, [setColorScheme]);

  const saveTheme = useCallback((next: ThemeMode) => {
    setThemeMode(next);
    setThemeState(next);
    persistPreference(THEME_KEY, next);
  }, [setThemeMode]);

  const resetToDefaults = useCallback(() => {
    const defaultLang = sanitizeLanguage(detectDeviceLanguage());
    const defaultScheme = DEFAULT_COLOR_SCHEME;
    setLanguage(defaultLang);
    setCurrencySymbol("$");
    setAppFontPreference("inter");
    setFontPreference("inter");
    setAppFontSizeScale(DEFAULT_FONT_SIZE_SCALE);
    setFontSizeScaleState(DEFAULT_FONT_SIZE_SCALE);
    setColorScheme(defaultScheme);
    setColorSchemeState(defaultScheme);
    setThemeMode("light");
    setThemeState("light");
    persistPreference(LANGUAGE_KEY, defaultLang);
    persistPreference(CURRENCY_SYMBOL_KEY, "$");
    persistPreference(FONT_KEY, "inter");
    persistPreference(FONT_SIZE_SCALE_KEY, String(DEFAULT_FONT_SIZE_SCALE));
    persistPreference(COLOR_SCHEME_KEY, defaultScheme);
    persistPreference(THEME_KEY, "light");
  }, [setColorScheme, setThemeMode]);

  return {
    language,
    currencySymbol,
    fontPreference,
    fontSizeScale,
    colorScheme,
    theme,
    copy,
    needsCurrencyPick,
    dismissCurrencyPick,
    saveLanguage,
    saveCurrencySymbol,
    saveFontPreference,
    saveFontSizeScale,
    saveColorScheme,
    saveTheme,
    restorePreferences,
    applyRemotePreferences,
    resetToDefaults,
  };
}
