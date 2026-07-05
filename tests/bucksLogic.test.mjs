import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const {
  formatMoney,
  buildTransactionFromDraft,
  isValidTransactionDraft,
  insertChronologically,
  applySearch,
  calculateSummaries,
  calculateMonthSummary,
  getTransactionMonthKey,
  recalculateSummariesForMonths,
  uniqueMonthKeys,
  aggregateExpensesByTag,
  aggregateIncomesByTag,
  groupSummariesByYear,
  detectNonFreqSpike,
  computeSavingsLinePoints,
  formatDateToISO,
  formatDateForSheet,
  parseSpanishDate,
  getMonthYear,
  normalizeAmountExpression,
  calculateExpression,
  normalizeDraftAmount,
  SHEET_NAMES,
  TRANSACTION_TYPES,
  MONTH_NAMES,
} = await import("../src/domain/bucksLogic.ts");

// --- formatMoney ---
test("formatMoney formats positive income with explicit plus sign", () => {
  assert.equal(formatMoney(100, "S/"), "+ S/ 100.00");
  assert.equal(formatMoney(50.5, "$", 2), "+ $ 50.50");
});

test("formatMoney formats negative expenses with explicit minus sign", () => {
  assert.equal(formatMoney(-100, "S/"), "- S/ 100.00");
  assert.equal(formatMoney(-50.5, "€", 2), "- € 50.50");
});

test("formatMoney handles zero and custom decimals", () => {
  assert.equal(formatMoney(0, "S/"), "+ S/ 0.00");
  assert.equal(formatMoney(100, "$", 0), "+ $ 100");
  assert.equal(formatMoney(100.123, "€", 3), "+ € 100.123");
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
  const tx = buildTransactionFromDraft(draft, 2);
  assert.equal(tx.rowId, 2);
  assert.equal(tx.amount, 100);
  assert.equal(tx.detail, "Sueldo");
  assert.equal(tx.type, "INGRESO FRECUENTE");
  assert.ok(tx.rawDate.startsWith("2026-01-15"));
  assert.ok(tx.createdAt);
  assert.deepEqual(tx.tags, []);
});

test("buildTransactionFromDraft creates expense with negative amount", () => {
  const draft = {
    date: "2026-01-15",
    amount: "-50",
    detail: "Comida",
    type: "GASTO NO FRECUENTE",
    tags: ["Comida"],
  };
  const tx = buildTransactionFromDraft(draft, 3);
  assert.equal(tx.rowId, 3);
  assert.equal(tx.amount, -50);
  assert.equal(tx.detail, "Comida");
  assert.equal(tx.type, "GASTO NO FRECUENTE");
});

test("buildTransactionFromDraft evaluates math expressions with equals sign", () => {
  const draft = {
    date: "2026-01-15",
    amount: "=10+20",
    detail: "Operacion",
    type: "INGRESO NO FRECUENTE",
  };
  const tx = buildTransactionFromDraft(draft, 4);
  assert.equal(tx.amount, 30);
  assert.equal(tx.formula, "10+20");
});

test("buildTransactionFromDraft preserves createdAt if provided", () => {
  const draft = {
    date: "2026-01-15",
    amount: "100",
    detail: "Test",
    type: "INGRESO FRECUENTE",
    createdAt: "2026-01-14T10:00:00.000Z",
  };
  const tx = buildTransactionFromDraft(draft, 5);
  assert.equal(tx.createdAt, "2026-01-14T10:00:00.000Z");
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
  const income = buildTransactionFromDraft(incomeDraft, 2);
  const expense = buildTransactionFromDraft(expenseDraft, 3);

  assert.equal(income.amount, 100);
  assert.equal(expense.amount, -100);
  assert.throws(() => buildTransactionFromDraft({ ...incomeDraft, amount: "-100" }, 4), /Invalid transaction draft/);
  assert.throws(() => buildTransactionFromDraft({ ...expenseDraft, amount: "100" }, 5), /Invalid transaction draft/);
});

test("transaction draft validation rejects zero, bad dates, and empty details", () => {
  const valid = {
    date: "2026-01-15",
    amount: "-100",
    detail: "Comida",
    type: "GASTO NO FRECUENTE",
  };

  assert.equal(isValidTransactionDraft(valid), true);
  assert.equal(isValidTransactionDraft({ ...valid, amount: "100" }), false);
  assert.equal(isValidTransactionDraft({ ...valid, type: "INGRESO NO FRECUENTE" }), false);
  assert.equal(isValidTransactionDraft({ ...valid, amount: "0" }), false);
  assert.equal(isValidTransactionDraft({ ...valid, amount: "10-10" }), false);
  assert.equal(isValidTransactionDraft({ ...valid, date: "fecha" }), false);
  assert.equal(isValidTransactionDraft({ ...valid, date: "2026-02-31" }), false);
  assert.equal(isValidTransactionDraft({ ...valid, detail: " " }), false);
  assert.throws(() => buildTransactionFromDraft({ ...valid, amount: "0" }, 4), /Invalid transaction draft/);
});

