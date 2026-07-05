import type { MaterialIconName, Tab } from "@/types";
import type { ColorSchemePreference } from "./accents";

export const ANIM_SPLASH_DURATION = 220;
export const ANIM_TAB_PAGER = 210;
export const ANIM_HEADER_BTN_IN = 60;
export const ANIM_HEADER_BTN_OUT = 60;

export const PIN_DELAY_MS = 1500;
export const PIN_RESET_MS = 1200;
export const PIN_LENGTH = 4;

export const Z_INDEX_MODAL = 1000;
export const Z_INDEX_DETAIL = 1001;
export const Z_INDEX_SEARCH = 1002;

// Splash uses raw constants because it renders before ThemeProvider mounts.
// The values match the cyprus dark scheme (new default): a near-black green
// shell, a sand-mint spinner, and a chalk-white title.
export const SPLASH_BG = "#001a16";
export const SPLASH_SPINNER = "#9ed9c8";
export const SPLASH_TEXT = "#f0ede4";
export const SPLASH_INDICATOR_OFFSET = 72;

export const TOKEN_KEY = "bucks_google_access_token";
export const SHEET_KEY = "bucks_spreadsheet_id";

export const GOOGLE_WORKSPACE_SCOPES = [
  "https://www.googleapis.com/auth/drive.metadata.readonly",
  "https://www.googleapis.com/auth/spreadsheets",
];

export const TAB_ORDER: Tab[] = ["dashboard", "expenses", "summary", "settings"];

export const COLOR_SCHEME_OPTIONS: Array<{
  value: ColorSchemePreference;
  labelEs: string;
  labelEn: string;
  icon: MaterialIconName;
}> = [
  {
    value: "cyprus",
    labelEs: "Chipre",
    labelEn: "Cyprus",
    icon: "leaf",
  },
  { value: "ocean", labelEs: "Océano", labelEn: "Ocean", icon: "waves" },
  {
    value: "vulcanico",
    labelEs: "Volcánico",
    labelEn: "Vulcanico",
    icon: "fire",
  },
  {
    value: "tiffany",
    labelEs: "Tiffany",
    labelEn: "Tiffany",
    icon: "diamond-stone",
  },
  {
    value: "charcoalline",
    labelEs: "Carbón Línea",
    labelEn: "Charcoal Line",
    icon: "lightning-bolt",
  },
  {
    value: "truepink",
    labelEs: "Rosa Verdad",
    labelEn: "True Pink",
    icon: "heart",
  },
  {
    value: "silver",
    labelEs: "Plata",
    labelEn: "Silver",
    icon: "circle-half-full",
  },
  {
    value: "milky",
    labelEs: "Lácteo",
    labelEn: "Milky",
    icon: "sprout",
  },
  { value: "sky", labelEs: "Cielo", labelEn: "Sky", icon: "weather-night" },
  {
    value: "turmeric",
    labelEs: "Cúrcuma",
    labelEn: "Turmeric",
    icon: "white-balance-sunny",
  },
  {
    value: "bridal",
    labelEs: "Nupcial",
    labelEn: "Bridal",
    icon: "flower-tulip",
  },
  {
    value: "obsidian",
    labelEs: "Obsidiana",
    labelEn: "Obsidian",
    icon: "moon-waning-crescent",
  },
];
