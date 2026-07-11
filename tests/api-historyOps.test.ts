jest.mock("@/api/googleFetch", () => ({
  googleFetch: jest.fn(),
  readValuesUrl: jest.fn(),
  SHEETS: "https://sheets.googleapis.com/v4/spreadsheets",
}));

jest.mock("@/domain/bucksLogic", () => ({
  SHEET_NAMES: { transactions: "INCOME AND EXPENSES", summary: "MONTHLY SUMMARY" },
  TRANSACTION_TYPES: [
    "INGRESO FRECUENTE",
    "INGRESO NO FRECUENTE",
    "GASTO FRECUENTE",
    "GASTO NO FRECUENTE",
  ],
}));

import { readHistory, writeHistory, HISTORY_HEADER } from "@/api/historyOps";
import { googleFetch } from "@/api/googleFetch";

const mockGoogleFetch = googleFetch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

const validTx = {
  rowId: 2,
  date: "15-jan-26",
  rawDate: "2026-01-15T05:00:00.000Z",
  amount: -25,
  detail: "Comida",
  type: "GASTO NO FRECUENTE" as const,
};

const validEntry = {
  id: "abc123",
  timestamp: "2026-01-15T12:00:00.000Z",
  action: "delete" as const,
  transaction: validTx,
};

describe("readHistory", () => {
  test("returns entries when header matches and JSON is valid", async () => {
    mockGoogleFetch.mockResolvedValueOnce({
      values: [[HISTORY_HEADER], [JSON.stringify([validEntry])]],
    });
    const result = await readHistory("tok", "sheet-1");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("abc123");
  });

  test("returns empty array when header is missing", async () => {
    mockGoogleFetch.mockResolvedValueOnce({
      values: [["WRONG HEADER"], ["data"]],
    });
    const result = await readHistory("tok", "sheet-1");
    expect(result).toEqual([]);
  });

  test("returns empty array when cell is empty", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ values: [] });
    const result = await readHistory("tok", "sheet-1");
    expect(result).toEqual([]);
  });

  test("returns empty array when JSON is malformed", async () => {
    mockGoogleFetch.mockResolvedValueOnce({
      values: [[HISTORY_HEADER], ["not json"]],
    });
    const result = await readHistory("tok", "sheet-1");
    expect(result).toEqual([]);
  });

  test("returns empty array when JSON is not an array", async () => {
    mockGoogleFetch.mockResolvedValueOnce({
      values: [[HISTORY_HEADER], [JSON.stringify({ not: "array" })]],
    });
    const result = await readHistory("tok", "sheet-1");
    expect(result).toEqual([]);
  });

  test("filters out invalid entries from the array", async () => {
    const mixed = [validEntry, { invalid: true }, null, 123];
    mockGoogleFetch.mockResolvedValueOnce({
      values: [[HISTORY_HEADER], [JSON.stringify(mixed)]],
    });
    const result = await readHistory("tok", "sheet-1");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("abc123");
  });

  test("returns empty array when googleFetch throws", async () => {
    mockGoogleFetch.mockRejectedValueOnce(new Error("network error"));
    const result = await readHistory("tok", "sheet-1");
    expect(result).toEqual([]);
  });
});

describe("writeHistory", () => {
  test("writes header and JSON to M1:M2", async () => {
    mockGoogleFetch.mockResolvedValueOnce({});
    await writeHistory("tok", "sheet-1", [validEntry]);
    expect(mockGoogleFetch).toHaveBeenCalledWith(
      "tok",
      expect.stringContaining("M1"),
      expect.objectContaining({
        method: "PUT",
        body: JSON.stringify({
          values: [[HISTORY_HEADER], [JSON.stringify([validEntry])]],
        }),
      }),
    );
  });

  test("writes empty array when no entries", async () => {
    mockGoogleFetch.mockResolvedValueOnce({});
    await writeHistory("tok", "sheet-1", []);
    expect(mockGoogleFetch).toHaveBeenCalledWith(
      "tok",
      expect.stringContaining("M1"),
      expect.objectContaining({
        body: JSON.stringify({
          values: [[HISTORY_HEADER], [JSON.stringify([])]],
        }),
      }),
    );
  });
});

describe("HISTORY_HEADER", () => {
  test("is a stable string constant", () => {
    expect(HISTORY_HEADER).toBe("HISTORY");
  });
});