// --- insertChronologically ---
test("insertChronologically inserts in correct date order", () => {
  const existing = [
    {
      rowId: 2,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 100,
      detail: "A",
      type: "INGRESO FRECUENTE",
      createdAt: "",
    },
    {
      rowId: 3,
      rawDate: "2026-01-17T00:00:00.000Z",
      amount: -50,
      detail: "B",
      type: "GASTO NO FRECUENTE",
      createdAt: "",
    },
  ];
  const newTx = {
    rowId: 99,
    rawDate: "2026-01-16T00:00:00.000Z",
    amount: -30,
    detail: "C",
    type: "GASTO FRECUENTE",
    createdAt: "",
  };
  const result = insertChronologically(existing, newTx);
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((r) => r.detail),
    ["A", "C", "B"],
  );
  assert.deepEqual(
    result.map((r) => r.rowId),
    [2, 3, 4],
  );
});

test("insertChronologically appends at end if newest", () => {
  const existing = [
    {
      rowId: 2,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 100,
      detail: "A",
      type: "INGRESO FRECUENTE",
      createdAt: "",
    },
  ];
  const newTx = {
    rowId: 99,
    rawDate: "2026-01-20T00:00:00.000Z",
    amount: -30,
    detail: "B",
    type: "GASTO FRECUENTE",
    createdAt: "",
  };
  const result = insertChronologically(existing, newTx);
  assert.deepEqual(
    result.map((r) => r.detail),
    ["A", "B"],
  );
  assert.deepEqual(
    result.map((r) => r.rowId),
    [2, 3],
  );
});

test("insertChronologically prepends at start if oldest", () => {
  const existing = [
    {
      rowId: 2,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 100,
      detail: "A",
      type: "INGRESO FRECUENTE",
      createdAt: "",
    },
  ];
  const newTx = {
    rowId: 99,
    rawDate: "2026-01-10T00:00:00.000Z",
    amount: -30,
    detail: "B",
    type: "GASTO FRECUENTE",
    createdAt: "",
  };
  const result = insertChronologically(existing, newTx);
  assert.deepEqual(
    result.map((r) => r.detail),
    ["B", "A"],
  );
  assert.deepEqual(
    result.map((r) => r.rowId),
    [2, 3],
  );
});

// --- applySearch ---
test("applySearch filters by text in detail", () => {
  const transactions = [
    {
      rowId: 1,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 100,
      detail: "Sueldo enero",
      type: "INGRESO FRECUENTE",
      tags: [],
    },
    {
      rowId: 2,
      rawDate: "2026-01-16T00:00:00.000Z",
      amount: -50,
      detail: "Comida restaurante",
      type: "GASTO NO FRECUENTE",
      tags: ["Comida"],
    },
  ];
  const result = applySearch(transactions, {
    text: "comida",
    tag: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].detail, "Comida restaurante");
});

test("applySearch filters by tag", () => {
  const transactions = [
    {
      rowId: 1,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 100,
      detail: "Sueldo",
      type: "INGRESO FRECUENTE",
      tags: ["Trabajo"],
    },
    {
      rowId: 2,
      rawDate: "2026-01-16T00:00:00.000Z",
      amount: -50,
      detail: "Comida",
      type: "GASTO NO FRECUENTE",
      tags: ["Comida"],
    },
  ];
  const result = applySearch(transactions, {
    text: "",
    tag: "Comida",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].tags[0], "Comida");
});

test("applySearch filters by amount range", () => {
  const transactions = [
    {
      rowId: 1,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 100,
      detail: "A",
      type: "INGRESO FRECUENTE",
      tags: [],
    },
    {
      rowId: 2,
      rawDate: "2026-01-16T00:00:00.000Z",
      amount: -50,
      detail: "B",
      type: "GASTO NO FRECUENTE",
      tags: [],
    },
    {
      rowId: 3,
      rawDate: "2026-01-17T00:00:00.000Z",
      amount: -200,
      detail: "C",
      type: "GASTO FRECUENTE",
      tags: [],
    },
  ];
  const result = applySearch(transactions, {
    text: "",
    tag: "",
    minAmount: "60",
    maxAmount: "150",
    startDate: "",
    endDate: "",
  });
  assert.equal(result.length, 1);
  assert.deepEqual(
    result.map((r) => r.rowId),
    [1],
  );
});

test("applySearch filters by date range", () => {
  const transactions = [
    {
      rowId: 1,
      rawDate: "2026-01-10T00:00:00.000Z",
      amount: 100,
      detail: "A",
      type: "INGRESO FRECUENTE",
      tags: [],
    },
    {
      rowId: 2,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: -50,
      detail: "B",
      type: "GASTO NO FRECUENTE",
      tags: [],
    },
    {
      rowId: 3,
      rawDate: "2026-01-20T00:00:00.000Z",
      amount: -200,
      detail: "C",
      type: "GASTO FRECUENTE",
      tags: [],
    },
  ];
  const result = applySearch(transactions, {
    text: "",
    tag: "",
    minAmount: "",
    maxAmount: "",
    startDate: "2026-01-12",
    endDate: "2026-01-18",
  });
  assert.equal(result.length, 1);
  assert.equal(result[0].rowId, 2);
});

