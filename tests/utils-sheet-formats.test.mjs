import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const { parseSheetDate, parseCreatedAt } = await import("../src/api/sheetFormats.ts");

test("parseSheetDate handles 2-digit year in numeric date", () => {
  const result = parseSheetDate("15/01/26");
  assert.ok(result instanceof Date);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 0);
  assert.equal(result.getDate(), 15);
});

test("parseSheetDate returns null for impossible date", () => {
  assert.equal(parseSheetDate("31/02/2026"), null);
});

test("parseSheetDate handles 4-digit year month format", () => {
  const result = parseSheetDate("2026-01");
  assert.ok(result instanceof Date);
  assert.equal(result.getFullYear(), 2026);
  assert.equal(result.getMonth(), 0);
  assert.equal(result.getDate(), 1);
});

test("parseSheetDate returns null for invalid year-month", () => {
  assert.equal(parseSheetDate("2026-13"), null);
});

test("parseCreatedAt returns input string for invalid date string", () => {
  assert.equal(parseCreatedAt("not-a-date"), "not-a-date");
});

test("parseCreatedAt returns empty string for falsy value", () => {
  assert.equal(parseCreatedAt(null), "");
  assert.equal(parseCreatedAt(undefined), "");
  assert.equal(parseCreatedAt(""), "");
});

test("parseCreatedAt converts valid date string to ISO", () => {
  const result = parseCreatedAt("2026-01-15");
  assert.equal(result, new Date("2026-01-15").toISOString());
});
