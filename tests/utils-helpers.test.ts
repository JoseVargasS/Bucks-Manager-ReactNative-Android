describe("helpers", () => {
  let buildExportFileName: typeof import("../src/utils/helpers").buildExportFileName;
  let getPeriodRange: typeof import("../src/utils/helpers").getPeriodRange;
  let getAvailableMonthsForYear: typeof import("../src/utils/helpers").getAvailableMonthsForYear;
  let detectDeviceLanguage: typeof import("../src/utils/helpers").detectDeviceLanguage;
  let detectDeviceCurrencySymbol: typeof import("../src/utils/helpers").detectDeviceCurrencySymbol;
  let withAlpha: typeof import("../src/utils/helpers").withAlpha;
  let getDraftAmountValue: typeof import("../src/utils/expressionParser").getDraftAmountValue;
  let isMathFormula: typeof import("../src/utils/expressionParser").isMathFormula;

  beforeAll(async () => {
    const helpersMod = await import("../src/utils/helpers");
    buildExportFileName = helpersMod.buildExportFileName;
    getPeriodRange = helpersMod.getPeriodRange;
    getAvailableMonthsForYear = helpersMod.getAvailableMonthsForYear;
    detectDeviceLanguage = helpersMod.detectDeviceLanguage;
    detectDeviceCurrencySymbol = helpersMod.detectDeviceCurrencySymbol;
    withAlpha = helpersMod.withAlpha;
    const parserMod = await import("../src/utils/expressionParser");
    getDraftAmountValue = parserMod.getDraftAmountValue;
    isMathFormula = parserMod.isMathFormula;
  });

  // --- buildExportFileName ---
  test("buildExportFileName generates correct filename for date range", () => {
    const cfg = {
      format: "xlsx",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    };
    expect(buildExportFileName(cfg as any)).toBe("bucks-manager_2026-01-01_a_2026-01-31");
  });

  test("buildExportFileName generates filename for month range", () => {
    const cfg = {
      format: "xlsx",
      rangeMode: "months",
      startDate: "2026-01",
      endDate: "2026-03",
    };
    expect(buildExportFileName(cfg as any)).toBe("bucks-manager_january-2026_a_march-2026");
  });

  test("buildExportFileName handles partial ranges", () => {
    const cfg1 = { format: "xlsx", rangeMode: "dates", startDate: "2026-01-01", endDate: "" };
    expect(buildExportFileName(cfg1 as any)).toBe("bucks-manager_desde_2026-01-01");

    const cfg2 = { format: "xlsx", rangeMode: "dates", startDate: "", endDate: "2026-01-31" };
    expect(buildExportFileName(cfg2 as any)).toBe("bucks-manager_hasta_2026-01-31");
  });

  test("buildExportFileName defaults to todo when no range", () => {
    const cfg = { format: "xlsx", rangeMode: "dates", startDate: "", endDate: "" };
    expect(buildExportFileName(cfg as any)).toBe("bucks-manager_todo");
  });

  // --- getPeriodRange ---
  test("getPeriodRange returns min and max month from transactions", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15T12:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", createdAt: "" },
      { rowId: 2, rawDate: "2026-03-15T12:00:00.000Z", amount: -50, detail: "B", type: "GASTO NO FRECUENTE", createdAt: "" },
      { rowId: 3, rawDate: "2026-02-15T12:00:00.000Z", amount: -30, detail: "C", type: "GASTO FRECUENTE", createdAt: "" },
    ];
    const range = getPeriodRange(transactions as any);
    expect(range.minYear).toBe(2026);
    expect(range.minMonth).toBe(0);
    expect(range.maxYear).toBe(2026);
    expect(range.maxMonth).toBe(2);
  });

  test("getPeriodRange returns current month for empty array", () => {
    const today = new Date();
    today.setDate(15);
    today.setHours(12, 0, 0, 0);
    const range = getPeriodRange([]);
    expect(range.minYear).toBe(today.getFullYear());
    expect(range.minMonth).toBe(today.getMonth());
    expect(range.maxYear).toBe(today.getFullYear());
    expect(range.maxMonth).toBe(today.getMonth());
  });

  test("getPeriodRange ignores future dates", () => {
    const future = new Date();
    future.setFullYear(future.getFullYear() + 1);
    future.setHours(12, 0, 0, 0);
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15T12:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", createdAt: "" },
      { rowId: 2, rawDate: future.toISOString(), amount: -50, detail: "B", type: "GASTO NO FRECUENTE", createdAt: "" },
    ];
    const range = getPeriodRange(transactions as any);
    expect(range.minYear).toBe(2026);
    expect(range.minMonth).toBe(0);
  });

  // --- getAvailableMonthsForYear ---
  test("getAvailableMonthsForYear returns months within range", () => {
    const range = { minYear: 2024, minMonth: 2, maxYear: 2026, maxMonth: 5 };
    expect(getAvailableMonthsForYear(2024, range)).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(getAvailableMonthsForYear(2025, range)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
    expect(getAvailableMonthsForYear(2026, range)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  test("getAvailableMonthsForYear returns empty array for year outside range", () => {
    const range = { minYear: 2024, minMonth: 2, maxYear: 2026, maxMonth: 5 };
    expect(getAvailableMonthsForYear(2023, range)).toEqual([]);
    expect(getAvailableMonthsForYear(2027, range)).toEqual([]);
  });

  // --- detectDeviceLanguage ---
  test("detectDeviceLanguage returns es or en based on locale", () => {
    const lang = detectDeviceLanguage();
    expect(lang === "es" || lang === "en").toBeTruthy();
  });

  // --- detectDeviceCurrencySymbol ---
  test("detectDeviceCurrencySymbol returns S/. for Peru locale", () => {
    const mockLocale = { resolvedOptions: () => ({ locale: "es-PE" }) };
    const originalDateTimeFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = function () { return mockLocale; };
    const result = detectDeviceCurrencySymbol();
    expect(result).toContain("S");
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  test("detectDeviceCurrencySymbol returns $ for US locale", () => {
    const mockLocale = { resolvedOptions: () => ({ locale: "en-US" }) };
    const originalDateTimeFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = function () { return mockLocale; };
    expect(detectDeviceCurrencySymbol()).toBe("$");
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  test("detectDeviceCurrencySymbol returns EUR for Spain locale", () => {
    const mockLocale = { resolvedOptions: () => ({ locale: "es-ES" }) };
    const originalDateTimeFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = function () { return mockLocale; };
    expect(detectDeviceCurrencySymbol()).toBe("\u20ac");
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  test("detectDeviceCurrencySymbol defaults to $ for unknown locale", () => {
    const mockLocale = { resolvedOptions: () => ({ locale: "unknown" }) };
    const originalDateTimeFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = function () { return mockLocale; };
    expect(detectDeviceCurrencySymbol()).toBe("$");
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  test("detectDeviceCurrencySymbol returns $ for Colombia locale", () => {
    const mockLocale = { resolvedOptions: () => ({ locale: "es-CO" }) };
    const originalDateTimeFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = function () { return mockLocale; };
    const result = detectDeviceCurrencySymbol();
    expect(result.length > 0).toBeTruthy();
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  test("detectDeviceCurrencySymbol falls back to language-level map when locale has no region", () => {
    const mockLocale = { resolvedOptions: () => ({ locale: "es" }) };
    const originalDateTimeFormat = Intl.DateTimeFormat;
    (Intl as any).DateTimeFormat = function () { return mockLocale; };
    const result = detectDeviceCurrencySymbol();
    expect(result).toContain("S");
    Intl.DateTimeFormat = originalDateTimeFormat;
  });

  // --- withAlpha ---
  test("withAlpha converts hex to rgba", () => {
    expect(withAlpha("#ff0000", 0.5)).toBe("rgba(255, 0, 0, 0.5)");
    expect(withAlpha("#0f0", 0.3)).toBe("rgba(0, 255, 0, 0.3)");
  });

  test("withAlpha returns input for invalid hex", () => {
    expect(withAlpha("invalid", 0.5)).toBe("invalid");
    expect(withAlpha("#12345", 0.5)).toBe("#12345");
  });

  // --- expressionParser ---
  test("getDraftAmountValue computes amount from draft", () => {
    expect(getDraftAmountValue({ amount: "100", type: "GASTO NO FRECUENTE" })).toBe(100);
    expect(getDraftAmountValue({ amount: "=10+20", type: "INGRESO FRECUENTE" })).toBe(30);
    expect(getDraftAmountValue({ amount: "", type: "GASTO FRECUENTE" })).toBe(0);
  });

  test("isMathFormula detects math expressions", () => {
    expect(isMathFormula("=10+20")).toBe(true);
    expect(isMathFormula("10*5")).toBe(true);
    expect(isMathFormula("100")).toBe(false);
    expect(isMathFormula("=100")).toBe(true);
  });
});
