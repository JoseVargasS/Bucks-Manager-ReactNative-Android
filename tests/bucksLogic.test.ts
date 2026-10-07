describe("bucksLogic", () => {
  let formatMoney: typeof import("../src/domain/bucksLogic.ts").formatMoney;
  let buildTransactionFromDraft: typeof import("../src/domain/bucksLogic.ts").buildTransactionFromDraft;
  let isValidTransactionDraft: typeof import("../src/domain/bucksLogic.ts").isValidTransactionDraft;
  let insertChronologically: typeof import("../src/domain/bucksLogic.ts").insertChronologically;
  let applySearch: typeof import("../src/domain/bucksLogic.ts").applySearch;
  let calculateSummaries: typeof import("../src/domain/bucksLogic.ts").calculateSummaries;
  let calculateMonthSummary: typeof import("../src/domain/bucksLogic.ts").calculateMonthSummary;
  let getTransactionMonthKey: typeof import("../src/domain/bucksLogic.ts").getTransactionMonthKey;
  let recalculateSummariesForMonths: typeof import("../src/domain/bucksLogic.ts").recalculateSummariesForMonths;
  let uniqueMonthKeys: typeof import("../src/domain/bucksLogic.ts").uniqueMonthKeys;
  let aggregateExpensesByTag: typeof import("../src/domain/bucksLogic.ts").aggregateExpensesByTag;
  let aggregateIncomesByTag: typeof import("../src/domain/bucksLogic.ts").aggregateIncomesByTag;
  let groupSummariesByYear: typeof import("../src/domain/bucksLogic.ts").groupSummariesByYear;
  let detectNonFreqSpike: typeof import("../src/domain/bucksLogic.ts").detectNonFreqSpike;
  let computeSavingsLinePoints: typeof import("../src/domain/bucksLogic.ts").computeSavingsLinePoints;
  let formatDateToISO: typeof import("../src/utils/dateUtils").formatDateToISO;
  let formatDateForSheet: typeof import("../src/utils/dateUtils").formatDateForSheet;
  let parseSpanishDate: typeof import("../src/utils/dateUtils").parseSpanishDate;
  let getMonthYear: typeof import("../src/utils/dateUtils").getMonthYear;
  let normalizeAmountExpression: typeof import("../src/utils/expressionParser").normalizeAmountExpression;
  let calculateExpression: typeof import("../src/utils/expressionParser").calculateExpression;
  let normalizeDraftAmount: typeof import("../src/domain/bucksLogic.ts").normalizeDraftAmount;
  let SHEET_NAMES: typeof import("../src/domain/bucksLogic.ts").SHEET_NAMES;
  let TRANSACTION_TYPES: typeof import("../src/domain/bucksLogic.ts").TRANSACTION_TYPES;
  let MONTH_NAMES: typeof import("../src/domain/bucksLogic.ts").MONTH_NAMES;

  beforeAll(async () => {
    const mod = await import("../src/domain/bucksLogic.ts");
    formatMoney = mod.formatMoney;
    buildTransactionFromDraft = mod.buildTransactionFromDraft;
    isValidTransactionDraft = mod.isValidTransactionDraft;
    insertChronologically = mod.insertChronologically;
    applySearch = mod.applySearch;
    calculateSummaries = mod.calculateSummaries;
    calculateMonthSummary = mod.calculateMonthSummary;
    getTransactionMonthKey = mod.getTransactionMonthKey;
    recalculateSummariesForMonths = mod.recalculateSummariesForMonths;
    uniqueMonthKeys = mod.uniqueMonthKeys;
    aggregateExpensesByTag = mod.aggregateExpensesByTag;
    aggregateIncomesByTag = mod.aggregateIncomesByTag;
    groupSummariesByYear = mod.groupSummariesByYear;
    detectNonFreqSpike = mod.detectNonFreqSpike;
    computeSavingsLinePoints = mod.computeSavingsLinePoints;
    formatDateToISO = (await import("../src/utils/dateUtils")).formatDateToISO;
    formatDateForSheet = (await import("../src/utils/dateUtils")).formatDateForSheet;
    parseSpanishDate = (await import("../src/utils/dateUtils")).parseSpanishDate;
    getMonthYear = (await import("../src/utils/dateUtils")).getMonthYear;
    normalizeAmountExpression = (await import("../src/utils/expressionParser")).normalizeAmountExpression;
    calculateExpression = (await import("../src/utils/expressionParser")).calculateExpression;
    normalizeDraftAmount = mod.normalizeDraftAmount;
    SHEET_NAMES = mod.SHEET_NAMES;
    TRANSACTION_TYPES = mod.TRANSACTION_TYPES;
    MONTH_NAMES = mod.MONTH_NAMES;
  });

  // --- formatMoney ---
  test("formatMoney formats positive income with explicit plus sign", () => {
    expect(formatMoney(100, "S/")).toBe("+ S/ 100.00");
    expect(formatMoney(50.5, "$", 2)).toBe("+ $ 50.50");
  });

  test("formatMoney formats negative expenses with explicit minus sign", () => {
    expect(formatMoney(-100, "S/")).toBe("- S/ 100.00");
    expect(formatMoney(-50.5, "€", 2)).toBe("- € 50.50");
  });

  test("formatMoney handles zero and custom decimals", () => {
    expect(formatMoney(0, "S/")).toBe("+ S/ 0.00");
    expect(formatMoney(100, "$", 0)).toBe("+ $ 100");
    expect(formatMoney(100.123, "€", 3)).toBe("+ € 100.123");
  });

  // --- buildTransactionFromDraft ---
  test("buildTransactionFromDraft creates income with positive amount", () => {
    const draft = {
      date: "2026-01-15",
      amount: "100",
      detail: "Sueldo",
      type: "INGRESO FRECUENTE",
      tags: ["Trabajo"],
    };
    const tx = buildTransactionFromDraft(draft as any, 2);
    expect(tx.rowId).toBe(2);
    expect(tx.amount).toBe(100);
    expect(tx.detail).toBe("Sueldo");
    expect(tx.type).toBe("INGRESO FRECUENTE");
    expect(tx.rawDate.startsWith("2026-01-15")).toBeTruthy();
    expect(tx.createdAt).toBeTruthy();
    expect(tx.tags).toEqual([]);
  });

  test("buildTransactionFromDraft creates expense with negative amount", () => {
    const draft = {
      date: "2026-01-15",
      amount: "-50",
      detail: "Comida",
      type: "GASTO NO FRECUENTE",
      tags: ["Comida"],
    };
    const tx = buildTransactionFromDraft(draft as any, 3);
    expect(tx.rowId).toBe(3);
    expect(tx.amount).toBe(-50);
    expect(tx.detail).toBe("Comida");
    expect(tx.type).toBe("GASTO NO FRECUENTE");
  });

  test("buildTransactionFromDraft evaluates math expressions with equals sign", () => {
    const draft = {
      date: "2026-01-15",
      amount: "=10+20",
      detail: "Operacion",
      type: "INGRESO NO FRECUENTE",
    };
    const tx = buildTransactionFromDraft(draft as any, 4);
    expect(tx.amount).toBe(30);
    expect(tx.formula).toBe("10+20");
  });

  test("buildTransactionFromDraft preserves createdAt if provided", () => {
    const draft = {
      date: "2026-01-15",
      amount: "100",
      detail: "Test",
      type: "INGRESO FRECUENTE",
      createdAt: "2026-01-14T10:00:00.000Z",
    };
    const tx = buildTransactionFromDraft(draft as any, 5);
    expect(tx.createdAt).toBe("2026-01-14T10:00:00.000Z");
  });

  test("buildTransactionFromDraft rejects signs that conflict with transaction type", () => {
    const incomeDraft = {
      date: "2026-01-15",
      amount: "100",
      detail: "Devolucion",
      type: "INGRESO NO FRECUENTE",
    };
    const expenseDraft = {
      date: "2026-01-15",
      amount: "-100",
      detail: "Comida",
      type: "GASTO FRECUENTE",
    };
    const income = buildTransactionFromDraft(incomeDraft as any, 2);
    const expense = buildTransactionFromDraft(expenseDraft as any, 3);

    expect(income.amount).toBe(100);
    expect(expense.amount).toBe(-100);
    // Con nuevo flujo sin signo obligatorio: "-100" para ingreso se normaliza a +100, "100" para gasto a -100
    expect(buildTransactionFromDraft({ ...incomeDraft, amount: "-100" } as any, 4).amount).toBe(100);
    expect(buildTransactionFromDraft({ ...expenseDraft, amount: "100" } as any, 5).amount).toBe(-100);
  });

  test("transaction draft validation rejects zero, bad dates, and empty details", () => {
    const valid = {
      date: "2026-01-15",
      amount: "-100",
      detail: "Comida",
      type: "GASTO NO FRECUENTE",
    };

    expect(isValidTransactionDraft(valid as any)).toBe(true);
    // Sin signo obligatorio: "100" para gasto se valida por magnitud, igual que "-100" para ingreso
    expect(isValidTransactionDraft({ ...valid, amount: "100" } as any)).toBe(true);
    expect(isValidTransactionDraft({ ...valid, type: "INGRESO NO FRECUENTE" } as any)).toBe(true);
    expect(isValidTransactionDraft({ ...valid, amount: "0" } as any)).toBe(false);
    expect(isValidTransactionDraft({ ...valid, amount: "10-10" } as any)).toBe(false);
    expect(isValidTransactionDraft({ ...valid, date: "fecha" } as any)).toBe(false);
    expect(isValidTransactionDraft({ ...valid, date: "2026-02-31" } as any)).toBe(false);
    expect(isValidTransactionDraft({ ...valid, detail: " " } as any)).toBe(false);
    expect(() => buildTransactionFromDraft({ ...valid, amount: "0" } as any, 4)).toThrow(/Invalid transaction draft/);
  });

  // --- insertChronologically ---
  test("insertChronologically inserts in correct date order", () => {
    const existing = [
      { rowId: 2, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", createdAt: "" },
      { rowId: 3, rawDate: "2026-01-17T00:00:00.000Z", amount: -50, detail: "B", type: "GASTO NO FRECUENTE", createdAt: "" },
    ];
    const newTx = { rowId: 99, rawDate: "2026-01-16T00:00:00.000Z", amount: -30, detail: "C", type: "GASTO FRECUENTE", createdAt: "" };
    const result = insertChronologically(existing as any, newTx as any);
    expect(result.length).toBe(3);
    expect(result.map((r) => r.detail)).toEqual(["A", "C", "B"]);
    expect(result.map((r) => r.rowId)).toEqual([2, 3, 4]);
  });

  test("insertChronologically appends at end if newest", () => {
    const existing = [
      { rowId: 2, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", createdAt: "" },
    ];
    const newTx = { rowId: 99, rawDate: "2026-01-20T00:00:00.000Z", amount: -30, detail: "B", type: "GASTO FRECUENTE", createdAt: "" };
    const result = insertChronologically(existing as any, newTx as any);
    expect(result.map((r) => r.detail)).toEqual(["A", "B"]);
    expect(result.map((r) => r.rowId)).toEqual([2, 3]);
  });

  test("insertChronologically prepends at start if oldest", () => {
    const existing = [
      { rowId: 2, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", createdAt: "" },
    ];
    const newTx = { rowId: 99, rawDate: "2026-01-10T00:00:00.000Z", amount: -30, detail: "B", type: "GASTO FRECUENTE", createdAt: "" };
    const result = insertChronologically(existing as any, newTx as any);
    expect(result.map((r) => r.detail)).toEqual(["B", "A"]);
    expect(result.map((r) => r.rowId)).toEqual([2, 3]);
  });

  // --- applySearch ---
  test("applySearch filters by text in detail", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "Sueldo enero", type: "INGRESO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-01-16T00:00:00.000Z", amount: -50, detail: "Comida restaurante", type: "GASTO NO FRECUENTE", tags: ["Comida"] },
    ];
    const result = applySearch(transactions as any, { text: "comida", tag: "", minAmount: "", maxAmount: "", startDate: "", endDate: "" });
    expect(result.length).toBe(1);
    expect(result[0].detail).toBe("Comida restaurante");
  });

  test("applySearch filters by tag", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "Sueldo", type: "INGRESO FRECUENTE", tags: ["Trabajo"] },
      { rowId: 2, rawDate: "2026-01-16T00:00:00.000Z", amount: -50, detail: "Comida", type: "GASTO NO FRECUENTE", tags: ["Comida"] },
    ];
    const result = applySearch(transactions as any, { text: "", tag: "Comida", minAmount: "", maxAmount: "", startDate: "", endDate: "" });
    expect(result.length).toBe(1);
    expect(result[0].tags![0]).toBe("Comida");
  });

  test("applySearch filters by amount range", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-01-16T00:00:00.000Z", amount: -50, detail: "B", type: "GASTO NO FRECUENTE", tags: [] },
      { rowId: 3, rawDate: "2026-01-17T00:00:00.000Z", amount: -200, detail: "C", type: "GASTO FRECUENTE", tags: [] },
    ];
    const result = applySearch(transactions as any, { text: "", tag: "", minAmount: "60", maxAmount: "150", startDate: "", endDate: "" });
    expect(result.length).toBe(1);
    expect(result.map((r) => r.rowId)).toEqual([1]);
  });

  test("applySearch filters by date range", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-10T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-01-15T00:00:00.000Z", amount: -50, detail: "B", type: "GASTO NO FRECUENTE", tags: [] },
      { rowId: 3, rawDate: "2026-01-20T00:00:00.000Z", amount: -200, detail: "C", type: "GASTO FRECUENTE", tags: [] },
    ];
    const result = applySearch(transactions as any, { text: "", tag: "", minAmount: "", maxAmount: "", startDate: "2026-01-12", endDate: "2026-01-18" });
    expect(result.length).toBe(1);
    expect(result[0].rowId).toBe(2);
  });

  test("applySearch limits results to 150", () => {
    const transactions = Array.from({ length: 200 }, (_, i) => ({
      rowId: i + 1,
      rawDate: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
      amount: -i,
      detail: `Tx ${i}`,
      type: "GASTO NO FRECUENTE" as const,
      tags: [] as string[],
    }));
    const result = applySearch(transactions as any, { text: "", tag: "", minAmount: "", maxAmount: "", startDate: "", endDate: "" });
    expect(result.length).toBe(150);
  });

  // --- calculateSummaries ---
  test("calculateSummaries aggregates transactions by month", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15T00:00:00.000Z", amount: 1000, detail: "Sueldo", type: "INGRESO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-01-16T00:00:00.000Z", amount: 500, detail: "Bono", type: "INGRESO NO FRECUENTE", tags: [] },
      { rowId: 3, rawDate: "2026-01-17T00:00:00.000Z", amount: -200, detail: "Alquiler", type: "GASTO FRECUENTE", tags: [] },
      { rowId: 4, rawDate: "2026-01-18T00:00:00.000Z", amount: -100, detail: "Comida", type: "GASTO NO FRECUENTE", tags: [] },
    ];
    const freqIncome = { "January 2026": 1000 };
    const result = calculateSummaries(transactions as any, freqIncome);
    expect(result.length).toBe(1);
    const row = result[0];
    expect(row.monthYear).toBe("January 2026");
    expect(row.freqIncome).toBe(1000);
    expect(row.nonFreqIncome).toBe(500);
    expect(row.totalIncome).toBe(1500);
    expect(row.freqExpense).toBe(-200);
    expect(row.nonFreqExpense).toBe(-100);
    expect(row.totalExpense).toBe(-300);
    expect(row.netMonthly).toBe(1200);
    expect(row.netNoFreq).toBe(200);
  });

  test("calculateSummaries includes months with only freqIncome", () => {
    const transactions: any[] = [];
    const freqIncome = { "February 2026": 800 };
    const result = calculateSummaries(transactions, freqIncome);
    expect(result.length).toBe(1);
    expect(result[0].monthYear).toBe("February 2026");
    expect(result[0].freqIncome).toBe(800);
    expect(result[0].netMonthly).toBe(800);
  });

  test("calculateSummaries counts directly added frequent income", () => {
    const result = calculateSummaries([{
      rowId: 1, rawDate: "2026-02-10T00:00:00.000Z", amount: 900, detail: "Sueldo", type: "INGRESO FRECUENTE", tags: [],
    }] as any, {});
    expect(result[0].freqIncome).toBe(900);
    expect(result[0].totalIncome).toBe(900);
  });

  test("calculateSummaries sorts months chronologically", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-03-15T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO NO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-01-15T00:00:00.000Z", amount: 200, detail: "B", type: "INGRESO NO FRECUENTE", tags: [] },
      { rowId: 3, rawDate: "2026-02-15T00:00:00.000Z", amount: 300, detail: "C", type: "INGRESO NO FRECUENTE", tags: [] },
    ];
    const result = calculateSummaries(transactions as any, {});
    expect(result.length).toBe(3);
    expect(result.map((r) => r.monthYear)).toEqual(["January 2026", "February 2026", "March 2026"]);
  });

  // --- Helper functions ---
  test("formatDateToISO converts Date to YYYY-MM-DD", () => {
    const date = new Date("2026-01-15T10:00:00.000Z");
    expect(formatDateToISO(date)).toBe("2026-01-15");
    expect(formatDateToISO("2026-01-15T10:00:00.000Z")).toBe("2026-01-15");
    expect(formatDateToISO("invalid")).toBe("");
  });

  test("formatDateForSheet formats as DD-mmm-YY", () => {
    const date = new Date(2026, 0, 15);
    expect(formatDateForSheet(date)).toBe("15-jan-26");
    const date2 = new Date(2026, 5, 20);
    expect(formatDateForSheet(date2)).toBe("20-jun-26");
  });

  test("parseSpanishDate parses DD-mmm-YY format", () => {
    const date = parseSpanishDate("15-jan-26");
    expect(date).toBeTruthy();
    expect(date!.getFullYear()).toBe(2026);
    expect(date!.getMonth()).toBe(0);
    expect(date!.getDate()).toBe(15);

    expect(parseSpanishDate("invalid")).toBeNull();
    expect(parseSpanishDate("15-xxx-26")).toBeNull();
  });

  test("parseSpanishDate rejects impossible calendar dates", () => {
    expect(parseSpanishDate("31-feb-26")).toBeNull();
    expect(parseSpanishDate("00-jan-26")).toBeNull();
    expect(parseSpanishDate("texto")).toBeNull();
  });

  test("getMonthYear returns Month Year string", () => {
    const date = new Date("2026-01-15T00:00:00.000Z");
    expect(getMonthYear(date)).toBe("January 2026");
    const date2 = new Date("2026-12-25T00:00:00.000Z");
    expect(getMonthYear(date2)).toBe("December 2026");
  });

  test("normalizeAmountExpression removes equals prefix", () => {
    expect(normalizeAmountExpression("=10+20")).toBe("10+20");
    expect(normalizeAmountExpression("100")).toBe("100");
    expect(normalizeAmountExpression("  =50  ")).toBe("50");
  });

  test("calculateExpression evaluates math expressions", () => {
    expect(calculateExpression("10+20")).toBe(30);
    expect(calculateExpression("100-30")).toBe(70);
    expect(calculateExpression("5*4")).toBe(20);
    expect(calculateExpression("100/4")).toBe(25);
    expect(calculateExpression("(10+5)*2")).toBe(30);
    expect(calculateExpression("invalid")).toBe(0);
    expect(calculateExpression("")).toBe(0);
  });

  test("calculateExpression returns zero for empty, invalid, or non-finite expressions", () => {
    expect(calculateExpression("(")).toBe(0);
    expect(calculateExpression("1/0")).toBe(0);
  });

  // --- Constants ---
  test("SHEET_NAMES exports correct sheet names", () => {
    expect(SHEET_NAMES.transactions).toBe("INCOME AND EXPENSES");
    expect(SHEET_NAMES.summary).toBe("MONTHLY SUMMARY");
  });

  test("TRANSACTION_TYPES exports all four types", () => {
    expect(TRANSACTION_TYPES).toEqual([
      "INGRESO FRECUENTE",
      "INGRESO NO FRECUENTE",
      "GASTO FRECUENTE",
      "GASTO NO FRECUENTE",
    ]);
  });

  test("MONTH_NAMES exports all twelve months in English", () => {
    expect(MONTH_NAMES.length).toBe(12);
    expect(MONTH_NAMES[0]).toBe("January");
    expect(MONTH_NAMES[11]).toBe("December");
  });

  // --- calculateMonthSummary ---
  test("calculateMonthSummary sums all four transaction types", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15", amount: 1000, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-01-16", amount: 500, detail: "x", type: "INGRESO NO FRECUENTE", tags: [] },
      { rowId: 3, rawDate: "2026-01-17", amount: -200, detail: "x", type: "GASTO FRECUENTE", tags: [] },
      { rowId: 4, rawDate: "2026-01-18", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    ];
    const row = calculateMonthSummary(transactions as any, {}, "January 2026");
    expect(row.monthYear).toBe("January 2026");
    expect(row.freqIncome).toBe(1000);
    expect(row.nonFreqIncome).toBe(500);
    expect(row.totalIncome).toBe(1500);
    expect(row.freqExpense).toBe(-200);
    expect(row.nonFreqExpense).toBe(-100);
    expect(row.totalExpense).toBe(-300);
    expect(row.netMonthly).toBe(1200);
    expect(row.netNoFreq).toBe(200);
  });

  test("calculateMonthSummary falls back to freqIncomeByMonth when no transactions contribute", () => {
    const row = calculateMonthSummary([], { "February 2026": 800 }, "February 2026");
    expect(row.freqIncome).toBe(800);
    expect(row.nonFreqIncome).toBe(0);
    expect(row.netNoFreq).toBe(0);
  });

  test("calculateMonthSummary prefers transactions over freqIncomeByMonth when both exist", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15", amount: 500, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
    ];
    const row = calculateMonthSummary(transactions as any, { "January 2026": 999 }, "January 2026");
    expect(row.freqIncome).toBe(500);
  });

  // --- getTransactionMonthKey ---
  test("getTransactionMonthKey returns the Spanish month name and year", () => {
    const tx: any = { rowId: 1, rawDate: "2026-03-15", amount: 100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] };
    expect(getTransactionMonthKey(tx)).toBe("March 2026");
  });

  test("getTransactionMonthKey prefers rawDateMs when present", () => {
    const date = new Date(2024, 6, 4);
    const tx: any = {
      rowId: 1, rawDate: "1999-01-01", rawDateMs: date.getTime(),
      amount: 100, detail: "x", type: "GASTO NO FRECUENTE", tags: [],
    };
    expect(getTransactionMonthKey(tx)).toBe("July 2024");
  });

  test("getTransactionMonthKey parses YYYY-MM-DD as local date to avoid timezone shifts", () => {
    const tx: any = { rowId: 1, rawDate: "2026-03-01", amount: 100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] };
    expect(getTransactionMonthKey(tx)).toBe("March 2026");
  });

  // --- recalculateSummariesForMonths ---
  test("recalculateSummariesForMonths updates only the requested months", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-02-15", amount: -200, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
      { rowId: 3, rawDate: "2026-03-15", amount: -300, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    ];
    const existing = [
      { monthYear: "January 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: -100, nonFreqExpense: 0, totalExpense: -100, netMonthly: -100, netNoFreq: -100 },
      { monthYear: "February 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: -200, nonFreqExpense: 0, totalExpense: -200, netMonthly: -200, netNoFreq: -200 },
      { monthYear: "March 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: -300, nonFreqExpense: 0, totalExpense: -300, netMonthly: -300, netNoFreq: -300 },
    ];
    const next = recalculateSummariesForMonths(transactions as any, {}, ["February 2026"], existing);
    expect(next.length).toBe(3);
    expect(next.find((row) => row.monthYear === "January 2026")!.freqExpense).toBe(-100);
    expect(next.find((row) => row.monthYear === "February 2026")!.nonFreqExpense).toBe(-200);
    expect(next.find((row) => row.monthYear === "March 2026")!.freqExpense).toBe(-300);
  });

  test("recalculateSummariesForMonths appends new months not in existing", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-04-15", amount: -400, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    ];
    const existing = [
      { monthYear: "January 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: -100, nonFreqExpense: 0, totalExpense: -100, netMonthly: -100, netNoFreq: -100 },
    ];
    const next = recalculateSummariesForMonths(transactions as any, {}, ["April 2026"], existing);
    expect(next.length).toBe(2);
    expect(next[0].monthYear).toBe("January 2026");
    expect(next[1].monthYear).toBe("April 2026");
    expect(next[1].nonFreqExpense).toBe(-400);
  });

  test("recalculateSummariesForMonths returns existing when no months requested", () => {
    const existing = [
      { monthYear: "January 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: -100, nonFreqExpense: 0, totalExpense: -100, netMonthly: -100, netNoFreq: -100 },
    ];
    expect(recalculateSummariesForMonths([], {}, [], existing)).toBe(existing);
  });

  test("recalculateSummariesForMonths moves a transaction between months correctly", () => {
    const editedTransactions = [
      { rowId: 1, rawDate: "2026-03-01", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    ];
    const original = [
      { monthYear: "February 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: 0, nonFreqExpense: -100, totalExpense: -100, netMonthly: -100, netNoFreq: -100 },
    ];
    const next = recalculateSummariesForMonths(editedTransactions as any, {}, ["February 2026", "March 2026"], original);
    expect(next.find((row) => row.monthYear === "February 2026")!.nonFreqExpense).toBe(0);
    expect(next.find((row) => row.monthYear === "March 2026")!.nonFreqExpense).toBe(-100);
  });

  // --- uniqueMonthKeys ---
  test("uniqueMonthKeys deduplicates month keys across many transactions", () => {
    const transactions = [
      { rowId: 1, rawDate: "2026-01-15", amount: 1, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
      { rowId: 2, rawDate: "2026-01-20", amount: 2, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
      { rowId: 3, rawDate: "2026-02-15", amount: 3, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    ];
    const keys = uniqueMonthKeys(transactions as any);
    expect(keys.sort()).toEqual(["February 2026", "January 2026"]);
  });

  // --- normalizeDraftAmount (line items) ---
  test("normalizeDraftAmount sums line items", () => {
    const draft = {
      amount: "", detail: "test", type: "INGRESO NO FRECUENTE", date: "2026-01-15",
      lineItems: [
        { id: "li-1", amount: "100", description: "A", tags: [] },
        { id: "li-2", amount: "50", description: "B", tags: [] },
      ],
    };
    expect(normalizeDraftAmount(draft as any)).toBe(150);
  });

  test("normalizeDraftAmount handles income line items", () => {
    const draft = {
      amount: "", detail: "test", type: "INGRESO NO FRECUENTE", date: "2026-01-15",
      lineItems: [{ id: "li-1", amount: "100", description: "A", tags: [] }],
    };
    expect(normalizeDraftAmount(draft as any)).toBe(100);
  });

  test("normalizeDraftAmount uses draft.amount when no lineItems", () => {
    const draft = { amount: "100", detail: "test", type: "GASTO FRECUENTE", date: "2026-01-15" };
    expect(normalizeDraftAmount(draft as any)).toBe(-100);
  });

  // --- isValidTransactionDraft (line items) ---
  test("isValidTransactionDraft validates line items", () => {
    const base = {
      date: "2026-01-15", amount: "", detail: "", type: "GASTO NO FRECUENTE",
      lineItems: [
        { id: "li-1", amount: "-100", description: "A", tags: [] },
        { id: "li-2", amount: "-50", description: "B", tags: [] },
      ],
      tags: [],
    };
    expect(isValidTransactionDraft(base as any)).toBe(true);
    // Con magnitudes sin signo, INGRESO con "-100" también es válido (se normaliza a +100)
    expect(isValidTransactionDraft({ ...base, type: "INGRESO NO FRECUENTE" } as any)).toBe(true);
    expect(isValidTransactionDraft({ ...base, lineItems: [{ id: "li-1", amount: "", description: "A", tags: [] }] } as any)).toBe(false);
    expect(isValidTransactionDraft({ ...base, lineItems: [{ id: "li-1", amount: "0", description: "A", tags: [] }] } as any)).toBe(false);
  });

  test("isValidTransactionDraft rejects expense line items with positive total", () => {
    const draft = {
      date: "2026-01-15", amount: "", detail: "", type: "GASTO NO FRECUENTE",
      lineItems: [{ id: "li-1", amount: "=100", description: "A", tags: [] }],
    };
    // Ahora con flujo sin signo, "=100" para gasto es válido (magnitud 100 -> -100)
    expect(isValidTransactionDraft(draft as any)).toBe(true);
  });

  // --- buildTransactionFromDraft (line items) ---
  test("buildTransactionFromDraft with line items creates transaction correctly", () => {
    const draft = {
      date: "2026-01-15", amount: "", detail: "", type: "GASTO NO FRECUENTE", tags: [],
      lineItems: [
        { id: "li-1", amount: "-100", description: "Comida", tags: ["tag1"] },
        { id: "li-2", amount: "-50", description: "Delivery", tags: ["tag2"] },
      ],
    };
    const tx = buildTransactionFromDraft(draft as any, 2);
    expect(tx.amount).toBe(-150);
    expect(tx.detail).toBe("Comida, Delivery");
    expect(tx.lineItems).toBeTruthy();
    expect(tx.lineItems!.length).toBe(2);
    expect(tx.tags).toEqual(["tag1", "tag2"]);
  });

  test("buildTransactionFromDraft with concepto prefixes detail", () => {
    const draft = {
      date: "2026-01-15", amount: "", detail: "", type: "GASTO NO FRECUENTE", tags: [],
      concepto: "Cena",
      lineItems: [{ id: "li-1", amount: "-30", description: "Pizza", tags: [] }],
    };
    const tx = buildTransactionFromDraft(draft as any, 2);
    expect(tx.detail).toBe("Cena: Pizza");
  });

  test("buildTransactionFromDraft with line items strips formula correctly", () => {
    const draft = {
      date: "2026-01-15", amount: "", detail: "", type: "INGRESO NO FRECUENTE", tags: [],
      lineItems: [{ id: "li-1", amount: "=10+20", description: "Math", tags: [] }],
    };
    const tx = buildTransactionFromDraft(draft as any, 2);
    expect(tx.amount).toBe(30);
    expect(tx.lineItems![0].formula).toBe("10+20");
  });

  test("buildTransactionFromDraft with line items throws on empty items", () => {
    const draft = {
      date: "2026-01-15", amount: "", detail: "", type: "GASTO NO FRECUENTE", tags: [],
      lineItems: [{ id: "li-1", amount: "", description: "", tags: [] }],
    };
    expect(() => buildTransactionFromDraft(draft as any, 2)).toThrow(/Invalid transaction draft/);
  });

  // --- getTransactionMonthKey edge cases ---
  test("getTransactionMonthKey parses non-ISO rawDate via parseLocalDate fallback", () => {
    const tx: any = {
      rowId: 1, amount: 100, detail: "x", type: "GASTO NO FRECUENTE",
      rawDate: "Jan 15 2026",
    };
    expect(getTransactionMonthKey(tx)).toBe("January 2026");
  });

  // --- insertChronologically edge cases ---
  test("insertChronologically resolves ties by rowId", () => {
    const existing = [
      { rowId: 2, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", createdAt: "", rawDateMs: 1736899200000, createdAtMs: 0 },
      { rowId: 3, rawDate: "2026-01-15T00:00:00.000Z", amount: -50, detail: "B", type: "GASTO NO FRECUENTE", createdAt: "", rawDateMs: 1736899200000, createdAtMs: 0 },
    ];
    const newTx = { rowId: 99, rawDate: "2026-01-15T00:00:00.000Z", amount: -30, detail: "C", type: "GASTO FRECUENTE", createdAt: "", rawDateMs: 1736899200000, createdAtMs: 0 };
    const result = insertChronologically(existing as any, newTx as any);
    expect(result.map((r) => r.detail)).toEqual(["A", "B", "C"]);
    expect(result.map((r) => r.rowId)).toEqual([2, 3, 4]);
  });

  // --- aggregateExpensesByTag ---
  test("aggregateExpensesByTag returns empty array for empty transactions", () => {
    expect(aggregateExpensesByTag([], {}, [], "#888", "Otros")).toEqual([]);
  });

  test("aggregateExpensesByTag returns empty array when no expense transactions", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: 100, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
    ];
    expect(aggregateExpensesByTag(txs as any, {}, [], "#888", "Otros")).toEqual([]);
  });

  test("aggregateExpensesByTag aggregates expenses by tag from direct tags", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: ["default-comida"] },
      { rowId: 2, rawDate: "2026-01-16", amount: -50, detail: "x", type: "GASTO FRECUENTE", tags: ["default-salud"] },
      { rowId: 3, rawDate: "2026-01-17", amount: -30, detail: "x", type: "GASTO NO FRECUENTE", tags: ["default-comida"] },
    ];
    const tagColorMap = { "default-comida": "#f59e0b", "default-salud": "#f43f5e" };
    const tagsList = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
    ];
    const result = aggregateExpensesByTag(txs as any, tagColorMap, tagsList, "#888", "Otros");
    expect(result.length).toBe(2);
    const comida = result.find((s) => s.label === "Comida");
    const salud = result.find((s) => s.label === "Salud");
    expect(comida).toBeTruthy();
    expect(salud).toBeTruthy();
    expect(comida!.value).toBe(130);
    expect(salud!.value).toBe(50);
    expect(Math.round(comida!.percentage + salud!.percentage)).toBe(100);
  });

  test("aggregateExpensesByTag handles untagged expenses as 'Otros'", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: ["default-comida"] },
      { rowId: 2, rawDate: "2026-01-16", amount: -50, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    ];
    const tagColorMap = { "default-comida": "#f59e0b" };
    const tagsList = [{ id: "default-comida", label: "Comida", color: "#f59e0b" }];
    const result = aggregateExpensesByTag(txs as any, tagColorMap, tagsList, "#888", "Otros");
    expect(result.length).toBe(2);
    const otros = result.find((s) => s.label === "Otros");
    expect(otros).toBeTruthy();
    expect(otros!.value).toBe(50);
  });

  test("aggregateExpensesByTag aggregates expenses from lineItems with multiple tags", () => {
    const txs = [
      {
        rowId: 1, rawDate: "2026-01-15", amount: -150, detail: "x", type: "GASTO NO FRECUENTE", tags: [],
        lineItems: [
          { id: "li1", amount: -100, description: "A", tags: ["default-comida"] },
          { id: "li2", amount: -50, description: "B", tags: ["default-salud", "default-transporte"] },
        ],
      },
    ];
    const tagColorMap = { "default-comida": "#f59e0b", "default-salud": "#f43f5e", "default-transporte": "#10b981" };
    const tagsList = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
      { id: "default-transporte", label: "Transporte", color: "#10b981" },
    ];
    const result = aggregateExpensesByTag(txs as any, tagColorMap, tagsList, "#888", "Otros");
    expect(result.length).toBe(3);
    expect(result.find((s) => s.label === "Comida")!.value).toBe(100);
    expect(result.find((s) => s.label === "Salud")!.value).toBe(50);
    expect(result.find((s) => s.label === "Transporte")!.value).toBe(50);
  });

  test("aggregateExpensesByTag handles empty tagColorMap gracefully", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: ["custom-unknown"] },
    ];
    const result = aggregateExpensesByTag(txs as any, {}, [], "#888", "Otros");
    expect(result.length).toBe(1);
    expect(result[0].color).toBe("#888");
  });

  test("aggregateExpensesByTag with zero-value line items ignores them", () => {
    const txs = [
      {
        rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: [],
        lineItems: [
          { id: "li1", amount: 0, description: "A", tags: ["default-comida"] },
          { id: "li2", amount: -100, description: "B", tags: ["default-salud"] },
        ],
      },
    ];
    const tagColorMap = { "default-comida": "#f59e0b", "default-salud": "#f43f5e" };
    const tagsList = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
    ];
    const result = aggregateExpensesByTag(txs as any, tagColorMap, tagsList, "#888", "Otros");
    expect(result.length).toBe(1);
    expect(result[0].label).toBe("Salud");
    expect(result[0].value).toBe(100);
  });

  test("aggregateExpensesByTag sorts slices by value descending", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: -30, detail: "x", type: "GASTO NO FRECUENTE", tags: ["default-salud"] },
      { rowId: 2, rawDate: "2026-01-16", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: ["default-comida"] },
      { rowId: 3, rawDate: "2026-01-17", amount: -60, detail: "x", type: "GASTO NO FRECUENTE", tags: ["default-transporte"] },
    ];
    const tagColorMap = { "default-comida": "#f59e0b", "default-salud": "#f43f5e", "default-transporte": "#10b981" };
    const tagsList = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
      { id: "default-transporte", label: "Transporte", color: "#10b981" },
    ];
    const result = aggregateExpensesByTag(txs as any, tagColorMap, tagsList, "#888", "Otros");
    expect(result[0].label).toBe("Comida");
    expect(result[1].label).toBe("Transporte");
    expect(result[2].label).toBe("Salud");
  });

  // --- aggregateIncomesByTag ---
  test("aggregateIncomesByTag returns empty array for empty transactions", () => {
    expect(aggregateIncomesByTag([], {}, [], "#888", "Otros")).toEqual([]);
  });

  test("aggregateIncomesByTag returns empty array when no income transactions", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO FRECUENTE", tags: ["default-comida"] },
    ];
    expect(aggregateIncomesByTag(txs as any, {}, [], "#888", "Otros")).toEqual([]);
  });

  test("aggregateIncomesByTag aggregates incomes by tag", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: 500, detail: "x", type: "INGRESO FRECUENTE", tags: ["default-salud"] },
      { rowId: 2, rawDate: "2026-01-16", amount: 300, detail: "x", type: "INGRESO NO FRECUENTE", tags: ["default-comida"] },
      { rowId: 3, rawDate: "2026-01-17", amount: 200, detail: "x", type: "INGRESO FRECUENTE", tags: ["default-salud"] },
    ];
    const tagColorMap = { "default-salud": "#f43f5e", "default-comida": "#f59e0b" };
    const tagsList = [
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
    ];
    const result = aggregateIncomesByTag(txs as any, tagColorMap, tagsList, "#888", "Otros");
    expect(result.length).toBe(2);
    expect(result.find((s) => s.label === "Salud")!.value).toBe(700);
    expect(result.find((s) => s.label === "Comida")!.value).toBe(300);
  });

  test("aggregateIncomesByTag handles untagged incomes", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: 100, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
    ];
    const result = aggregateIncomesByTag(txs as any, {}, [], "#888", "Otros");
    expect(result.length).toBe(1);
    expect(result[0].label).toBe("Otros");
  });

  test("aggregateIncomesByTag aggregates from lineItems", () => {
    const txs = [
      { rowId: 1, rawDate: "2026-01-15", amount: 0, detail: "x", type: "INGRESO FRECUENTE", tags: [], lineItems: [
        { id: "1", amount: "200", description: "A", tags: ["default-comida"] },
        { id: "2", amount: "150", description: "B", tags: ["default-salud"] },
      ]},
    ];
    const tagColorMap = { "default-salud": "#f43f5e", "default-comida": "#f59e0b" };
    const tagsList = [
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
    ];
    const result = aggregateIncomesByTag(txs as any, tagColorMap, tagsList, "#888", "Otros");
    expect(result.length).toBe(2);
  });

  // --- groupSummariesByYear ---
  test("groupSummariesByYear returns empty array for empty input", () => {
    expect(groupSummariesByYear([])).toEqual([]);
  });

  test("groupSummariesByYear merges multiple months into one year row", () => {
    const rows = [
      monthRow("January 2025", 1000, 500, -200, -100),
      monthRow("February 2025", 800, 300, -150, -50),
      monthRow("March 2026", 500, 200, -100, -80),
    ];
    const result = groupSummariesByYear(rows);
    expect(result.length).toBe(2);
    const y2025 = result.find((r) => r.monthYear === "Year 2025");
    const y2026 = result.find((r) => r.monthYear === "Year 2026");
    expect(y2025).toBeTruthy();
    expect(y2026).toBeTruthy();
    expect(y2025!.freqIncome).toBe(1800);
    expect(y2025!.nonFreqIncome).toBe(800);
    expect(y2025!.totalIncome).toBe(2600);
    expect(y2025!.freqExpense).toBe(-350);
    expect(y2025!.nonFreqExpense).toBe(-150);
    expect(y2025!.totalExpense).toBe(-500);
    expect(y2025!.netMonthly).toBe(2100);
  });

  test("groupSummariesByYear handles single year", () => {
    const rows = [monthRow("January 2025", 100, 0, -50, 0)];
    const result = groupSummariesByYear(rows);
    expect(result.length).toBe(1);
    expect(result[0].monthYear).toBe("Year 2025");
    expect(result[0].totalIncome).toBe(100);
  });

  test("groupSummariesByYear sorts by year ascending", () => {
    const rows = [
      monthRow("December 2026", 10, 0, 0, 0),
      monthRow("January 2024", 10, 0, 0, 0),
      monthRow("June 2025", 10, 0, 0, 0),
    ];
    const result = groupSummariesByYear(rows);
    expect(result.map((r) => r.monthYear)).toEqual(["Year 2024", "Year 2025", "Year 2026"]);
  });

  // --- detectNonFreqSpike ---
  test("detectNonFreqSpike returns null for empty rows", () => {
    expect(detectNonFreqSpike([])).toBeNull();
  });

  test("detectNonFreqSpike returns null when only one month", () => {
    const rows = [monthRow("January 2026", 0, 0, 0, -500)];
    expect(detectNonFreqSpike(rows)).toBeNull();
  });

  test("detectNonFreqSpike returns null when no spike detected", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, -200),
      monthRow("February 2026", 0, 0, 0, -220),
      monthRow("March 2026", 0, 0, 0, -180),
    ];
    expect(detectNonFreqSpike(rows)).toBeNull();
  });

  test("detectNonFreqSpike detects spike above default threshold", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, -100),
      monthRow("February 2026", 0, 0, 0, -100),
      monthRow("March 2026", 0, 0, 0, -500),
    ];
    const spike = detectNonFreqSpike(rows);
    expect(spike).toBeTruthy();
    expect(spike!.monthYear).toBe("March 2026");
    expect(spike!.amount).toBe(500);
    expect(spike!.avg).toBe(100);
    expect(spike!.ratioPct).toBe(500);
  });

  test("detectNonFreqSpike respects custom threshold", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, -100),
      monthRow("February 2026", 0, 0, 0, -100),
      monthRow("March 2026", 0, 0, 0, -250),
    ];
    expect(detectNonFreqSpike(rows, 1.5)).toBeTruthy();
    expect(detectNonFreqSpike(rows, 3.0)).toBeNull();
  });

  test("detectNonFreqSpike uses last 6 months for lookback", () => {
    const rows: any[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push(monthRow(`${MONTH_NAMES[i % 12]} ${2025 + Math.floor(i / 12)}`, 0, 0, 0, -100));
    }
    rows[9] = monthRow("October 2025", 0, 0, 0, -700);
    const spike = detectNonFreqSpike(rows);
    expect(spike).toBeTruthy();
    expect(spike!.amount).toBe(700);
    expect(spike!.avg).toBe(100);
  });

  test("detectNonFreqSpike returns null when last month has zero non-freq expense", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, -100),
      monthRow("February 2026", 0, 0, 0, 0),
    ];
    expect(detectNonFreqSpike(rows)).toBeNull();
  });

  test("detectNonFreqSpike returns null when average is zero", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, 0),
      monthRow("February 2026", 0, 0, 0, -500),
    ];
    expect(detectNonFreqSpike(rows)).toBeNull();
  });

  // --- computeSavingsLinePoints ---
  test("computeSavingsLinePoints returns empty array for empty input", () => {
    expect(computeSavingsLinePoints([], "income", 158, 126)).toEqual([]);
    expect(computeSavingsLinePoints([], "expense", 158, 126)).toEqual([]);
  });

  test("computeSavingsLinePoints income mode uses scale against max", () => {
    const rows = [
      monthRow("January 2026", 100, 0, 0, 0),
      monthRow("February 2026", 500, 0, 0, 0),
      monthRow("March 2026", 1000, 0, 0, 0),
    ];
    const points = computeSavingsLinePoints(rows, "income", 158, 126);
    expect(points.length).toBe(3);
    expect(points[0].y).toBeGreaterThan(points[2].y);
    expect(points[1].y).toBeGreaterThan(points[2].y);
    expect(points[2].y).toBe(158 - 126);
  });

  test("computeSavingsLinePoints expense mode uses scale against max", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, -200),
      monthRow("February 2026", 0, 0, 0, -800),
    ];
    const points = computeSavingsLinePoints(rows, "expense", 158, 126);
    expect(points.length).toBe(2);
    expect(points[1].y).toBe(158 - 126);
    expect(points[0].y).toBeGreaterThan(points[1].y);
  });

  test("computeSavingsLinePoints handles all-zero rows gracefully", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, 0),
      monthRow("February 2026", 0, 0, 0, 0),
    ];
    const points = computeSavingsLinePoints(rows, "income", 158, 126);
    expect(points.length).toBe(2);
    expect(points[0].y).toBe(158);
    expect(points[1].y).toBe(158);
  });

  test("computeSavingsLinePoints net mode orders by netMonthly", () => {
    const rows = [
      monthRow("January 2026", 100, 0, 0, 0),
      monthRow("February 2026", 500, 0, 0, -100),
      monthRow("March 2026", 1000, 0, 0, 0),
    ];
    const points = computeSavingsLinePoints(rows, "net", 158, 126);
    expect(points.length).toBe(3);
    expect(points[0].y).toBeGreaterThan(points[2].y);
    expect(points[2].y).toBe(158 - 126);
  });

  test("computeSavingsLinePoints net mode puts negatives below zero line", () => {
    const rows = [
      monthRow("January 2026", 500, 0, 0, 0),
      monthRow("February 2026", 0, 0, 0, -500),
    ];
    const points = computeSavingsLinePoints(rows, "net", 158, 126);
    expect(points.length).toBe(2);
    // min = -500, max = 500 -> cero al medio (158 - 63)
    expect(points[0].y).toBeLessThan(158 - 63);
    expect(points[1].y).toBeGreaterThan(158 - 63);
  });

  test("computeSavingsLinePoints net mode handles all-negative rows", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, -100),
      monthRow("February 2026", 0, 0, 0, -500),
    ];
    const points = computeSavingsLinePoints(rows, "net", 158, 126);
    expect(points.length).toBe(2);
    // cero arriba, el menos negativo mas alto que el mas negativo
    expect(points[0].y).toBeLessThan(points[1].y);
    expect(points[1].y).toBe(158);
  });

  test("computeSavingsLinePoints net mode handles all-zero rows", () => {
    const rows = [
      monthRow("January 2026", 0, 0, 0, 0),
      monthRow("February 2026", 0, 0, 0, 0),
    ];
    const points = computeSavingsLinePoints(rows, "net", 158, 126);
    expect(points.length).toBe(2);
    expect(points[0].y).toBe(158);
    expect(points[1].y).toBe(158);
  });

  function monthRow(monthYear: string, freqInc: number, nonFreqInc: number, freqExp: number, nonFreqExp: number) {
    const totalInc = freqInc + nonFreqInc;
    const totalExp = freqExp + nonFreqExp;
    return {
      monthYear,
      freqIncome: freqInc,
      nonFreqIncome: nonFreqInc,
      totalIncome: totalInc,
      freqExpense: freqExp,
      nonFreqExpense: nonFreqExp,
      totalExpense: totalExp,
      netMonthly: totalInc + totalExp,
      netNoFreq: totalInc + totalExp - freqInc,
    };
  }
});
