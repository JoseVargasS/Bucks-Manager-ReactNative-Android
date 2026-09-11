import accentsData from "./accents.json";

export type ColorSchemePreference =
  | "cyprus"
  | "vulcanico"
  | "charcoalline"
  | "truepink"
  | "silver"
  | "sky"
  | "bridal"
  | "obsidian";

export const accents = accentsData as Record<
  ColorSchemePreference,
  { dark: Record<string, string>; light: Record<string, string> }
>;
