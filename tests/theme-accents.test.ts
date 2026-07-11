import { accents } from "@/theme/accents";
import type { ColorSchemePreference } from "@/theme/accents";

const schemeNames: ColorSchemePreference[] = [
  "cyprus", "ocean", "vulcanico", "tiffany", "charcoalline",
  "truepink", "silver", "milky", "sky", "turmeric", "bridal", "obsidian",
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
});
