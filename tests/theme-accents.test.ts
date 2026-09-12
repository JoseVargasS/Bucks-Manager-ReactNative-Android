import { accents } from "@/theme/accents";
import { getContrastRatio } from "@/theme/colors";
import type { ColorSchemePreference } from "@/theme/accents";

const schemeNames: ColorSchemePreference[] = [
  "cyprus", "vulcanico", "charcoalline",
  "truepink", "silver", "sky", "bridal", "obsidian",
];

describe("accents", () => {
  test.each(schemeNames)("%s has both dark and light palettes", (name) => {
    const scheme = accents[name];
    expect(scheme).toBeDefined();
    expect(scheme.dark).toBeDefined();
    expect(scheme.light).toBeDefined();
  });

  test.each(schemeNames)("%s dark palette has required keys", (name) => {
    const dark = accents[name].dark;
    expect(dark.bg).toBeDefined();
    expect(dark.card).toBeDefined();
    expect(dark.text).toBeDefined();
    expect(dark.primary).toBeDefined();
    expect(dark.income).toBeDefined();
    expect(dark.expense).toBeDefined();
  });

  test.each(schemeNames)("%s light palette has required keys", (name) => {
    const light = accents[name].light;
    expect(light.bg).toBeDefined();
    expect(light.card).toBeDefined();
    expect(light.text).toBeDefined();
    expect(light.primary).toBeDefined();
    expect(light.income).toBeDefined();
    expect(light.expense).toBeDefined();
  });

  test("all schemes have valid hex colors for bg", () => {
    for (const name of schemeNames) {
      const darkBg = accents[name].dark.bg;
      const lightBg = accents[name].light.bg;
      expect(darkBg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(lightBg).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  // Las cards claras deben distinguirse del fondo (verificado con sky:
  // bg #eef4fc vs card #e5f0ff era ~1.04 y se veía un solo fondo).
  test.each(schemeNames)("%s light card stands out from bg", (name) => {
    const { bg, card } = accents[name].light;
    expect(getContrastRatio(card, bg)).toBeGreaterThanOrEqual(1.09);
  });
});
