import { useCallback, useState } from "react";
import {
  getItemAsync,
  setItemAsync,
} from "expo-secure-store";
import { type ColorSchemePreference } from "@/theme/colors";
import { useTheme } from "@/theme/ThemeContext";
import { type LanguageMode, type FontPreference, type MaterialIconName } from "@/types";
import {
  detectDeviceCurrencySymbol,
  detectDeviceLanguage,
} from "@/utils/helpers";
import { setAppFontPreference } from "@/components/ui/AppText";
import { FONT_FAMILIES, FONT_ICONS } from "@/components/ui/fontConstants";
import { type UiCopy, UI_COPY } from "@/i18n";

const LANGUAGE_KEY = "bucks_language";
const CURRENCY_SYMBOL_KEY = "bucks_currency_symbol";
const FONT_KEY = "bucks_font";
const COLOR_SCHEME_KEY = "bucks_color_scheme";
const FONT_PREFERENCES = Object.keys(FONT_FAMILIES) as FontPreference[];
const COLOR_SCHEME_PREFERENCES: ColorSchemePreference[] = [
  "cyprus", "ocean", "vulcanico", "tiffany", "charcoalline",
  "truepink", "silver", "milky", "sky", "turmeric", "bridal",
];
const DEFAULT_COLOR_SCHEME: ColorSchemePreference = "sky";
const CURRENCY_OPTIONS_SET = new Set([
  "S/", "$", "€", "£", "¥", "R$", "MX$", "COP$", "CLP$",
]);

const FONT_COPY_KEYS: Record<FontPreference, keyof UiCopy> = {
  dmsans: "system",
  serif: "serif",
  mono: "mono",
  condensed: "condensed",
  light: "lightFont",
  casual: "casual",
  cursive: "cursive",
  smallcaps: "smallCaps",
  inter: "inter",
  intervariable: "interVariable",
  jetbrainsmono: "jetbrainsMono",
  spacemono: "spaceMono",
  orbitron: "orbitron",
  playfair: "playfair",
  bebasneue: "bebasNeue",
  fredoka: "fredoka",
  comicneue: "comicNeue",
  sora: "sora",
  patrickhand: "patrickHand",
  plusjakartasans: "plusJakartaSans",
  comicsansms: "comicSansMS",
  proggysquare: "proggySquare",
  redstarbold: "redstarBold",
  sansi: "sansi",
  sfscribbledsans: "sfScribbledSans",
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
  { labelEs: "Soles peruanos (S/)", labelEn: "Peruvian soles (S/)", value: "S/", icon: "cash" },
  { labelEs: "Dólares ($)", labelEn: "US dollars ($)", value: "$", icon: "currency-usd" },
  { labelEs: "Euros (€)", labelEn: "Euros (€)", value: "€", icon: "currency-eur" },
  { labelEs: "Libras (£)", labelEn: "Pounds (£)", value: "£", icon: "currency-gbp" },
  { labelEs: "Yenes (¥)", labelEn: "Yen (¥)", value: "¥", icon: "currency-jpy" },
  { labelEs: "Reales (R$)", labelEn: "Brazilian reais (R$)", value: "R$", icon: "currency-brl" },
  { labelEs: "Pesos mexicanos (MX$)", labelEn: "Mexican pesos (MX$)", value: "MX$", icon: "cash" },
  { labelEs: "Pesos colombianos (COP$)", labelEn: "Colombian pesos (COP$)", value: "COP$", icon: "cash" },
  { labelEs: "Pesos chilenos (CLP$)", labelEn: "Chilean pesos (CLP$)", value: "CLP$", icon: "cash" },
];

// Snapshot of all cloud-synced cosmetic preferences. Mirrors the shape
// persisted in MONTHLY SUMMARY!L1:L2. App.tsx is responsible for the
// actual sheet write — usePreferences just owns the SecureStore + state.
export type UiPreferencesSnapshot = {
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  colorScheme: ColorSchemePreference;
};

type PreferencesState = {
  language: LanguageMode;
  currencySymbol: string;
  fontPreference: FontPreference;
  colorScheme: ColorSchemePreference;
  copy: UiCopy;
  saveLanguage: (next: string) => void;
  saveCurrencySymbol: (next: string) => void;
  saveFontPreference: (next: string) => void;
  saveColorScheme: (next: string) => void;
  restorePreferences: () => Promise<void>;
  applyRemotePreferences: (prefs: UiPreferencesSnapshot) => void;
};

