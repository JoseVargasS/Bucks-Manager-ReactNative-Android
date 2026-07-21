import accentsData from "./accents.json";

export type ColorSchemePreference =
  | "cyprus"
  | "ocean"
  | "vulcanico"
  | "tiffany"
  | "charcoalline"
  | "truepink"
  | "silver"
  | "milky"
  | "sky"
  | "turmeric"
  | "bridal"
  | "obsidian";

export const accents = accentsData as Record<
  ColorSchemePreference,
  { dark: Record<string, string>; light: Record<string, string> }
>;
