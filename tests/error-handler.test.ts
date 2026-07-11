describe("errorHandler", () => {
  let logError: typeof import("../src/utils/errorHandler").logError;
  let getErrorMessage: typeof import("../src/utils/errorHandler").getErrorMessage;
  let isAuthError: typeof import("../src/utils/errorHandler").isAuthError;
  let shouldRescanForSheetError: typeof import("../src/utils/errorHandler").shouldRescanForSheetError;

  beforeAll(async () => {
    const mod = await import("../src/utils/errorHandler");
    logError = mod.logError;
    getErrorMessage = mod.getErrorMessage;
    isAuthError = mod.isAuthError;
    shouldRescanForSheetError = mod.shouldRescanForSheetError;
  });

  test("logError calls console.error with formatted message", () => {
    const original = console.error;
    const logs: any[][] = [];
    console.error = (...args: any[]) => logs.push(args);
    logError(new Error("boom"), "test:ctx");
    console.error = original;
    expect(logs.length).toBe(1);
    expect(logs[0][0]).toContain("test:ctx");
    expect(logs[0][1]).toContain("Error: boom");
  });

  test("logError stringifies non-Error values", () => {
    const original = console.error;
    const logs: any[][] = [];
    console.error = (...args: any[]) => logs.push(args);
    logError("raw string", "misc");
    console.error = original;
    expect(logs[0][1]).toBe("raw string");
  });

  test("logError handles null and undefined", () => {
    const original = console.error;
    const logs: any[][] = [];
    console.error = (...args: any[]) => logs.push(args);
    logError(null, "a");
    logError(undefined, "b");
    console.error = original;
    expect(logs[0][1]).toBe("null");
    expect(logs[1][1]).toBe("undefined");
  });

  test("logError handles objects", () => {
    const original = console.error;
    const logs: any[][] = [];
    console.error = (...args: any[]) => logs.push(args);
    logError({ code: 42 }, "obj");
    console.error = original;
    expect(typeof logs[0][1] === "string" && logs[0][1].length > 0).toBeTruthy();
  });

  test("getErrorMessage returns Error.message for Error instances", () => {
    expect(getErrorMessage(new Error("test error"), "fallback")).toBe("test error");
  });

  test("getErrorMessage returns fallback for non-Error values", () => {
    expect(getErrorMessage("raw string", "my fallback")).toBe("my fallback");
    expect(getErrorMessage(null, "fb")).toBe("fb");
    expect(getErrorMessage(undefined, "fb2")).toBe("fb2");
  });

  test("isAuthError returns true for 401 errors", () => {
    expect(isAuthError(new Error("401 Unauthorized"), "fallback")).toBe(true);
  });

  test("isAuthError returns true for 403 errors", () => {
    expect(isAuthError(new Error("403 Forbidden"), "fallback")).toBe(true);
  });

  test("isAuthError returns true for permiso-related errors", () => {
    expect(isAuthError(new Error("permiso denegado"), "fallback")).toBe(true);
    expect(isAuthError(new Error("Permiso insuficiente"), "fallback")).toBe(true);
  });

  test("isAuthError returns false for other errors", () => {
    expect(isAuthError(new Error("500 Internal"), "fallback")).toBe(false);
    expect(isAuthError("random", "fallback")).toBe(false);
  });

  test("shouldRescanForSheetError returns true for 404", () => {
    expect(shouldRescanForSheetError(new Error("404 Not Found"))).toBe(true);
  });

  test("shouldRescanForSheetError returns true for range parse errors", () => {
    expect(shouldRescanForSheetError(new Error("unable to parse range"))).toBe(true);
  });

  test("shouldRescanForSheetError returns true for not found", () => {
    expect(shouldRescanForSheetError(new Error("not found"))).toBe(true);
  });

  test("shouldRescanForSheetError returns true for Spanish not found messages", () => {
    expect(shouldRescanForSheetError(new Error("no se encontro"))).toBe(true);
    expect(shouldRescanForSheetError(new Error("no se encontró"))).toBe(true);
  });

  test("shouldRescanForSheetError returns false for unrelated errors", () => {
    expect(shouldRescanForSheetError(new Error("rate limit"))).toBe(false);
    expect(shouldRescanForSheetError("random")).toBe(false);
  });
});