test("applySearch limits results to 150", () => {
  const transactions = Array.from({ length: 200 }, (_, i) => ({
    rowId: i + 1,
    rawDate: `2026-01-${String((i % 28) + 1).padStart(2, "0")}T00:00:00.000Z`,
    amount: -i,
    detail: `Tx ${i}`,
    type: "GASTO NO FRECUENTE",
    tags: [],
  }));
  const result = applySearch(transactions, {
    text: "",
    tag: "",
    minAmount: "",
    maxAmount: "",
    startDate: "",
    endDate: "",
  });
  assert.equal(result.length, 150);
});

// --- calculateSummaries ---
test("calculateSummaries aggregates transactions by month", () => {
  const transactions = [
    {
      rowId: 1,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 1000,
      detail: "Sueldo",
      type: "INGRESO FRECUENTE",
      tags: [],
    },
    {
      rowId: 2,
      rawDate: "2026-01-16T00:00:00.000Z",
      amount: 500,
      detail: "Bono",
      type: "INGRESO NO FRECUENTE",
      tags: [],
    },
    {
      rowId: 3,
      rawDate: "2026-01-17T00:00:00.000Z",
      amount: -200,
      detail: "Alquiler",
      type: "GASTO FRECUENTE",
      tags: [],
    },
    {
      rowId: 4,
      rawDate: "2026-01-18T00:00:00.000Z",
      amount: -100,
      detail: "Comida",
      type: "GASTO NO FRECUENTE",
      tags: [],
    },
  ];
  const freqIncome = { "January 2026": 1000 };
  const result = calculateSummaries(transactions, freqIncome);
  assert.equal(result.length, 1);
  const row = result[0];
  assert.equal(row.monthYear, "January 2026");
  assert.equal(row.freqIncome, 1000);
  assert.equal(row.nonFreqIncome, 500);
  assert.equal(row.totalIncome, 1500);
  assert.equal(row.freqExpense, -200);
  assert.equal(row.nonFreqExpense, -100);
  assert.equal(row.totalExpense, -300);
  assert.equal(row.netMonthly, 1200);
  assert.equal(row.netNoFreq, 200);
});

test("calculateSummaries includes months with only freqIncome", () => {
  const transactions = [];
  const freqIncome = { "February 2026": 800 };
  const result = calculateSummaries(transactions, freqIncome);
  assert.equal(result.length, 1);
  assert.equal(result[0].monthYear, "February 2026");
  assert.equal(result[0].freqIncome, 800);
  assert.equal(result[0].netMonthly, 800);
});

test("calculateSummaries counts directly added frequent income", () => {
  const result = calculateSummaries([{
    rowId: 1,
    rawDate: "2026-02-10T00:00:00.000Z",
    amount: 900,
    detail: "Sueldo",
    type: "INGRESO FRECUENTE",
    tags: [],
  }], {});
  assert.equal(result[0].freqIncome, 900);
  assert.equal(result[0].totalIncome, 900);
});

test("calculateSummaries sorts months chronologically", () => {
  const transactions = [
    {
      rowId: 1,
      rawDate: "2026-03-15T00:00:00.000Z",
      amount: 100,
      detail: "A",
      type: "INGRESO NO FRECUENTE",
      tags: [],
    },
    {
      rowId: 2,
      rawDate: "2026-01-15T00:00:00.000Z",
      amount: 200,
      detail: "B",
      type: "INGRESO NO FRECUENTE",
      tags: [],
    },
    {
      rowId: 3,
      rawDate: "2026-02-15T00:00:00.000Z",
      amount: 300,
      detail: "C",
      type: "INGRESO NO FRECUENTE",
      tags: [],
    },
  ];
  const result = calculateSummaries(transactions, {});
  assert.equal(result.length, 3);
  assert.deepEqual(
    result.map((r) => r.monthYear),
    ["January 2026", "February 2026", "March 2026"],
  );
});

// --- Helper functions ---
test("formatDateToISO converts Date to YYYY-MM-DD", () => {
  const date = new Date("2026-01-15T10:00:00.000Z");
  assert.equal(formatDateToISO(date), "2026-01-15");
  assert.equal(formatDateToISO("2026-01-15T10:00:00.000Z"), "2026-01-15");
  assert.equal(formatDateToISO("invalid"), "");
});

test("formatDateForSheet formats as DD-mmm-YY", () => {
  const date = new Date(2026, 0, 15);
  assert.equal(formatDateForSheet(date), "15-jan-26");
  const date2 = new Date(2026, 5, 20);
  assert.equal(formatDateForSheet(date2), "20-jun-26");
});

test("parseSpanishDate parses DD-mmm-YY format", () => {
  const date = parseSpanishDate("15-jan-26");
  assert.ok(date);
  assert.equal(date.getFullYear(), 2026);
  assert.equal(date.getMonth(), 0);
  assert.equal(date.getDate(), 15);

  assert.equal(parseSpanishDate("invalid"), null);
  assert.equal(parseSpanishDate("15-xxx-26"), null);
});

