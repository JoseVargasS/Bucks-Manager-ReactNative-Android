jest.mock("@/api/googleFetch", () => ({
  googleFetch: jest.fn(),
  DRIVE: "https://www.googleapis.com/drive/v3",
  SHEETS: "https://sheets.googleapis.com/v4/spreadsheets",
  GOOGLE_SHEET_MIME: "application/vnd.google-apps.spreadsheet",
  readValuesUrl: jest.fn(),
}));

jest.mock("@/api/sheetFormats", () => ({
  findHeaderIndex: jest.fn(),
}));

jest.mock("@/domain/bucksLogic", () => ({
  SHEET_NAMES: { transactions: "INCOME AND EXPENSES", summary: "MONTHLY SUMMARY" },
}));

jest.mock("@/api/sheetInit", () => ({
  TRANSACTION_HEADERS: ["Date", "Amount", "Detail", "Type"],
  SUMMARY_HEADERS: ["MONTH", "FREQUENT INCOME"],
}));

import { findCompatibleSheets, isSheetTrashed } from "@/api/driveOps";
import { googleFetch } from "@/api/googleFetch";
import { findHeaderIndex } from "@/api/sheetFormats";

const mockGoogleFetch = googleFetch as jest.Mock;
const mockFindHeaderIndex = findHeaderIndex as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("findCompatibleSheets", () => {
  test("returns compatible sheets with valid structure", async () => {
    mockGoogleFetch
      .mockResolvedValueOnce({
        files: [{ id: "s1", name: "Sheet1", modifiedTime: "2026-01-01" }],
        nextPageToken: undefined,
      })
      .mockResolvedValueOnce({
        sheets: [{ properties: { title: "INCOME AND EXPENSES" } }, { properties: { title: "MONTHLY SUMMARY" } }],
      })
      .mockResolvedValueOnce({
        valueRanges: [{ values: [["Date", "Amount"]] }, { values: [["MONTH"]] }],
      });
    mockFindHeaderIndex.mockReturnValue(0);

    const result = await findCompatibleSheets("tok");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("s1");
  });

  test("excludes sheets without required tabs", async () => {
    mockGoogleFetch
      .mockResolvedValueOnce({
        files: [{ id: "s1", name: "Sheet1" }],
      })
      .mockResolvedValueOnce({
        sheets: [{ properties: { title: "INCOME AND EXPENSES" } }],
      });

    const result = await findCompatibleSheets("tok");
    expect(result.length).toBe(0);
  });

  test("excludes sheets with invalid header structure", async () => {
    mockGoogleFetch
      .mockResolvedValueOnce({
        files: [{ id: "s1", name: "Sheet1" }],
      })
      .mockResolvedValueOnce({
        sheets: [{ properties: { title: "INCOME AND EXPENSES" } }, { properties: { title: "MONTHLY SUMMARY" } }],
      })
      .mockResolvedValueOnce({
        valueRanges: [{ values: [] }, { values: [] }],
      });
    mockFindHeaderIndex.mockReturnValue(-1);

    const result = await findCompatibleSheets("tok");
    expect(result.length).toBe(0);
  });

  test("handles pagination", async () => {
    mockGoogleFetch
      .mockResolvedValueOnce({
        files: [{ id: "s1", name: "Sheet1" }],
        nextPageToken: "page2",
      })
      .mockResolvedValueOnce({
        sheets: [{ properties: { title: "INCOME AND EXPENSES" } }, { properties: { title: "MONTHLY SUMMARY" } }],
      })
      .mockResolvedValueOnce({
        valueRanges: [{ values: [["Date"]] }, { values: [["MONTH"]] }],
      })
      .mockResolvedValueOnce({
        files: [],
        nextPageToken: undefined,
      });
    mockFindHeaderIndex.mockReturnValue(0);

    const result = await findCompatibleSheets("tok");
    expect(result.length).toBe(1);
  });

  test("handles errors during validation gracefully", async () => {
    mockGoogleFetch
      .mockResolvedValueOnce({
        files: [{ id: "s1", name: "Sheet1" }, { id: "s2", name: "Sheet2" }],
      })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValueOnce({
        sheets: [{ properties: { title: "INCOME AND EXPENSES" } }, { properties: { title: "MONTHLY SUMMARY" } }],
      })
      .mockResolvedValueOnce({
        valueRanges: [{ values: [["Date"]] }, { values: [["MONTH"]] }],
      });
    mockFindHeaderIndex.mockReturnValue(0);

    const result = await findCompatibleSheets("tok");
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("s2");
  });
});

describe("isSheetTrashed", () => {
  test("returns true when trashed", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ trashed: true });
    expect(await isSheetTrashed("tok", "s1")).toBe(true);
  });

  test("returns false when not trashed", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ trashed: false });
    expect(await isSheetTrashed("tok", "s1")).toBe(false);
  });

  test("returns false on error", async () => {
    mockGoogleFetch.mockRejectedValueOnce(new Error("not found"));
    expect(await isSheetTrashed("tok", "s1")).toBe(false);
  });
});
