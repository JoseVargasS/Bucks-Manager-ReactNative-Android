import {
  ANIM_SPLASH_DURATION,
  ANIM_TAB_PAGER,
  PIN_DELAY_MS,
  PIN_RESET_MS,
  PIN_LENGTH,
  TOKEN_KEY,
  SHEET_KEY,
  GOOGLE_WORKSPACE_SCOPES,
  TAB_ORDER,
  COLOR_SCHEME_OPTIONS,
} from "@/theme/constants";

describe("theme constants", () => {
  test("animation durations are positive", () => {
    expect(ANIM_SPLASH_DURATION).toBeGreaterThan(0);
    expect(ANIM_TAB_PAGER).toBeGreaterThan(0);
  });

  test("PIN constants are reasonable", () => {
    expect(PIN_LENGTH).toBe(4);
    expect(PIN_DELAY_MS).toBeGreaterThan(0);
    expect(PIN_RESET_MS).toBeGreaterThan(0);
  });

  test("storage keys are strings", () => {
    expect(typeof TOKEN_KEY).toBe("string");
    expect(typeof SHEET_KEY).toBe("string");
    expect(TOKEN_KEY.length).toBeGreaterThan(0);
    expect(SHEET_KEY.length).toBeGreaterThan(0);
  });

  test("GOOGLE_WORKSPACE_SCOPES has required scopes", () => {
    expect(GOOGLE_WORKSPACE_SCOPES.length).toBe(2);
    expect(GOOGLE_WORKSPACE_SCOPES).toContain("https://www.googleapis.com/auth/drive.metadata.readonly");
    expect(GOOGLE_WORKSPACE_SCOPES).toContain("https://www.googleapis.com/auth/spreadsheets");
  });

  test("TAB_ORDER has 4 tabs", () => {
    expect(TAB_ORDER).toEqual(["dashboard", "expenses", "summary", "settings"]);
  });

  test("COLOR_SCHEME_OPTIONS has all schemes", () => {
    expect(COLOR_SCHEME_OPTIONS.length).toBe(9);
    const values = COLOR_SCHEME_OPTIONS.map((o) => o.value);
    expect(values).toContain("cyprus");
    expect(values).toContain("vulcanico");
    expect(values).toContain("sky");
    expect(values).toContain("obsidian");
    expect(values).toContain("arcilla");
  });

  test("each COLOR_SCHEME_OPTION has required fields", () => {
    for (const opt of COLOR_SCHEME_OPTIONS) {
      expect(opt.value).toBeTruthy();
      expect(opt.labelEs).toBeTruthy();
      expect(opt.labelEn).toBeTruthy();
      expect(opt.icon).toBeTruthy();
    }
  });
});
