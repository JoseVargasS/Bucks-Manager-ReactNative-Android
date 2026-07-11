jest.mock("@/api/googleFetch", () => ({
  googleFetch: jest.fn(),
  SHEETS: "https://sheets.googleapis.com/v4/spreadsheets",
}));

jest.mock("@/api/preferencesOps", () => ({
  UI_PREFERENCES_HEADER: "UI PREFERENCES",
  UI_PREFERENCES_INIT_JSON: '{"v":1}',
}));

jest.mock("@/utils/tags", () => ({
  DEFAULT_TAGS: [
    { id: "default-comida", es: "Comida", en: "Food", color: "#ff0000" },
    { id: "default-salud", es: "Salud", en: "Health", color: "#00ff00" },
  ],
}));

import {
  createBucksSpreadsheet,
  getTransactionSheetId,
  getSheetIdByName,
  summaryRowFormatRequests,
  insertBlankRow,
  deleteSheetRow,
  getSpreadsheetLocale,
  buildSummaryRowFormulas,
} from "@/api/sheetInit";
import { googleFetch } from "@/api/googleFetch";

const mockGoogleFetch = googleFetch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("createBucksSpreadsheet", () => {
  test("creates spreadsheet and initializes it", async () => {
    mockGoogleFetch
      .mockResolvedValueOnce({ spreadsheetId: "new-sheet" })
      .mockResolvedValueOnce({ properties: { locale: "en_US" } })
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({
        sheets: [
          { properties: { sheetId: 0, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 1, title: "MONTHLY SUMMARY" } },
        ],
      })
      .mockResolvedValueOnce({});

    const id = await createBucksSpreadsheet("tok");
    expect(id).toBe("new-sheet");
    expect(mockGoogleFetch).toHaveBeenCalledTimes(5);
  });
});

describe("getTransactionSheetId", () => {
  test("returns sheetId for INCOME AND EXPENSES", async () => {
    mockGoogleFetch.mockResolvedValueOnce({
      sheets: [{ properties: { sheetId: 0, title: "INCOME AND EXPENSES" } }],
    });
    const id = await getTransactionSheetId("tok", "sheet-1");
    expect(id).toBe(0);
  });

  test("throws when sheet not found", async () => {
    mockGoogleFetch.mockResolvedValueOnce({
      sheets: [{ properties: { sheetId: 0, title: "OTHER" } }],
    });
    await expect(getTransactionSheetId("tok", "sheet-1")).rejects.toThrow();
  });
});

describe("getSheetIdByName", () => {
  test("returns correct sheetId", async () => {
    mockGoogleFetch.mockResolvedValueOnce({
      sheets: [
        { properties: { sheetId: 0, title: "Sheet1" } },
        { properties: { sheetId: 1, title: "Sheet2" } },
      ],
    });
    const id = await getSheetIdByName("tok", "sheet-1", "Sheet2");
    expect(id).toBe(1);
  });
});

describe("summaryRowFormatRequests", () => {
  test("returns format requests for summary row", () => {
    const requests = summaryRowFormatRequests(0, 1);
    expect(requests.length).toBe(2);
    expect(requests[0].repeatCell).toBeDefined();
  });
});

describe("insertBlankRow", () => {
  test("calls batchUpdate with insertDimension", async () => {
    mockGoogleFetch.mockResolvedValueOnce({});
    await insertBlankRow("tok", "sheet-1", 0, 2);
    expect(mockGoogleFetch).toHaveBeenCalledWith(
      "tok",
      expect.stringContaining("batchUpdate"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("deleteSheetRow", () => {
  test("calls batchUpdate with deleteDimension", async () => {
    mockGoogleFetch.mockResolvedValueOnce({});
    await deleteSheetRow("tok", "sheet-1", 0, 2);
    expect(mockGoogleFetch).toHaveBeenCalledWith(
      "tok",
      expect.stringContaining("batchUpdate"),
      expect.objectContaining({ method: "POST" }),
    );
  });
});

describe("getSpreadsheetLocale", () => {
  test("returns locale from spreadsheet", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ properties: { locale: "es_PE" } });
    const locale = await getSpreadsheetLocale("tok", "sheet-1");
    expect(locale).toBe("es_PE");
  });

  test("returns default when locale missing", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ properties: {} });
    const locale = await getSpreadsheetLocale("tok", "sheet-1");
    expect(locale).toBe("en_US");
  });
});

describe("buildSummaryRowFormulas", () => {
  test("builds English formulas", () => {
    const formulas = buildSummaryRowFormulas(2, "2026-01", "en_US");
    expect(formulas.length).toBe(9);
    expect(formulas[0]).toBe("2026-01");
    expect(formulas[1]).toContain("SUMIFS");
    expect(formulas[1]).toContain("EOMONTH");
  });

  test("builds Spanish formulas", () => {
    const formulas = buildSummaryRowFormulas(2, "2026-01", "es_PE");
    expect(formulas[1]).toContain("SUMAR.SI.CONJUNTO");
    expect(formulas[1]).toContain("FIN.MES");
  });
});