test("parseSpanishDate rejects impossible calendar dates", () => {
  assert.equal(parseSpanishDate("31-feb-26"), null);
  assert.equal(parseSpanishDate("00-jan-26"), null);
  assert.equal(parseSpanishDate("texto"), null);
});

test("getMonthYear returns Month Year string", () => {
  const date = new Date("2026-01-15T00:00:00.000Z");
  assert.equal(getMonthYear(date), "January 2026");
  const date2 = new Date("2026-12-25T00:00:00.000Z");
  assert.equal(getMonthYear(date2), "December 2026");
});

test("normalizeAmountExpression removes equals prefix", () => {
  assert.equal(normalizeAmountExpression("=10+20"), "10+20");
  assert.equal(normalizeAmountExpression("100"), "100");
  assert.equal(normalizeAmountExpression("  =50  "), "50");
});

test("calculateExpression evaluates math expressions", () => {
  assert.equal(calculateExpression("10+20"), 30);
  assert.equal(calculateExpression("100-30"), 70);
  assert.equal(calculateExpression("5*4"), 20);
  assert.equal(calculateExpression("100/4"), 25);
  assert.equal(calculateExpression("(10+5)*2"), 30);
  assert.equal(calculateExpression("invalid"), 0);
  assert.equal(calculateExpression(""), 0);
});

test("calculateExpression returns zero for empty, invalid, or non-finite expressions", () => {
  assert.equal(calculateExpression("("), 0);
  assert.equal(calculateExpression("1/0"), 0);
});

// --- Constants ---
test("SHEET_NAMES exports correct sheet names", () => {
  assert.equal(SHEET_NAMES.transactions, "INCOME AND EXPENSES");
  assert.equal(SHEET_NAMES.summary, "MONTHLY SUMMARY");
});

test("TRANSACTION_TYPES exports all four types", () => {
  assert.deepEqual(TRANSACTION_TYPES, [
    "INGRESO FRECUENTE",
    "INGRESO NO FRECUENTE",
    "GASTO FRECUENTE",
    "GASTO NO FRECUENTE",
  ]);
});

test("MONTH_NAMES exports all twelve months in English", () => {
  assert.equal(MONTH_NAMES.length, 12);
  assert.equal(MONTH_NAMES[0], "January");
  assert.equal(MONTH_NAMES[11], "December");
});

