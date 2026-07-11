describe("formats", () => {
  let formatCreatedTime: typeof import("../src/utils/formats").formatCreatedTime;
  let formatDateGroupLabel: typeof import("../src/utils/formats").formatDateGroupLabel;
  let typeColor: typeof import("../src/utils/formats").typeColor;
  let typeFill: typeof import("../src/utils/formats").typeFill;
  let typeLabel: typeof import("../src/utils/formats").typeLabel;
  let typeLabelFull: typeof import("../src/utils/formats").typeLabelFull;
  let UI_COPY: typeof import("../src/i18n").UI_COPY;

  beforeAll(async () => {
    const fmtMod = await import("../src/utils/formats");
    formatCreatedTime = fmtMod.formatCreatedTime;
    formatDateGroupLabel = fmtMod.formatDateGroupLabel;
    typeColor = fmtMod.typeColor;
    typeFill = fmtMod.typeFill;
    typeLabel = fmtMod.typeLabel;
    typeLabelFull = fmtMod.typeLabelFull;
    const i18nMod = await import("../src/i18n");
    UI_COPY = i18nMod.UI_COPY;
  });

  const mockColors = {
    income: "#22c55e",
    expense: "#ef4444",
    warn: "#eab308",
    incomeSoft: "#dcfce7",
    expenseSoft: "#fee2e2",
    warnSoft: "#fef9c3",
  } as any;

  const mockCopyEs = {
    languageCode: "es",
    today: "HOY",
    yesterday: "AYER",
    freqIncome: "Ing. Frec.",
    nonFreqIncome: "Ing. No Frec.",
    freqExpense: "Gasto Frec.",
    nonFreqExpense: "Gasto No Frec.",
    freqIncomeFull: "Ingreso Frecuente",
    nonFreqIncomeFull: "Ingreso No Frecuente",
    freqExpenseFull: "Gasto Frecuente",
    nonFreqExpenseFull: "Gasto No Frecuente",
  };

  const mockCopyEn = {
    languageCode: "en",
    today: "TODAY",
    yesterday: "YESTERDAY",
    freqIncome: "Freq. Income",
    nonFreqIncome: "Non-Freq. Income",
    freqExpense: "Freq. Expense",
    nonFreqExpense: "Non-Freq. Expense",
    freqIncomeFull: "Frequent Income",
    nonFreqIncomeFull: "Non-Frequent Income",
    freqExpenseFull: "Frequent Expense",
    nonFreqExpenseFull: "Non-Frequent Expense",
  };

  // --- formatCreatedTime ---
  test("formatCreatedTime formats time string correctly", () => {
    const result = formatCreatedTime("2026-01-15T14:30:45.000Z");
    expect(/^\d{2}:\d{2}:\d{2}$/.test(result)).toBeTruthy();
  });

  test("formatCreatedTime returns dash for empty input", () => {
    expect(formatCreatedTime("")).toBe("-");
    expect(formatCreatedTime(undefined as any)).toBe("-");
  });

  test("formatCreatedTime returns original value for invalid date", () => {
    expect(formatCreatedTime("invalid")).toBe("invalid");
  });

  // --- formatDateGroupLabel ---
  test("formatDateGroupLabel shows HOY for today", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const label = formatDateGroupLabel(today.toISOString(), mockCopyEs as any);
    expect(label).toContain("HOY");
  });

  test("formatDateGroupLabel shows AYER for yesterday", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(12, 0, 0, 0);
    const label = formatDateGroupLabel(yesterday.toISOString(), mockCopyEs as any);
    expect(label).toContain("AYER");
  });

  test("formatDateGroupLabel shows full date for other dates", () => {
    const label = formatDateGroupLabel("2026-06-15T12:00:00.000Z", mockCopyEs as any);
    expect(label).toContain("2026");
  });

  test("formatDateGroupLabel uses English labels when configured", () => {
    const today = new Date();
    today.setHours(12, 0, 0, 0);
    const label = formatDateGroupLabel(today.toISOString(), mockCopyEn as any);
    expect(label).toContain("TODAY");
  });

  // --- typeColor ---
  test("typeColor returns green for income types", () => {
    expect(typeColor("INGRESO FRECUENTE", mockColors)).toBe(mockColors.income);
    expect(typeColor("INGRESO NO FRECUENTE", mockColors)).toBe(mockColors.income);
  });

  test("typeColor returns red for GASTO FRECUENTE", () => {
    expect(typeColor("GASTO FRECUENTE", mockColors)).toBe(mockColors.expense);
  });

  test("typeColor returns yellow for GASTO NO FRECUENTE", () => {
    expect(typeColor("GASTO NO FRECUENTE", mockColors)).toBe(mockColors.warn);
  });

  // --- typeFill ---
  test("typeFill returns income soft for income types", () => {
    expect(typeFill("INGRESO FRECUENTE", mockColors)).toBe(mockColors.incomeSoft);
    expect(typeFill("INGRESO NO FRECUENTE", mockColors)).toBe(mockColors.incomeSoft);
  });

  test("typeFill returns expense soft for GASTO FRECUENTE", () => {
    expect(typeFill("GASTO FRECUENTE", mockColors)).toBe(mockColors.expenseSoft);
  });

  test("typeFill returns warn soft for GASTO NO FRECUENTE", () => {
    expect(typeFill("GASTO NO FRECUENTE", mockColors)).toBe(mockColors.warnSoft);
  });

  // --- typeLabel ---
  test("typeLabel returns short labels in Spanish", () => {
    expect(typeLabel("INGRESO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.freqIncome);
    expect(typeLabel("INGRESO NO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.nonFreqIncome);
    expect(typeLabel("GASTO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.freqExpense);
    expect(typeLabel("GASTO NO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.nonFreqExpense);
  });

  test("typeLabel returns short labels in English", () => {
    expect(typeLabel("INGRESO FRECUENTE", mockCopyEn as any)).toBe(mockCopyEn.freqIncome);
    expect(typeLabel("GASTO NO FRECUENTE", mockCopyEn as any)).toBe(mockCopyEn.nonFreqExpense);
  });

  // --- typeLabelFull ---
  test("typeLabelFull returns full labels in Spanish", () => {
    expect(typeLabelFull("INGRESO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.freqIncomeFull);
    expect(typeLabelFull("INGRESO NO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.nonFreqIncomeFull);
    expect(typeLabelFull("GASTO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.freqExpenseFull);
    expect(typeLabelFull("GASTO NO FRECUENTE", mockCopyEs as any)).toBe(mockCopyEs.nonFreqExpenseFull);
  });

  test("typeLabelFull returns full labels in English", () => {
    expect(typeLabelFull("INGRESO FRECUENTE", mockCopyEn as any)).toBe(mockCopyEn.freqIncomeFull);
    expect(typeLabelFull("GASTO NO FRECUENTE", mockCopyEn as any)).toBe(mockCopyEn.nonFreqExpenseFull);
  });

  test("transaction type translations use complete words", () => {
    expect(
      [UI_COPY.es.freqIncomeFull, UI_COPY.es.nonFreqIncomeFull, UI_COPY.es.freqExpenseFull, UI_COPY.es.nonFreqExpenseFull],
    ).toEqual(["Ingreso frecuente", "Ingreso no frecuente", "Gasto frecuente", "Gasto no frecuente"]);
    expect(
      [UI_COPY.en.freqIncome, UI_COPY.en.nonFreqIncome, UI_COPY.en.freqExpense, UI_COPY.en.nonFreqExpense],
    ).toEqual(["Recurring income", "Non-recurring income", "Recurring expense", "Non-recurring expense"]);
  });

  test("typeColor falls back to warn for unknown type", () => {
    expect(typeColor("UNKNOWN", mockColors)).toBe(mockColors.warn);
  });

  test("typeFill falls back to warnSoft for unknown type", () => {
    expect(typeFill("UNKNOWN", mockColors)).toBe(mockColors.warnSoft);
  });
});
