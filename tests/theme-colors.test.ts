import type { ColorSchemePreference } from "../src/theme/colors";

describe("themeColors", () => {
  let getPalette: typeof import("../src/theme/colors.ts").getPalette;
  let dark: typeof import("../src/theme/colors.ts").dark;

  beforeAll(async () => {
    const mod = await import("../src/theme/colors.ts");
    getPalette = mod.getPalette;
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

  test("getPalette applies ocean scheme overrides on dark", () => {
    const palette = getPalette("dark", "ocean");
    expect(palette.bg).toBe("#061418");
    expect(palette.primary).toBe("#4ed8d0");
  });

  test("getPalette applies ocean scheme overrides on light", () => {
    const palette = getPalette("light", "ocean");
    expect(palette.bg).toBe("#e8f4f2");
    expect(palette.primary).toBe("#066b64");
  });

  test("getPalette applies vulcanico scheme", () => {
    const d = getPalette("dark", "vulcanico");
    expect(d.bg).toBe("#001621");
    expect(d.primary).toBe("#FF4103");
    const l = getPalette("light", "vulcanico");
    expect(l.bg).toBe("#f4ede6");
    expect(l.primary).toBe("#b82c00");
  });

  test("getPalette applies tiffany scheme", () => {
    const d = getPalette("dark", "tiffany");
    expect(d.primary).toBe("#21F1A8");
    const l = getPalette("light", "tiffany");
    expect(l.primary).toBe("#066b50");
  });

  test("getPalette applies charcoalline scheme", () => {
    const d = getPalette("dark", "charcoalline");
    expect(d.primary).toBe("#B6FF00");
    const l = getPalette("light", "charcoalline");
    expect(l.primary).toBe("#4a5c04");
  });

  test("getPalette applies truepink scheme", () => {
    const d = getPalette("dark", "truepink");
    expect(d.primary).toBe("#FD1843");
    const l = getPalette("light", "truepink");
    expect(l.primary).toBe("#a8001f");
  });

  test("getPalette applies silver scheme", () => {
    const d = getPalette("dark", "silver");
    expect(d.primary).toBe("#2BEE34");
    const l = getPalette("light", "silver");
    expect(l.primary).toBe("#137016");
  });

  test("getPalette applies milky scheme", () => {
    const d = getPalette("dark", "milky");
    expect(d.primary).toBe("#59C749");
    const l = getPalette("light", "milky");
    expect(l.primary).toBe("#2a7a20");
  });

  test("getPalette applies sky scheme", () => {
    const d = getPalette("dark", "sky");
    expect(d.primary).toBe("#58b8ff");
    const l = getPalette("light", "sky");
    expect(l.primary).toBe("#1868b8");
  });

  test("getPalette applies turmeric scheme", () => {
    const d = getPalette("dark", "turmeric");
    expect(d.primary).toBe("#FFBE0B");
    const l = getPalette("light", "turmeric");
    expect(l.primary).toBe("#7a5c04");
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
    expect(l.primary).toBe("#C8FF00");
  });

  test("getPalette caches and returns same reference", () => {
    const a = getPalette("dark", "sky");
    const b = getPalette("dark", "sky");
    expect(a).toBe(b);
  });

  test("getPalette evicts oldest entry when cache is full", () => {
    const schemes = [
      "cyprus", "ocean", "vulcanico", "tiffany", "charcoalline", "truepink",
      "silver", "milky", "sky", "turmeric", "bridal", "obsidian",
    ];
    const refs: any[] = [];
    for (const s of schemes) {
      refs.push(getPalette("dark", s as ColorSchemePreference));
      refs.push(getPalette("light", s as ColorSchemePreference));
    }
    expect(refs.length).toBe(24);
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

  test("getPalette re-orders cache on access (LRU promotion)", () => {
    getPalette("dark", "sky");
    getPalette("dark", "cyprus");
    getPalette("dark", "ocean");
    getPalette("dark", "sky");
    const d = getPalette("dark", "obsidian");
    expect(d.primary).toBe("#C8FF00");
  });
});