export function usePreferences(): PreferencesState {
  const { setColorScheme } = useTheme();
  const [language, setLanguage] = useState<LanguageMode>(detectDeviceLanguage);
  const [currencySymbol, setCurrencySymbol] = useState(detectDeviceCurrencySymbol);
  const [fontPreference, setFontPreference] = useState<FontPreference>("dmsans");
  const [colorScheme, setColorSchemeState] = useState<ColorSchemePreference>(DEFAULT_COLOR_SCHEME);

  const copy: UiCopy = UI_COPY[language];

  const sanitizeColorScheme = (next: string): ColorSchemePreference =>
    COLOR_SCHEME_PREFERENCES.includes(next as ColorSchemePreference)
      ? (next as ColorSchemePreference)
      : DEFAULT_COLOR_SCHEME;
  const sanitizeFont = (next: string): FontPreference =>
    FONT_PREFERENCES.includes(next as FontPreference)
      ? (next as FontPreference)
      : "dmsans";
  const sanitizeCurrency = (next: string): string =>
    CURRENCY_OPTIONS_SET.has(next) ? next : detectDeviceCurrencySymbol();
  const sanitizeLanguage = (next: string): LanguageMode =>
    next === "en" ? "en" : "es";

  const restorePreferences = useCallback(async () => {
    const [storedLanguage, storedCurrency, storedFont, storedColorScheme] =
      await Promise.all([
        getItemAsync(LANGUAGE_KEY),
        getItemAsync(CURRENCY_SYMBOL_KEY),
        getItemAsync(FONT_KEY),
        getItemAsync(COLOR_SCHEME_KEY),
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
      : detectDeviceCurrencySymbol();
    if (storedCurrency !== nextCurrency) {
      setCurrencySymbol(nextCurrency);
      await setItemAsync(CURRENCY_SYMBOL_KEY, nextCurrency);
    } else {
      setCurrencySymbol(nextCurrency);
    }
    const nextFont = storedFont === "system" || FONT_PREFERENCES.includes(storedFont as FontPreference)
      ? sanitizeFont(storedFont === "system" ? "dmsans" : (storedFont as string))
      : "dmsans";
    if (storedFont !== nextFont) {
      setAppFontPreference(nextFont);
      setFontPreference(nextFont);
      await setItemAsync(FONT_KEY, nextFont);
    } else {
      setAppFontPreference(nextFont);
      setFontPreference(nextFont);
    }
    const nextColor = sanitizeColorScheme(storedColorScheme || DEFAULT_COLOR_SCHEME);
    setColorScheme(nextColor);
    setColorSchemeState(nextColor);
  }, [setColorScheme]);

  const applyRemotePreferences = useCallback(
    (prefs: UiPreferencesSnapshot) => {
      const nextLanguage = sanitizeLanguage(prefs.language);
      const nextCurrency = sanitizeCurrency(prefs.currencySymbol);
      const nextFont = sanitizeFont(prefs.fontPreference);
      const nextColor = sanitizeColorScheme(prefs.colorScheme);
      setLanguage(nextLanguage);
      setCurrencySymbol(nextCurrency);
      setAppFontPreference(nextFont);
      setFontPreference(nextFont);
      setColorScheme(nextColor);
      setColorSchemeState(nextColor);
      setItemAsync(LANGUAGE_KEY, nextLanguage).catch(() => undefined);
      setItemAsync(CURRENCY_SYMBOL_KEY, nextCurrency).catch(() => undefined);
      setItemAsync(FONT_KEY, nextFont).catch(() => undefined);
      setItemAsync(COLOR_SCHEME_KEY, nextColor).catch(() => undefined);
    },
    [setColorScheme],
  );

  const saveLanguage = useCallback((next: string) => {
    const value = sanitizeLanguage(next);
    setLanguage(value);
    setItemAsync(LANGUAGE_KEY, value).catch(() => undefined);
  }, []);

  const saveCurrencySymbol = useCallback((next: string) => {
    const value = sanitizeCurrency(next);
    setCurrencySymbol(value);
    setItemAsync(CURRENCY_SYMBOL_KEY, value).catch(() => undefined);
  }, []);

  const saveFontPreference = useCallback((next: string) => {
    const value = sanitizeFont(next);
    setAppFontPreference(value);
    setFontPreference(value);
    setItemAsync(FONT_KEY, value).catch(() => undefined);
  }, []);

  const saveColorScheme = useCallback((next: string) => {
    const value = sanitizeColorScheme(next);
    setColorScheme(value);
    setColorSchemeState(value);
    setItemAsync(COLOR_SCHEME_KEY, value).catch(() => undefined);
  }, [setColorScheme]);

  return {
    language,
    currencySymbol,
    fontPreference,
    colorScheme,
    copy,
    saveLanguage,
    saveCurrencySymbol,
    saveFontPreference,
    saveColorScheme,
    restorePreferences,
    applyRemotePreferences,
  };
}
