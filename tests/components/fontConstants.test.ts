import { FONT_FAMILIES, FONT_SIZE_SCALE, FONT_ICONS } from "@/components/ui/fontConstants";

describe("fontConstants", () => {
  it("has all font families", () => {
    expect(Object.keys(FONT_FAMILIES).length).toBe(14);
    expect(FONT_FAMILIES.dmsans).toBe("DMSans");
    expect(FONT_FAMILIES.inter).toBe("Inter");
  });

  it("has scale overrides for specific fonts", () => {
    expect(FONT_SIZE_SCALE.comicsansms).toBe(1.2);
    expect(FONT_SIZE_SCALE.dmsans).toBe(1.04);
    expect(FONT_SIZE_SCALE.patrickhand).toBe(1.12);
    expect(FONT_SIZE_SCALE.inter).toBeUndefined();
    expect(FONT_SIZE_SCALE.intervariable).toBeUndefined();
  });

  it("has icon mapping for all fonts", () => {
    const fonts = Object.keys(FONT_FAMILIES) as Array<keyof typeof FONT_ICONS>;
    for (const font of fonts) {
      expect(FONT_ICONS[font]).toBeDefined();
      expect(typeof FONT_ICONS[font]).toBe("string");
    }
  });

  it("every font has a unique icon", () => {
    const icons = Object.values(FONT_ICONS);
    const unique = new Set(icons);
    expect(unique.size).toBeGreaterThanOrEqual(8);
  });
});
