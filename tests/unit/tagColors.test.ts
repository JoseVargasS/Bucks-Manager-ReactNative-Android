import {
  adjustTagColorForLight,
  SHARED_TAG_COLORS_DARK,
  SHARED_TAG_COLORS_LIGHT,
} from "@/theme/colors";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const value = hex.replace("#", "");
  const num = parseInt(value, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

function lightness(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  return (max + min) / 2;
}

describe("tagColors", () => {
  it("exposes 12 dark and 12 light shared tag colors", () => {
    expect(SHARED_TAG_COLORS_DARK).toHaveLength(12);
    expect(SHARED_TAG_COLORS_LIGHT).toHaveLength(12);
  });

  it("keeps every light tag color at 65% lightness or below", () => {
    for (const color of SHARED_TAG_COLORS_LIGHT) {
      expect(lightness(color) * 100).toBeLessThanOrEqual(65);
    }
  });

  it("does not turn white into pure black", () => {
    const adjusted = adjustTagColorForLight("#FFFFFF");
    expect(adjusted).not.toBe("#000000");
    expect(adjusted).not.toBe("#ffffff");
  });
});
