import type { MaterialIconName, Tab } from "@/types";
import type { ColorSchemePreference } from "./accents";

export const ANIM_SPLASH_DURATION = 220;
export const ANIM_TAB_PAGER = 210;
export const ANIM_HEADER_BTN_IN = 60;
export const ANIM_HEADER_BTN_OUT = 60;
export const ANIM_CHART_ENTER = 250;
export const ANIM_PIE_FORM = 600;
export const ANIM_MODAL_CONTENT = 220;
export const ANIM_ROW_FLASH = 600;
export const ANIM_VALUE_FADE = 200;
export const ANIM_LIST_FADE = 150;

export const NAV_BTN_SIZE = 40;
export const NAV_BTN_HEIGHT = 42;
export const NAV_BTN_RADIUS = 21;
export const NAV_GROUP_GAP = 4;
export const NAV_GROUP_PADDING = 4;
export const NAV_GROUP_RADIUS = 50;
export const BLUR_INTENSITY = 110;
export const HEADER_ACTIONS_WIDTH = NAV_BTN_SIZE * 3 + NAV_GROUP_GAP * 2 + NAV_GROUP_PADDING * 2;
export const SELECT_HEIGHT = 46;

export const PIN_DELAY_MS = 1500;
export const PIN_RESET_MS = 1200;
export const PIN_LENGTH = 4;

export const Z_INDEX_MODAL = 1000;
export const Z_INDEX_DETAIL = 1001;
export const Z_INDEX_SEARCH = 1002;

// Splash uses raw constants because it renders before ThemeProvider mounts.
export const SPLASH_BG = "#000000";
export const SPLASH_SPINNER = "#C8FF00";
export const SPLASH_TEXT = "#f0ede4";

export const TOKEN_KEY = "bucks_google_access_token";
export const SHEET_KEY = "bucks_spreadsheet_id";

export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
];

const LEGAL_BASE = "https://josevargass.github.io/Bucks-Manager-ReactNative-Android";

type LegalLang = "es" | "en";

// ponytail: localized legal pages (privacy-es.html / privacy-en.html, …)
export const LEGAL_URLS = {
  privacy: (lang: LegalLang) => `${LEGAL_BASE}/privacy-${lang}.html`,
  terms: (lang: LegalLang) => `${LEGAL_BASE}/terms-${lang}.html`,
  deleteAccount: (lang: LegalLang) => `${LEGAL_BASE}/delete-${lang}.html`,
};

export const PLAY_PACKAGE = "com.kuskalabs.quipu";
export const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${PLAY_PACKAGE}`;
export const PLAY_MARKET_URL = `market://details?id=${PLAY_PACKAGE}`;
export const SUPPORT_EMAIL = "kuskalabs@gmail.com";

export const TAB_ORDER: Tab[] = ["dashboard", "expenses", "summary", "settings"];

export const COLOR_SCHEME_OPTIONS: Array<{
  value: ColorSchemePreference;
  labelEs: string;
  labelEn: string;
  icon: MaterialIconName;
}> = [
  {
    value: "cyprus",
    labelEs: "Lima",
    labelEn: "Lime",
    icon: "leaf",
  },
  {
    value: "vulcanico",
    labelEs: "Lava",
    labelEn: "Lava",
    icon: "fire",
  },
  {
    value: "charcoalline",
    labelEs: "Lila",
    labelEn: "Lilac",
    icon: "lightning-bolt",
  },
  {
    value: "truepink",
    labelEs: "Rosa",
    labelEn: "Pink",
    icon: "heart",
  },
  {
    value: "silver",
    labelEs: "Plata",
    labelEn: "Silver",
    icon: "circle-half-full",
  },
  { value: "sky", labelEs: "Cielo", labelEn: "Sky", icon: "weather-night" },
  {
    value: "bridal",
    labelEs: "Durazno",
    labelEn: "Peach",
    icon: "flower-tulip",
  },
  {
    value: "obsidian",
    labelEs: "Obsidiana",
    labelEn: "Obsidian",
    icon: "moon-waning-crescent",
  },
  {
    value: "arcilla",
    labelEs: "Arcilla",
    labelEn: "Clay",
    icon: "terrain",
  },
];
