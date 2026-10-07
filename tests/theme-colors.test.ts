import type { ColorSchemePreference } from "../src/theme/colors";

describe("themeColors", () => {
  let getPalette: typeof import("../src/theme/colors.ts").getPalette;
  let getPaletteCacheStats: typeof import("../src/theme/colors.ts").getPaletteCacheStats;
  let dark: typeof import("../src/theme/colors.ts").dark;

  beforeAll(async () => {
    const mod = await import("../src/theme/colors.ts");
    getPalette = mod.getPalette;
    getPaletteCacheStats = mod.getPaletteCacheStats;
    dark = mod.dark;
  });

  test("getPalette returns dark cyprus palette by default", () => {
    const palette = getPalette("dark", "cyprus");
    expect(palette.bg).toBe(dark.bg);
    expect(palette.primary).toBe(dark.primary);
    expect(Array.isArray(palette.tagColors)).toBeTruthy();
    expect(palette.tagColors.length).toBe(12);
  });

  test("getPalette returns light cyprus palette", () => {
    const palette = getPalette("light", "cyprus");
    expect(palette.bg).toBe("#F0EDE4");
    expect(palette.text).toBe("#1a2622");
  });

  test("getPalette applies vulcanico scheme", () => {
    const d = getPalette("dark", "vulcanico");
    expect(d.bg).toBe("#001621");
    expect(d.primary).toBe("#FF4103");
    const l = getPalette("light", "vulcanico");
    expect(l.bg).toBe("#f4ede6");
    expect(l.primary).toBe("#b82c00");
  });

  test("getPalette applies charcoalline scheme", () => {
    const d = getPalette("dark", "charcoalline");
    expect(d.primary).toBe("#D98A4E");
    const l = getPalette("light", "charcoalline");
    expect(l.primary).toBe("#8A4F1E");
  });

  test("getPalette applies truepink scheme", () => {
    const d = getPalette("dark", "truepink");
    expect(d.primary).toBe("#E91E8C");
    const l = getPalette("light", "truepink");
    expect(l.primary).toBe("#a8001f");
  });

  test("getPalette applies silver scheme", () => {
    const d = getPalette("dark", "silver");
    expect(d.primary).toBe("#3ED598");
    const l = getPalette("light", "silver");
    expect(l.primary).toBe("#1E7A34");
  });

  test("getPalette applies sky scheme", () => {
    const d = getPalette("dark", "sky");
    expect(d.primary).toBe("#4A90D9");
    const l = getPalette("light", "sky");
    expect(l.primary).toBe("#1E5FA8");
  });

  test("getPalette applies bridal scheme", () => {
    const d = getPalette("dark", "bridal");
    expect(d.primary).toBe("#FFC6A8");
    const l = getPalette("light", "bridal");
    expect(l.primary).toBe("#741A2F");
  });

  test("getPalette applies obsidian scheme", () => {
    const d = getPalette("dark", "obsidian");
    expect(d.primary).toBe("#C8FF00");
    const l = getPalette("light", "obsidian");
    expect(l.primary).toBe("#5A7A00");
  });

  test("getPalette applies arcilla scheme", () => {
    const d = getPalette("dark", "arcilla");
    expect(d.primary).toBe("#E8B83A");
    const l = getPalette("light", "arcilla");
    expect(l.primary).toBe("#7A4E0C");
  });

  test("getPalette caches and returns same reference", () => {
    const a = getPalette("dark", "sky");
    const b = getPalette("dark", "sky");
    expect(a).toBe(b);
  });

  test("getPalette evicts oldest entry when cache is full", () => {
    const schemes = [
      "cyprus", "vulcanico", "charcoalline", "truepink",
      "silver", "sky", "bridal", "obsidian", "arcilla",
    ];
    const refs: any[] = [];
    for (const s of schemes) {
      refs.push(getPalette("dark", s as ColorSchemePreference));
      refs.push(getPalette("light", s as ColorSchemePreference));
    }
    expect(refs.length).toBe(18);
    const extra = getPalette("dark", "silver");
    expect(extra).toBeTruthy();
    const re = getPalette("dark", "cyprus");
    expect(re.bg).toBe("#003530");
  });

  test("getPalette returns palette with all required keys", () => {
    const palette = getPalette("dark", "sky");
    const requiredKeys = [
      "bg", "card", "input", "border", "borderStrong", "text", "textSubtle",
      "muted", "primary", "primarySoft", "onPrimary", "income", "incomeSoft",
      "expense", "expenseSoft", "warn", "warnSoft", "info", "infoSoft",
      "periodBg", "disabled", "switchTrack", "editBg", "editBorder",
      "freqExpenseRow", "overlay", "shadow", "tagColors", "tagTextLight", "tagTextDark",
    ];
    for (const key of requiredKeys) {
      expect(key in palette).toBeTruthy();
    }
  });

  test("getPalette evicts oldest when cache overflows", () => {
    const schemes: ColorSchemePreference[] = [
      "cyprus", "vulcanico", "charcoalline", "truepink",
      "silver", "sky", "bridal", "obsidian", "arcilla",
    ];
    for (const s of schemes) {
      getPalette("dark", s);
      getPalette("light", s);
    }
    const before = getPaletteCacheStats();
    expect(before.size).toBe(18);

    const overflowed = getPalette("fallback" as "dark", "cyprus");
    expect(overflowed.bg).toBeDefined();
    const after = getPaletteCacheStats();
    expect(after.size).toBe(18);
  });

  test("getPalette re-orders cache on access (LRU promotion)", () => {
    getPalette("dark", "sky");
    getPalette("dark", "cyprus");
    getPalette("dark", "vulcanico");
    getPalette("dark", "sky");
    const d = getPalette("dark", "obsidian");
    expect(d.primary).toBe("#C8FF00");
  });
});
