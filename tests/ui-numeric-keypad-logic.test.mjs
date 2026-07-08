import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const { applyChar, applyBackspace } = await import("../src/components/ui/numericKeypadLogic.ts");

// --- applyChar ---

test("applyChar inserts at end", () => {
  const r = applyChar("12", 2, "3");
  assert.equal(r.value, "123");
  assert.equal(r.cursor, 3);
});

test("applyChar inserts in middle", () => {
  const r = applyChar("13", 1, "2");
  assert.equal(r.value, "123");
  assert.equal(r.cursor, 2);
});

test("applyChar inserts at start", () => {
  const r = applyChar("23", 0, "1");
  assert.equal(r.value, "123");
  assert.equal(r.cursor, 1);
});

test("applyChar inserts into empty value", () => {
  const r = applyChar("", 0, "5");
  assert.equal(r.value, "5");
  assert.equal(r.cursor, 1);
});

test("applyChar inserts operators and punctuation", () => {
  assert.equal(applyChar("12", 2, "+").value, "12+");
  assert.equal(applyChar("1+2", 3, ")").value, "1+2)");
  assert.equal(applyChar("1", 1, ".").value, "1.");
  assert.equal(applyChar("0", 1, "0").value, "00");
});

// --- applyBackspace ---

test("applyBackspace removes char before cursor at end", () => {
  const r = applyBackspace("123", 3);
  assert.equal(r.value, "12");
  assert.equal(r.cursor, 2);
});

test("applyBackspace in middle", () => {
  const r = applyBackspace("123", 2);
  assert.equal(r.value, "13");
  assert.equal(r.cursor, 1);
});

test("applyBackspace at start returns null (no-op)", () => {
  assert.equal(applyBackspace("123", 0), null);
});

test("applyBackspace on empty value returns null", () => {
  assert.equal(applyBackspace("", 0), null);
});

test("applyBackspace on single char", () => {
  const r = applyBackspace("5", 1);
  assert.equal(r.value, "");
  assert.equal(r.cursor, 0);
});
