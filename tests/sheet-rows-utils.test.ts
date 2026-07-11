describe("sheetRows", () => {
  let parseLineItems: typeof import("../src/api/sheetRows").parseLineItems;
  let formatCreatedAtForSheet: typeof import("../src/api/sheetRows").formatCreatedAtForSheet;
  let formatAmountForSheet: typeof import("../src/api/sheetRows").formatAmountForSheet;
  let sanitizeAmountExpression: typeof import("../src/api/sheetRows").sanitizeAmountExpression;
  let parseAmountFormula: typeof import("../src/api/sheetRows").parseAmountFormula;
  let unwrapAmountFormula: typeof import("../src/api/sheetRows").unwrapAmountFormula;
  let buildTransactionRow: typeof import("../src/api/sheetRows").buildTransactionRow;

  beforeAll(async () => {
    const mod = await import("../src/api/sheetRows");
    parseLineItems = mod.parseLineItems;
    formatCreatedAtForSheet = mod.formatCreatedAtForSheet;
    formatAmountForSheet = mod.formatAmountForSheet;
    sanitizeAmountExpression = mod.sanitizeAmountExpression;
    parseAmountFormula = mod.parseAmountFormula;
    unwrapAmountFormula = mod.unwrapAmountFormula;
    buildTransactionRow = mod.buildTransactionRow;
  });

  test("parseLineItems returns undefined for null/empty", () => {
    expect(parseLineItems("")).toBe(undefined);
    expect(parseLineItems("[]")).toBe(undefined);
  });

  test("parseLineItems parses valid JSON array", () => {
    const raw = '[{"id":"li-1","amount":50,"description":"Item","tags":["tag1"]}]';
    const result = parseLineItems(raw);
    expect(Array.isArray(result)).toBeTruthy();
    expect(result![0].id).toBe("li-1");
    expect(result![0].amount).toBe(50);
  });

  test("parseLineItems returns undefined for invalid items", () => {
    const raw = '[{"id":"li-1"}]';
    expect(parseLineItems(raw)).toBe(undefined);
  });

  test("parseLineItems returns undefined for malformed JSON", () => {
    expect(parseLineItems("{not-json}")).toBe(undefined);
  });

  test("formatCreatedAtForSheet returns empty for empty input", () => {
    expect(formatCreatedAtForSheet("")).toBe("");
    expect(formatCreatedAtForSheet("Invalid Date")).toBe("");
  });

  test("formatCreatedAtForSheet formats time-only string", () => {
    const hms = formatCreatedAtForSheet("12:34:56");
    expect(hms).toBe("12:34:56");
    const hm = formatCreatedAtForSheet("9:05");
    expect(hm).toBe("09:05:00");
  });

  test("formatCreatedAtForSheet formats ISO date to time", () => {
    const result = formatCreatedAtForSheet("2026-01-15T12:34:56.000Z");
    expect(result).toMatch(/^\d{2}:\d{2}:\d{2}$/);
  });

  test("formatCreatedAtForSheet passes through unrecognized strings", () => {
    expect(formatCreatedAtForSheet("some-text")).toBe("some-text");
  });

  test("sanitizeAmountExpression removes equals prefix and invalid chars", () => {
    expect(sanitizeAmountExpression("=10+20")).toBe("10+20");
    expect(sanitizeAmountExpression("100")).toBe("100");
    expect(sanitizeAmountExpression("=a+b")).toBe("+");
    expect(sanitizeAmountExpression("")).toBe("");
  });

  test("parseAmountFormula extracts expression from formula cell", () => {
    expect(parseAmountFormula("", "GASTO NO FRECUENTE")).toBe("");
    expect(parseAmountFormula("=-10", "GASTO NO FRECUENTE")).toBe("-10");
    expect(parseAmountFormula("=10", "GASTO FRECUENTE")).toBe("10");
    expect(parseAmountFormula("=10+20", "INGRESO FRECUENTE")).toBe("10+20");
  });

  test("unwrapAmountFormula handles ABS wrapping", () => {
    expect(unwrapAmountFormula("ABS(10+20)", "GASTO NO FRECUENTE")).toBe("10+20");
    expect(unwrapAmountFormula("-ABS(10+20)", "GASTO NO FRECUENTE")).toBe("10+20");
    expect(unwrapAmountFormula("-(10+20)", "GASTO NO FRECUENTE")).toBe("10+20");
    expect(unwrapAmountFormula("-(10+20)", "INGRESO FRECUENTE")).toBe("-(10+20)");
    expect(unwrapAmountFormula("10+20", "GASTO NO FRECUENTE")).toBe("10+20");
  });

  test("formatAmountForSheet uses lineItems when present", () => {
    const tx = {
      amount: 30,
      lineItems: [
        { id: "li-1", amount: 10, description: "A", tags: [] },
        { id: "li-2", amount: 20, description: "B", tags: [] },
      ],
    } as any;
    const result = formatAmountForSheet(tx);
    expect(result).toBe("=10+20");
  });

  test("formatAmountForSheet returns amount when lineItems produce no valid parts", () => {
    const tx = {
      amount: 30,
      lineItems: [
        { id: "li-1", amount: 0, description: "Zero", tags: [] },
      ],
    } as any;
    expect(formatAmountForSheet(tx)).toBe(30);
  });

  test("formatAmountForSheet uses formula in lineItems when present", () => {
    const tx = {
      amount: 50,
      lineItems: [
        { id: "li-1", amount: 20, description: "A", tags: [], formula: "10+10" },
      ],
    } as any;
    expect(formatAmountForSheet(tx)).toBe("=10+10");
  });

  test("formatAmountForSheet falls back to formula", () => {
    const tx = { amount: 30, formula: "10+20" } as any;
    expect(formatAmountForSheet(tx)).toBe("=10+20");
  });

  test("formatAmountForSheet returns amount when no formula or lineItems", () => {
    const tx = { amount: 30 } as any;
    expect(formatAmountForSheet(tx)).toBe(30);
  });

  test("formatAmountForSheet returns amount when formula is empty", () => {
    const tx = { amount: -50, formula: "" } as any;
    expect(formatAmountForSheet(tx)).toBe(-50);
  });

  test("buildTransactionRow creates correct array", () => {
    const tx = {
      rawDate: "2026-01-15T12:00:00.000Z",
      amount: -100,
      detail: "Test",
      type: "GASTO NO FRECUENTE",
      createdAt: "12:00:00",
      tags: ["comida"],
    } as any;
    const row = buildTransactionRow(tx);
    expect(row[0]).toBe("2026-01-15");
    expect(row[2]).toBe("Test");
    expect(row[3]).toBe("GASTO NO FRECUENTE");
    expect(row[4]).toBe("12:00:00");
    expect(row[5]).toBe("comida");
    expect(row[6]).toBe("[]");
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
    } as any;
    const row = buildTransactionRow(tx);
    expect(row[6]).toContain("li-1");
    expect(row[6]).toContain("Item");
    expect(row[6]).toContain("tag1");
  });
});
