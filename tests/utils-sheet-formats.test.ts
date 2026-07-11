describe("sheetFormats", () => {
  let parseSheetDate: typeof import("../src/api/sheetFormats").parseSheetDate;
  let parseCreatedAt: typeof import("../src/api/sheetFormats").parseCreatedAt;

  beforeAll(async () => {
    const mod = await import("../src/api/sheetFormats");
    parseSheetDate = mod.parseSheetDate;
    parseCreatedAt = mod.parseCreatedAt;
  });

  test("parseSheetDate handles 2-digit year in numeric date", () => {
    const result = parseSheetDate("15/01/26");
    expect(result instanceof Date).toBeTruthy();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(0);
    expect(result!.getDate()).toBe(15);
  });

  test("parseSheetDate returns null for impossible date", () => {
    expect(parseSheetDate("31/02/2026")).toBe(null);
  });

  test("parseSheetDate handles 4-digit year month format", () => {
    const result = parseSheetDate("2026-01");
    expect(result instanceof Date).toBeTruthy();
    expect(result!.getFullYear()).toBe(2026);
    expect(result!.getMonth()).toBe(0);
    expect(result!.getDate()).toBe(1);
  });

  test("parseSheetDate returns null for invalid year-month", () => {
    expect(parseSheetDate("2026-13")).toBe(null);
  });

  test("parseCreatedAt returns input string for invalid date string", () => {
    expect(parseCreatedAt("not-a-date")).toBe("not-a-date");
  });

  test("parseCreatedAt returns empty string for falsy value", () => {
    expect(parseCreatedAt(null)).toBe("");
    expect(parseCreatedAt(undefined)).toBe("");
    expect(parseCreatedAt("")).toBe("");
  });

  test("parseCreatedAt converts valid date string to ISO", () => {
    const result = parseCreatedAt("2026-01-15");
    expect(result).toBe(new Date("2026-01-15").toISOString());
  });
});
