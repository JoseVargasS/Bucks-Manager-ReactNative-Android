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

export const SPLASH_BG = "#050E0B";
export const SPLASH_SPINNER = "#C8FF00";
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
    value: "lime",
    labelEs: "Lima Bucks",
    labelEn: "Bucks Lime",
    icon: "sprout",
  },
  { value: "ocean", labelEs: "Océano", labelEn: "Ocean", icon: "waves" },
  {
    value: "violet",
    labelEs: "Violeta",
    labelEn: "Violet",
    icon: "circle-multiple-outline",
  },
  {
    value: "amber",
    labelEs: "Ámbar",
    labelEn: "Amber",
    icon: "white-balance-sunny",
  },
  {
    value: "graphite",
    labelEs: "Grafito",
    labelEn: "Graphite",
    icon: "circle-half-full",
  },
  {
    value: "pink",
    labelEs: "Rosa",
    labelEn: "Pink",
    icon: "heart",
  },
  {
    value: "sports",
    labelEs: "Deportes",
    labelEn: "Sports",
    icon: "trophy",
  },
  {
    value: "techy",
    labelEs: "Techy",
    labelEn: "Techy",
    icon: "chip",
  },
  {
    value: "sky",
    labelEs: "Cielo",
    labelEn: "Sky",
    icon: "weather-night",
  },
];
