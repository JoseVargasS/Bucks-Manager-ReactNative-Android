describe("numericKeypadLogic", () => {
  let applyChar: typeof import("../src/components/ui/numericKeypadLogic").applyChar;
  let applyBackspace: typeof import("../src/components/ui/numericKeypadLogic").applyBackspace;

  beforeAll(async () => {
    const mod = await import("../src/components/ui/numericKeypadLogic");
    applyChar = mod.applyChar;
    applyBackspace = mod.applyBackspace;
  });

  test("applyChar inserts at end", () => {
    const r = applyChar("12", 2, "3");
    expect(r.value).toBe("123");
    expect(r.cursor).toBe(3);
  });

  test("applyChar inserts in middle", () => {
    const r = applyChar("13", 1, "2");
    expect(r.value).toBe("123");
    expect(r.cursor).toBe(2);
  });

  test("applyChar inserts at start", () => {
    const r = applyChar("23", 0, "1");
    expect(r.value).toBe("123");
    expect(r.cursor).toBe(1);
  });

  test("applyChar inserts into empty value", () => {
    const r = applyChar("", 0, "5");
    expect(r.value).toBe("5");
    expect(r.cursor).toBe(1);
  });

  test("applyChar inserts operators and punctuation", () => {
    expect(applyChar("12", 2, "+").value).toBe("12+");
    expect(applyChar("1+2", 3, ")").value).toBe("1+2)");
    expect(applyChar("1", 1, ".").value).toBe("1.");
    expect(applyChar("0", 1, "0").value).toBe("00");
  });

  test("applyBackspace removes char before cursor at end", () => {
    const r = applyBackspace("123", 3);
    expect(r!.value).toBe("12");
    expect(r!.cursor).toBe(2);
  });

  test("applyBackspace in middle", () => {
    const r = applyBackspace("123", 2);
    expect(r!.value).toBe("13");
    expect(r!.cursor).toBe(1);
  });

  test("applyBackspace at start returns null (no-op)", () => {
    expect(applyBackspace("123", 0)).toBe(null);
  });

  test("applyBackspace on empty value returns null", () => {
    expect(applyBackspace("", 0)).toBe(null);
  });

  test("applyBackspace on single char", () => {
    const r = applyBackspace("5", 1);
    expect(r!.value).toBe("");
    expect(r!.cursor).toBe(0);
  });
});