// --- calculateMonthSummary ---
test("calculateMonthSummary sums all four transaction types", () => {
  const transactions = [
    { rowId: 1, rawDate: "2026-01-15", amount: 1000, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
    { rowId: 2, rawDate: "2026-01-16", amount: 500, detail: "x", type: "INGRESO NO FRECUENTE", tags: [] },
    { rowId: 3, rawDate: "2026-01-17", amount: -200, detail: "x", type: "GASTO FRECUENTE", tags: [] },
    { rowId: 4, rawDate: "2026-01-18", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
  ];
  const row = calculateMonthSummary(transactions, {}, "January 2026");
  assert.equal(row.monthYear, "January 2026");
  assert.equal(row.freqIncome, 1000);
  assert.equal(row.nonFreqIncome, 500);
  assert.equal(row.totalIncome, 1500);
  assert.equal(row.freqExpense, -200);
  assert.equal(row.nonFreqExpense, -100);
  assert.equal(row.totalExpense, -300);
  assert.equal(row.netMonthly, 1200);
  assert.equal(row.netNoFreq, 200);
});

test("calculateMonthSummary falls back to freqIncomeByMonth when no transactions contribute", () => {
  const row = calculateMonthSummary([], { "February 2026": 800 }, "February 2026");
  assert.equal(row.freqIncome, 800);
  assert.equal(row.nonFreqIncome, 0);
  assert.equal(row.netNoFreq, 0);
});

test("calculateMonthSummary prefers transactions over freqIncomeByMonth when both exist", () => {
  const transactions = [
    { rowId: 1, rawDate: "2026-01-15", amount: 500, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
  ];
  const row = calculateMonthSummary(transactions, { "January 2026": 999 }, "January 2026");
  assert.equal(row.freqIncome, 500);
});

// --- getTransactionMonthKey ---
test("getTransactionMonthKey returns the Spanish month name and year", () => {
  const tx = { rowId: 1, rawDate: "2026-03-15", amount: 100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] };
  assert.equal(getTransactionMonthKey(tx), "March 2026");
});

test("getTransactionMonthKey prefers rawDateMs when present", () => {
  const date = new Date(2024, 6, 4);
  const tx = {
    rowId: 1,
    rawDate: "1999-01-01",
    rawDateMs: date.getTime(),
    amount: 100,
    detail: "x",
    type: "GASTO NO FRECUENTE",
    tags: [],
  };
  assert.equal(getTransactionMonthKey(tx), "July 2024");
});

test("getTransactionMonthKey parses YYYY-MM-DD as local date to avoid timezone shifts", () => {
  const tx = { rowId: 1, rawDate: "2026-03-01", amount: 100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] };
  assert.equal(getTransactionMonthKey(tx), "March 2026");
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
  const next = recalculateSummariesForMonths(
    transactions,
    {},
    ["February 2026"],
    existing,
  );
  assert.equal(next.length, 3);
  assert.equal(next.find((row) => row.monthYear === "January 2026").freqExpense, -100);
  assert.equal(next.find((row) => row.monthYear === "February 2026").nonFreqExpense, -200);
  assert.equal(next.find((row) => row.monthYear === "March 2026").freqExpense, -300);
});

test("recalculateSummariesForMonths appends new months not in existing", () => {
  const transactions = [
    { rowId: 1, rawDate: "2026-04-15", amount: -400, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
  ];
  const existing = [
    { monthYear: "January 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: -100, nonFreqExpense: 0, totalExpense: -100, netMonthly: -100, netNoFreq: -100 },
  ];
  const next = recalculateSummariesForMonths(transactions, {}, ["April 2026"], existing);
  assert.equal(next.length, 2);
  assert.equal(next[0].monthYear, "January 2026");
  assert.equal(next[1].monthYear, "April 2026");
  assert.equal(next[1].nonFreqExpense, -400);
});

test("recalculateSummariesForMonths returns existing when no months requested", () => {
  const existing = [
    { monthYear: "January 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: -100, nonFreqExpense: 0, totalExpense: -100, netMonthly: -100, netNoFreq: -100 },
  ];
  assert.equal(recalculateSummariesForMonths([], {}, [], existing), existing);
});

test("recalculateSummariesForMonths moves a transaction between months correctly", () => {
  const editedTransactions = [
    { rowId: 1, rawDate: "2026-03-01", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
  ];
  const original = [
    { monthYear: "February 2026", freqIncome: 0, nonFreqIncome: 0, totalIncome: 0, freqExpense: 0, nonFreqExpense: -100, totalExpense: -100, netMonthly: -100, netNoFreq: -100 },
  ];
  const next = recalculateSummariesForMonths(
    editedTransactions,
    {},
    ["February 2026", "March 2026"],
    original,
  );
  assert.equal(next.find((row) => row.monthYear === "February 2026").nonFreqExpense, 0);
  assert.equal(next.find((row) => row.monthYear === "March 2026").nonFreqExpense, -100);
});

// --- uniqueMonthKeys ---
test("uniqueMonthKeys deduplicates month keys across many transactions", () => {
  const transactions = [
    { rowId: 1, rawDate: "2026-01-15", amount: 1, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    { rowId: 2, rawDate: "2026-01-20", amount: 2, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
    { rowId: 3, rawDate: "2026-02-15", amount: 3, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
  ];
  const keys = uniqueMonthKeys(transactions);
  assert.deepEqual(keys.sort(), ["February 2026", "January 2026"]);
});

// --- normalizeDraftAmount (line items) ---
test("normalizeDraftAmount sums line items", () => {
  const draft = {
    amount: "",
    detail: "test",
    type: "INGRESO NO FRECUENTE",
    date: "2026-01-15",
    lineItems: [
      { id: "li-1", amount: "100", description: "A", tags: [] },
      { id: "li-2", amount: "50", description: "B", tags: [] },
    ],
  };
  const amount = normalizeDraftAmount(draft);
  assert.equal(amount, 150);
});

test("normalizeDraftAmount handles income line items", () => {
  const draft = {
    amount: "",
    detail: "test",
    type: "INGRESO NO FRECUENTE",
    date: "2026-01-15",
    lineItems: [
      { id: "li-1", amount: "100", description: "A", tags: [] },
    ],
  };
  assert.equal(normalizeDraftAmount(draft), 100);
});

test("normalizeDraftAmount uses draft.amount when no lineItems", () => {
  const draft = { amount: "100", detail: "test", type: "GASTO FRECUENTE", date: "2026-01-15" };
  assert.equal(normalizeDraftAmount(draft), -100);
});

// --- isValidTransactionDraft (line items) ---
test("isValidTransactionDraft validates line items", () => {
  const base = {
    date: "2026-01-15",
    amount: "",
    detail: "",
    type: "GASTO NO FRECUENTE",
    lineItems: [
      { id: "li-1", amount: "-100", description: "A", tags: [] },
      { id: "li-2", amount: "-50", description: "B", tags: [] },
    ],
    tags: [],
  };
  assert.equal(isValidTransactionDraft(base), true);
  assert.equal(isValidTransactionDraft({ ...base, type: "INGRESO NO FRECUENTE" }), false);
  assert.equal(isValidTransactionDraft({ ...base, lineItems: [{ id: "li-1", amount: "", description: "A", tags: [] }] }), false);
  assert.equal(isValidTransactionDraft({ ...base, lineItems: [{ id: "li-1", amount: "0", description: "A", tags: [] }] }), false);
});

test("isValidTransactionDraft rejects expense line items with positive total", () => {
  const draft = {
    date: "2026-01-15",
    amount: "",
    detail: "",
    type: "GASTO NO FRECUENTE",
    lineItems: [
      { id: "li-1", amount: "=100", description: "A", tags: [] },
    ],
  };
  assert.equal(isValidTransactionDraft(draft), false);
});

// --- buildTransactionFromDraft (line items) ---
test("buildTransactionFromDraft with line items creates transaction correctly", () => {
  const draft = {
    date: "2026-01-15",
    amount: "",
    detail: "",
    type: "GASTO NO FRECUENTE",
    tags: [],
    lineItems: [
      { id: "li-1", amount: "-100", description: "Comida", tags: ["tag1"] },
      { id: "li-2", amount: "-50", description: "Delivery", tags: ["tag2"] },
    ],
  };
  const tx = buildTransactionFromDraft(draft, 2);
  assert.equal(tx.amount, -150);
  assert.equal(tx.detail, "Comida, Delivery");
  assert.ok(tx.lineItems);
  assert.equal(tx.lineItems.length, 2);
  assert.deepEqual(tx.tags, ["tag1", "tag2"]);
});

test("buildTransactionFromDraft with concepto prefixes detail", () => {
  const draft = {
    date: "2026-01-15",
    amount: "",
    detail: "",
    type: "GASTO NO FRECUENTE",
    tags: [],
    concepto: "Cena",
    lineItems: [
      { id: "li-1", amount: "-30", description: "Pizza", tags: [] },
    ],
  };
  const tx = buildTransactionFromDraft(draft, 2);
  assert.equal(tx.detail, "Cena: Pizza");
});

test("buildTransactionFromDraft with line items strips formula correctly", () => {
  const draft = {
    date: "2026-01-15",
    amount: "",
    detail: "",
    type: "INGRESO NO FRECUENTE",
    tags: [],
    lineItems: [
      { id: "li-1", amount: "=10+20", description: "Math", tags: [] },
    ],
  };
  const tx = buildTransactionFromDraft(draft, 2);
  assert.equal(tx.amount, 30);
  assert.equal(tx.lineItems[0].formula, "10+20");
});

test("buildTransactionFromDraft with line items throws on empty items", () => {
  const draft = {
    date: "2026-01-15",
    amount: "",
    detail: "",
    type: "GASTO NO FRECUENTE",
    tags: [],
    lineItems: [{ id: "li-1", amount: "", description: "", tags: [] }],
  };
  assert.throws(() => buildTransactionFromDraft(draft, 2), /Invalid transaction draft/);
});

// --- getTransactionMonthKey edge cases ---
test("getTransactionMonthKey parses non-ISO rawDate via parseLocalDate fallback", () => {
  const tx = {
    rowId: 1, amount: 100, detail: "x", type: "GASTO NO FRECUENTE",
    rawDate: "Jan 15 2026",
  };
  const key = getTransactionMonthKey(tx);
  assert.equal(key, "January 2026");
});

// --- insertChronologically edge cases ---
test("insertChronologically resolves ties by rowId", () => {
  const existing = [
    { rowId: 2, rawDate: "2026-01-15T00:00:00.000Z", amount: 100, detail: "A", type: "INGRESO FRECUENTE", createdAt: "", rawDateMs: 1736899200000, createdAtMs: 0 },
    { rowId: 3, rawDate: "2026-01-15T00:00:00.000Z", amount: -50, detail: "B", type: "GASTO NO FRECUENTE", createdAt: "", rawDateMs: 1736899200000, createdAtMs: 0 },
  ];
  const newTx = { rowId: 99, rawDate: "2026-01-15T00:00:00.000Z", amount: -30, detail: "C", type: "GASTO FRECUENTE", createdAt: "", rawDateMs: 1736899200000, createdAtMs: 0 };
  const result = insertChronologically(existing, newTx);
  assert.deepEqual(result.map((r) => r.detail), ["A", "B", "C"]);
  assert.deepEqual(result.map((r) => r.rowId), [2, 3, 4]);
});

// --- aggregateExpensesByTag ---
test("aggregateExpensesByTag returns empty array for empty transactions", () => {
  const result = aggregateExpensesByTag([], {}, [], "#888", "Otros");
  assert.deepEqual(result, []);
});

test("aggregateExpensesByTag returns empty array when no expense transactions", () => {
  const txs = [
    { rowId: 1, rawDate: "2026-01-15", amount: 100, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
  ];
  const result = aggregateExpensesByTag(txs, {}, [], "#888", "Otros");
  assert.deepEqual(result, []);
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
  const result = aggregateExpensesByTag(txs, tagColorMap, tagsList, "#888", "Otros");
  assert.equal(result.length, 2);
  const comida = result.find((s) => s.label === "Comida");
  const salud = result.find((s) => s.label === "Salud");
  assert.ok(comida);
  assert.ok(salud);
  assert.equal(comida.value, 130);
  assert.equal(salud.value, 50);
  assert.equal(Math.round(comida.percentage + salud.percentage), 100);
});

test("aggregateExpensesByTag handles untagged expenses as 'Otros'", () => {
  const txs = [
    { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: ["default-comida"] },
    { rowId: 2, rawDate: "2026-01-16", amount: -50, detail: "x", type: "GASTO NO FRECUENTE", tags: [] },
  ];
  const tagColorMap = { "default-comida": "#f59e0b" };
  const tagsList = [{ id: "default-comida", label: "Comida", color: "#f59e0b" }];
  const result = aggregateExpensesByTag(txs, tagColorMap, tagsList, "#888", "Otros");
  assert.equal(result.length, 2);
  const otros = result.find((s) => s.label === "Otros");
  assert.ok(otros);
  assert.equal(otros.value, 50);
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
  const result = aggregateExpensesByTag(txs, tagColorMap, tagsList, "#888", "Otros");
  assert.equal(result.length, 3);
  const comida = result.find((s) => s.label === "Comida");
  const salud = result.find((s) => s.label === "Salud");
  const transporte = result.find((s) => s.label === "Transporte");
  assert.ok(comida);
  assert.ok(salud);
  assert.ok(transporte);
  assert.equal(comida.value, 100);
  assert.equal(salud.value, 50);
  assert.equal(transporte.value, 50);
});

test("aggregateExpensesByTag handles empty tagColorMap gracefully", () => {
  const txs = [
    { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO NO FRECUENTE", tags: ["custom-unknown"] },
  ];
  const result = aggregateExpensesByTag(txs, {}, [], "#888", "Otros");
  assert.equal(result.length, 1);
  assert.equal(result[0].color, "#888");
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
  const result = aggregateExpensesByTag(txs, tagColorMap, tagsList, "#888", "Otros");
  assert.equal(result.length, 1);
  assert.equal(result[0].label, "Salud");
  assert.equal(result[0].value, 100);
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
  const result = aggregateExpensesByTag(txs, tagColorMap, tagsList, "#888", "Otros");
  assert.equal(result[0].label, "Comida");
  assert.equal(result[1].label, "Transporte");
  assert.equal(result[2].label, "Salud");
});

// --- aggregateIncomesByTag ---
test("aggregateIncomesByTag returns empty array for empty transactions", () => {
  const result = aggregateIncomesByTag([], {}, [], "#888", "Otros");
  assert.deepEqual(result, []);
});

test("aggregateIncomesByTag returns empty array when no income transactions", () => {
  const txs = [
    { rowId: 1, rawDate: "2026-01-15", amount: -100, detail: "x", type: "GASTO FRECUENTE", tags: ["default-comida"] },
  ];
  const result = aggregateIncomesByTag(txs, {}, [], "#888", "Otros");
  assert.deepEqual(result, []);
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
  const result = aggregateIncomesByTag(txs, tagColorMap, tagsList, "#888", "Otros");
  assert.equal(result.length, 2);
  const salud = result.find((s) => s.label === "Salud");
  const comida = result.find((s) => s.label === "Comida");
  assert.equal(salud.value, 700);
  assert.equal(comida.value, 300);
});

test("aggregateIncomesByTag handles untagged incomes", () => {
  const txs = [
    { rowId: 1, rawDate: "2026-01-15", amount: 100, detail: "x", type: "INGRESO FRECUENTE", tags: [] },
  ];
  const result = aggregateIncomesByTag(txs, {}, [], "#888", "Otros");
  assert.equal(result.length, 1);
  assert.equal(result[0].label, "Otros");
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
  const result = aggregateIncomesByTag(txs, tagColorMap, tagsList, "#888", "Otros");
  assert.equal(result.length, 2);
});

// --- groupSummariesByYear ---
test("groupSummariesByYear returns empty array for empty input", () => {
  assert.deepEqual(groupSummariesByYear([]), []);
});

test("groupSummariesByYear merges multiple months into one year row", () => {
  const rows = [
    monthRow("January 2025", 1000, 500, -200, -100),
    monthRow("February 2025", 800, 300, -150, -50),
    monthRow("March 2026", 500, 200, -100, -80),
  ];
  const result = groupSummariesByYear(rows);
  assert.equal(result.length, 2);
  const y2025 = result.find((r) => r.monthYear === "Year 2025");
  const y2026 = result.find((r) => r.monthYear === "Year 2026");
  assert.ok(y2025);
  assert.ok(y2026);
  assert.equal(y2025.freqIncome, 1800);
  assert.equal(y2025.nonFreqIncome, 800);
  assert.equal(y2025.totalIncome, 2600);
  assert.equal(y2025.freqExpense, -350);
  assert.equal(y2025.nonFreqExpense, -150);
  assert.equal(y2025.totalExpense, -500);
  assert.equal(y2025.netMonthly, 2100);
});

test("groupSummariesByYear handles single year", () => {
  const rows = [monthRow("January 2025", 100, 0, -50, 0)];
  const result = groupSummariesByYear(rows);
  assert.equal(result.length, 1);
  assert.equal(result[0].monthYear, "Year 2025");
  assert.equal(result[0].totalIncome, 100);
});

test("groupSummariesByYear sorts by year ascending", () => {
  const rows = [
    monthRow("December 2026", 10, 0, 0, 0),
    monthRow("January 2024", 10, 0, 0, 0),
    monthRow("June 2025", 10, 0, 0, 0),
  ];
  const result = groupSummariesByYear(rows);
  assert.deepEqual(result.map((r) => r.monthYear), ["Year 2024", "Year 2025", "Year 2026"]);
});

// --- detectNonFreqSpike ---
test("detectNonFreqSpike returns null for empty rows", () => {
  assert.equal(detectNonFreqSpike([]), null);
});

test("detectNonFreqSpike returns null when only one month", () => {
  const rows = [monthRow("January 2026", 0, 0, 0, -500)];
  assert.equal(detectNonFreqSpike(rows), null);
});

test("detectNonFreqSpike returns null when no spike detected", () => {
  const rows = [
    monthRow("January 2026", 0, 0, 0, -200),
    monthRow("February 2026", 0, 0, 0, -220),
    monthRow("March 2026", 0, 0, 0, -180),
  ];
  assert.equal(detectNonFreqSpike(rows), null);
});

test("detectNonFreqSpike detects spike above default threshold", () => {
  const rows = [
    monthRow("January 2026", 0, 0, 0, -100),
    monthRow("February 2026", 0, 0, 0, -100),
    monthRow("March 2026", 0, 0, 0, -500),
  ];
  const spike = detectNonFreqSpike(rows);
  assert.ok(spike);
  assert.equal(spike.monthYear, "March 2026");
  assert.equal(spike.amount, 500);
  assert.equal(spike.avg, 100);
  assert.equal(spike.ratioPct, 500);
});

test("detectNonFreqSpike respects custom threshold", () => {
  const rows = [
    monthRow("January 2026", 0, 0, 0, -100),
    monthRow("February 2026", 0, 0, 0, -100),
    monthRow("March 2026", 0, 0, 0, -250),
  ];
  assert.ok(detectNonFreqSpike(rows, 1.5));
  assert.equal(detectNonFreqSpike(rows, 3.0), null);
});

test("detectNonFreqSpike uses last 6 months for lookback", () => {
  const rows = [];
  for (let i = 0; i < 10; i++) {
    rows.push(monthRow(`${MONTH_NAMES[i % 12]} ${2025 + Math.floor(i / 12)}`, 0, 0, 0, -100));
  }
  rows[9] = monthRow("October 2025", 0, 0, 0, -700);
  const spike = detectNonFreqSpike(rows);
  assert.ok(spike);
  assert.equal(spike.amount, 700);
  assert.equal(spike.avg, 100);
});

test("detectNonFreqSpike returns null when last month has zero non-freq expense", () => {
  const rows = [
    monthRow("January 2026", 0, 0, 0, -100),
    monthRow("February 2026", 0, 0, 0, 0),
  ];
  assert.equal(detectNonFreqSpike(rows), null);
});

test("detectNonFreqSpike returns null when average is zero", () => {
  const rows = [
    monthRow("January 2026", 0, 0, 0, 0),
    monthRow("February 2026", 0, 0, 0, -500),
  ];
  assert.equal(detectNonFreqSpike(rows), null);
});

// --- computeSavingsLinePoints ---
test("computeSavingsLinePoints returns empty array for empty input", () => {
  assert.deepEqual(computeSavingsLinePoints([], "income", 158, 126), []);
  assert.deepEqual(computeSavingsLinePoints([], "expense", 158, 126), []);
});

test("computeSavingsLinePoints income mode uses scale against max", () => {
  const rows = [
    monthRow("January 2026", 100, 0, 0, 0),
    monthRow("February 2026", 500, 0, 0, 0),
    monthRow("March 2026", 1000, 0, 0, 0),
  ];
  const points = computeSavingsLinePoints(rows, "income", 158, 126);
  assert.equal(points.length, 3);
  assert.ok(points[0].y > points[2].y);
  assert.ok(points[1].y > points[2].y);
  assert.equal(points[2].y, 158 - 126);
});

test("computeSavingsLinePoints expense mode uses scale against max", () => {
  const rows = [
    monthRow("January 2026", 0, 0, 0, -200),
    monthRow("February 2026", 0, 0, 0, -800),
  ];
  const points = computeSavingsLinePoints(rows, "expense", 158, 126);
  assert.equal(points.length, 2);
  assert.equal(points[1].y, 158 - 126);
  assert.ok(points[0].y > points[1].y);
});

test("computeSavingsLinePoints handles all-zero rows gracefully", () => {
  const rows = [
    monthRow("January 2026", 0, 0, 0, 0),
    monthRow("February 2026", 0, 0, 0, 0),
  ];
  const points = computeSavingsLinePoints(rows, "income", 158, 126);
  assert.equal(points.length, 2);
  assert.equal(points[0].y, 158);
  assert.equal(points[1].y, 158);
});

function monthRow(monthYear, freqInc, nonFreqInc, freqExp, nonFreqExp) {
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
