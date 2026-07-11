jest.mock("@/api/googleFetch", () => ({
  googleFetch: jest.fn(),
  readValuesUrl: jest.fn((sid: string, range: string) => `https://sheets.googleapis.com/v4/spreadsheets/${sid}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`),
  SHEETS: "https://sheets.googleapis.com/v4/spreadsheets",
}));

jest.mock("@/api/sheetFormats", () => ({
  parseTags: jest.fn((raw: string) => (raw ? raw.split(",").map((t: string) => t.trim()) : [])),
}));

jest.mock("@/domain/bucksLogic", () => ({
  SHEET_NAMES: { transactions: "INCOME AND EXPENSES", summary: "MONTHLY SUMMARY" },
}));

import { removeTagFromAllRows, readTagsCatalog, writeTagsCatalog } from "@/api/tagsOps";
import { googleFetch } from "@/api/googleFetch";

const mockGoogleFetch = googleFetch as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("removeTagFromAllRows", () => {
  test("removes tag from column F tags", async () => {
    mockGoogleFetch
      .mockResolvedValueOnce({ values: [["tag-a,tag-b"], ["tag-a"]] })
      .mockResolvedValueOnce({});

    await removeTagFromAllRows("tok", "sheet-1", "tag-a");
    expect(mockGoogleFetch).toHaveBeenCalledTimes(2);
  });

  test("removes tag from line items JSON in column G", async () => {
    const lineItems = [{ id: "li-1", tags: ["tag-a", "tag-b"] }];
    mockGoogleFetch
      .mockResolvedValueOnce({ values: [["", JSON.stringify(lineItems)]] })
      .mockResolvedValueOnce({});

    await removeTagFromAllRows("tok", "sheet-1", "tag-a");
    expect(mockGoogleFetch).toHaveBeenCalledTimes(2);
  });

  test("does not call API when no rows have the tag", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ values: [["tag-b"], ["tag-c"]] });

    await removeTagFromAllRows("tok", "sheet-1", "tag-a");
    expect(mockGoogleFetch).toHaveBeenCalledTimes(1);
  });

  test("handles empty values array", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ values: [] });

    await removeTagFromAllRows("tok", "sheet-1", "tag-a");
    expect(mockGoogleFetch).toHaveBeenCalledTimes(1);
  });

  test("handles missing values key", async () => {
    mockGoogleFetch.mockResolvedValueOnce({});

    await removeTagFromAllRows("tok", "sheet-1", "tag-a");
    expect(mockGoogleFetch).toHaveBeenCalledTimes(1);
  });
});

describe("readTagsCatalog", () => {
  test("returns parsed tags from sheet", async () => {
    const tags = [
      { id: "t1", label: "Comida", color: "#ff0000" },
      { id: "t2", label: "Salud", color: "#00ff00" },
    ];
    mockGoogleFetch.mockResolvedValueOnce({
      values: [[JSON.stringify(tags)]],
    });

    const result = await readTagsCatalog("tok", "sheet-1");
    expect(result.length).toBe(2);
    expect(result[0].id).toBe("t1");
  });

  test("returns empty array when no data", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ values: [] });
    const result = await readTagsCatalog("tok", "sheet-1");
    expect(result).toEqual([]);
  });

  test("returns empty array on invalid JSON", async () => {
    mockGoogleFetch.mockResolvedValueOnce({ values: [["not json"]] });
    const result = await readTagsCatalog("tok", "sheet-1");
    expect(result).toEqual([]);
  });

  test("filters out malformed tag objects", async () => {
    const tags = [
      { id: "t1", label: "Comida", color: "#ff0000" },
      { id: "t2" },
    ];
    mockGoogleFetch.mockResolvedValueOnce({
      values: [[JSON.stringify(tags)]],
    });

    const result = await readTagsCatalog("tok", "sheet-1");
    expect(result.length).toBe(1);
  });
});

describe("writeTagsCatalog", () => {
  test("writes tags to sheet", async () => {
    mockGoogleFetch.mockResolvedValueOnce({});
    const tags = [{ id: "t1", label: "Comida", color: "#ff0000" }];

    await writeTagsCatalog("tok", "sheet-1", tags);
    expect(mockGoogleFetch).toHaveBeenCalledWith(
      "tok",
      expect.stringContaining("values"),
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
