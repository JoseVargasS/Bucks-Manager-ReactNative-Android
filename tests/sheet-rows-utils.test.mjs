import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const {
  parseLineItems,
  formatCreatedAtForSheet,
  formatAmountForSheet,
  sanitizeAmountExpression,
  parseAmountFormula,
  unwrapAmountFormula,
  buildTransactionRow,
} = await import("../src/api/sheetRows.ts");

test("parseLineItems returns undefined for null/empty", () => {
  assert.equal(parseLineItems(""), undefined);
  assert.equal(parseLineItems("[]"), undefined);
});

test("parseLineItems parses valid JSON array", () => {
  const raw = '[{"id":"li-1","amount":50,"description":"Item","tags":["tag1"]}]';
  const result = parseLineItems(raw);
  assert.ok(Array.isArray(result));
  assert.equal(result[0].id, "li-1");
  assert.equal(result[0].amount, 50);
});

test("parseLineItems returns undefined for invalid items", () => {
  const raw = '[{"id":"li-1"}]';
  assert.equal(parseLineItems(raw), undefined);
});

test("parseLineItems returns undefined for malformed JSON", () => {
  assert.equal(parseLineItems("{not-json}"), undefined);
});

test("formatCreatedAtForSheet returns empty for empty input", () => {
  assert.equal(formatCreatedAtForSheet(""), "");
  assert.equal(formatCreatedAtForSheet("Invalid Date"), "");
});

test("formatCreatedAtForSheet formats time-only string", () => {
  const hms = formatCreatedAtForSheet("12:34:56");
  assert.equal(hms, "12:34:56");
  const hm = formatCreatedAtForSheet("9:05");
  assert.equal(hm, "09:05:00");
});

test("formatCreatedAtForSheet formats ISO date to time", () => {
  const result = formatCreatedAtForSheet("2026-01-15T12:34:56.000Z");
  assert.match(result, /^\d{2}:\d{2}:\d{2}$/);
});

test("formatCreatedAtForSheet passes through unrecognized strings", () => {
  assert.equal(formatCreatedAtForSheet("some-text"), "some-text");
});

test("sanitizeAmountExpression removes equals prefix and invalid chars", () => {
  assert.equal(sanitizeAmountExpression("=10+20"), "10+20");
  assert.equal(sanitizeAmountExpression("100"), "100");
  assert.equal(sanitizeAmountExpression("=a+b"), "+");
  assert.equal(sanitizeAmountExpression(""), "");
});

test("parseAmountFormula extracts expression from formula cell", () => {
  assert.equal(parseAmountFormula("", "GASTO NO FRECUENTE"), "");
  assert.equal(parseAmountFormula("=-10", "GASTO NO FRECUENTE"), "-10");
  assert.equal(parseAmountFormula("=10", "GASTO FRECUENTE"), "10");
  assert.equal(parseAmountFormula("=10+20", "INGRESO FRECUENTE"), "10+20");
});

test("unwrapAmountFormula handles ABS wrapping", () => {
  assert.equal(unwrapAmountFormula("ABS(10+20)", "GASTO NO FRECUENTE"), "10+20");
  assert.equal(unwrapAmountFormula("-ABS(10+20)", "GASTO NO FRECUENTE"), "10+20");
  assert.equal(unwrapAmountFormula("-(10+20)", "GASTO NO FRECUENTE"), "10+20");
  assert.equal(unwrapAmountFormula("-(10+20)", "INGRESO FRECUENTE"), "-(10+20)");
  assert.equal(unwrapAmountFormula("10+20", "GASTO NO FRECUENTE"), "10+20");
});

test("formatAmountForSheet uses lineItems when present", () => {
  const tx = {
    amount: 30,
    lineItems: [
      { id: "li-1", amount: 10, description: "A", tags: [] },
      { id: "li-2", amount: 20, description: "B", tags: [] },
    ],
  };
  const result = formatAmountForSheet(tx);
  assert.equal(result, "=10+20");
});

test("formatAmountForSheet returns amount when lineItems produce no valid parts", () => {
  const tx = {
    amount: 30,
    lineItems: [
      { id: "li-1", amount: 0, description: "Zero", tags: [] },
    ],
  };
  assert.equal(formatAmountForSheet(tx), 30);
});

test("formatAmountForSheet uses formula in lineItems when present", () => {
  const tx = {
    amount: 50,
    lineItems: [
      { id: "li-1", amount: 20, description: "A", tags: [], formula: "10+10" },
    ],
  };
  assert.equal(formatAmountForSheet(tx), "=10+10");
});

test("formatAmountForSheet falls back to formula", () => {
  const tx = { amount: 30, formula: "10+20" };
  assert.equal(formatAmountForSheet(tx), "=10+20");
});

test("formatAmountForSheet returns amount when no formula or lineItems", () => {
  const tx = { amount: 30 };
  assert.equal(formatAmountForSheet(tx), 30);
});

test("formatAmountForSheet returns amount when formula is empty", () => {
  const tx = { amount: -50, formula: "" };
  assert.equal(formatAmountForSheet(tx), -50);
});

test("buildTransactionRow creates correct array", () => {
  const tx = {
    rawDate: "2026-01-15T12:00:00.000Z",
    amount: -100,
    detail: "Test",
    type: "GASTO NO FRECUENTE",
    createdAt: "12:00:00",
    tags: ["comida"],
  };
  const row = buildTransactionRow(tx);
  assert.equal(row[0], "2026-01-15");
  assert.equal(row[2], "Test");
  assert.equal(row[3], "GASTO NO FRECUENTE");
  assert.equal(row[4], "12:00:00");
  assert.equal(row[5], "comida");
  assert.equal(row[6], "[]");
});

test("buildTransactionRow includes lineItems JSON", () => {
  const tx = {
    rawDate: "2026-01-15T00:00:00.000Z",
    amount: -50,
    detail: "Test",
    type: "GASTO NO FRECUENTE",
    createdAt: "",
    tags: [],
    lineItems: [{ id: "li-1", amount: -50, description: "Item", tags: ["tag1"] }],
  };
  const row = buildTransactionRow(tx);
  assert.ok(row[6].includes("li-1"));
  assert.ok(row[6].includes("Item"));
  assert.ok(row[6].includes("tag1"));
});
