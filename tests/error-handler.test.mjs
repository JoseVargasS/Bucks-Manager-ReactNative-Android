import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const { logError, getErrorMessage, isAuthError, shouldRescanForSheetError } = await import("../src/utils/errorHandler.ts");

test("logError calls console.error with formatted message", () => {
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  logError(new Error("boom"), "test:ctx");
  console.error = original;
  assert.equal(logs.length, 1);
  assert.ok(logs[0][0].includes("test:ctx"));
  assert.ok(logs[0][1].includes("Error: boom"));
});

test("logError stringifies non-Error values", () => {
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  logError("raw string", "misc");
  console.error = original;
  assert.equal(logs[0][1], "raw string");
});

test("logError handles null and undefined", () => {
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  logError(null, "a");
  logError(undefined, "b");
  console.error = original;
  assert.equal(logs[0][1], "null");
  assert.equal(logs[1][1], "undefined");
});

test("logError handles objects", () => {
  const original = console.error;
  const logs = [];
  console.error = (...args) => logs.push(args);
  logError({ code: 42 }, "obj");
  console.error = original;
  assert.ok(typeof logs[0][1] === "string" && logs[0][1].length > 0);
});

test("getErrorMessage returns Error.message for Error instances", () => {
  assert.equal(getErrorMessage(new Error("test error"), "fallback"), "test error");
});

test("getErrorMessage returns fallback for non-Error values", () => {
  assert.equal(getErrorMessage("raw string", "my fallback"), "my fallback");
  assert.equal(getErrorMessage(null, "fb"), "fb");
  assert.equal(getErrorMessage(undefined, "fb2"), "fb2");
});

test("isAuthError returns true for 401 errors", () => {
  assert.equal(isAuthError(new Error("401 Unauthorized"), "fallback"), true);
});

test("isAuthError returns true for 403 errors", () => {
  assert.equal(isAuthError(new Error("403 Forbidden"), "fallback"), true);
});

test("isAuthError returns true for permiso-related errors", () => {
  assert.equal(isAuthError(new Error("permiso denegado"), "fallback"), true);
  assert.equal(isAuthError(new Error("Permiso insuficiente"), "fallback"), true);
});

test("isAuthError returns false for other errors", () => {
  assert.equal(isAuthError(new Error("500 Internal"), "fallback"), false);
  assert.equal(isAuthError("random", "fallback"), false);
});

test("shouldRescanForSheetError returns true for 404", () => {
  assert.equal(shouldRescanForSheetError(new Error("404 Not Found")), true);
});

test("shouldRescanForSheetError returns true for range parse errors", () => {
  assert.equal(shouldRescanForSheetError(new Error("unable to parse range")), true);
});

test("shouldRescanForSheetError returns true for not found", () => {
  assert.equal(shouldRescanForSheetError(new Error("not found")), true);
});

test("shouldRescanForSheetError returns true for Spanish not found messages", () => {
  assert.equal(shouldRescanForSheetError(new Error("no se encontro")), true);
  assert.equal(shouldRescanForSheetError(new Error("no se encontró")), true);
});

test("shouldRescanForSheetError returns false for unrelated errors", () => {
  assert.equal(shouldRescanForSheetError(new Error("rate limit")), false);
  assert.equal(shouldRescanForSheetError("random"), false);
});
