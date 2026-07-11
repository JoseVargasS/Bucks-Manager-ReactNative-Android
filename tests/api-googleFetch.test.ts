const mockFetch = jest.fn();
global.fetch = mockFetch;

import { googleFetch, valuesUrl, readValuesUrl, formulaValuesUrl } from "@/api/googleFetch";

beforeEach(() => {
  mockFetch.mockReset();
});

function mockResponse(body: unknown, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  };
}

describe("googleFetch", () => {
  test("makes GET request with Authorization header", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ data: "ok" }));
    const result = await googleFetch<{ data: string }>("my-token", "https://api.test.com/data");
    expect(result.data).toBe("ok");
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/data",
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: "Bearer my-token",
        }),
      }),
    );
  });

  test("makes POST request", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ id: 1 }));
    await googleFetch("tok", "https://api.test.com/create", {
      method: "POST",
      body: JSON.stringify({ name: "test" }),
    });
    expect(mockFetch).toHaveBeenCalledWith(
      "https://api.test.com/create",
      expect.objectContaining({ method: "POST" }),
    );
  });

  test("throws on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "not found" }, 404));
    await expect(googleFetch("tok", "https://api.test.com/missing")).rejects.toThrow("Google API 404");
  });

  test("retries on 429 transient error", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: "rate limited" }, 429))
      .mockResolvedValueOnce(mockResponse({ data: "ok" }));
    const result = await googleFetch<{ data: string }>("tok", "https://api.test.com/data");
    expect(result.data).toBe("ok");
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  test("retries on 500 transient error", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse("server error", 500))
      .mockResolvedValueOnce(mockResponse({ data: "ok" }));
    const result = await googleFetch<{ data: string }>("tok", "https://api.test.com/data");
    expect(result.data).toBe("ok");
  });

  test("throws after max retries on transient errors", async () => {
    mockFetch
      .mockResolvedValueOnce(mockResponse({ error: "rate" }, 429))
      .mockResolvedValueOnce(mockResponse({ error: "rate" }, 429))
      .mockResolvedValueOnce(mockResponse({ error: "rate" }, 429));
    await expect(googleFetch("tok", "https://api.test.com/data")).rejects.toThrow("Google API 429");
  });

  test("does not retry on 400 client error", async () => {
    mockFetch.mockResolvedValueOnce(mockResponse({ error: "bad request" }, 400));
    await expect(googleFetch("tok", "https://api.test.com/bad")).rejects.toThrow("Google API 400");
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });

  test("throws HTML error message for HTML responses", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({}),
      text: async () => "<html><body>Access Denied</body></html>",
    });
    await expect(googleFetch("tok", "https://api.test.com/forbidden")).rejects.toThrow("HTML");
  });
});

describe("valuesUrl", () => {
  test("builds correct URL with encoded range", () => {
    const url = valuesUrl("sheet-id", "Sheet1!A1:B2");
    expect(url).toContain("https://sheets.googleapis.com/v4/spreadsheets/sheet-id/values/");
    expect(url).toContain("Sheet1");
  });
});

describe("readValuesUrl", () => {
  test("builds URL with FORMATTED_VALUE render option", () => {
    const url = readValuesUrl("sheet-id", "Sheet1!A1:B2");
    expect(url).toContain("valueRenderOption=FORMATTED_VALUE");
    expect(url).toContain("dateTimeRenderOption=FORMATTED_STRING");
  });
});

describe("formulaValuesUrl", () => {
  test("builds URL with FORMULA render option", () => {
    const url = formulaValuesUrl("sheet-id", "Sheet1!A1:B2");
    expect(url).toContain("valueRenderOption=FORMULA");
  });
});
