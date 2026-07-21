import esJson from "./i18n/es.json";
import enJson from "./i18n/en.json";
import monthsJson from "./i18n/months.json";

export const UI_COPY = { es: esJson, en: enJson };
export type UiCopy = { [K in keyof typeof esJson]: string };
export const UI_MONTH_NAMES = monthsJson;
export const MONTH_NAMES_EN = monthsJson.en;
