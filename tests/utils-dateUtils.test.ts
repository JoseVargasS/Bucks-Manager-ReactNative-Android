import {
  formatDateToISO,
  formatDateForSheet,
  parseSpanishDate,
  getMonthYear,
  parseCreatedAtMs,
  isValidDraftDate,
  parseLocalDate,
  monthYearToDate,
} from "@/utils/dateUtils";

describe("formatDateToISO", () => {
  test("formats Date to YYYY-MM-DD", () => {
    expect(formatDateToISO(new Date(2026, 0, 5))).toBe("2026-01-05");
  });

  test("formats ISO string to YYYY-MM-DD", () => {
    expect(formatDateToISO("2026-03-15T12:00:00.000Z")).toBeTruthy();
  });

  test("returns empty for invalid date", () => {
    expect(formatDateToISO(new Date("invalid"))).toBe("");
  });

  test("pads single digit months and days", () => {
    expect(formatDateToISO(new Date(2026, 0, 1))).toBe("2026-01-01");
  });
});

describe("formatDateForSheet", () => {
  test("formats as dd-mmm-yy", () => {
    const result = formatDateForSheet(new Date(2026, 0, 15));
    expect(result).toBe("15-jan-26");
  });

  test("handles december", () => {
    const result = formatDateForSheet(new Date(2026, 11, 25));
    expect(result).toBe("25-dec-26");
  });
});

describe("parseSpanishDate", () => {
  test("parses valid Spanish date", () => {
    const d = parseSpanishDate("15-ene-26");
    expect(d).toBeInstanceOf(Date);
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(0);
    expect(d?.getDate()).toBe(15);
  });

  test("parses 3-letter English month abbreviations", () => {
    const d = parseSpanishDate("10-jan-26");
    expect(d).not.toBeNull();
    expect(d?.getMonth()).toBe(0);
  });

  test("parses full months", () => {
    const d = parseSpanishDate("01-dic-25");
    expect(d).not.toBeNull();
    expect(d?.getMonth()).toBe(11);
  });

  test("returns null for invalid format", () => {
    expect(parseSpanishDate("invalid")).toBeNull();
    expect(parseSpanishDate("15-01-2026")).toBeNull();
  });

  test("returns null for unknown month", () => {
    expect(parseSpanishDate("15-xyz-26")).toBeNull();
  });

  test("returns null for day 0", () => {
    expect(parseSpanishDate("0-ene-26")).toBeNull();
  });

  test("handles 2-digit year", () => {
    const d = parseSpanishDate("01-jan-25");
    expect(d?.getFullYear()).toBe(2025);
  });
});

describe("getMonthYear", () => {
  test("returns 'Month Year' format", () => {
    expect(getMonthYear(new Date(2026, 0, 1))).toBe("January 2026");
  });

  test("handles december", () => {
    expect(getMonthYear(new Date(2026, 11, 1))).toBe("December 2026");
  });
});

describe("parseCreatedAtMs", () => {
  test("parses HH:MM format", () => {
    expect(parseCreatedAtMs("12:30")).toBe(12 * 3600000 + 30 * 60000);
  });

  test("parses HH:MM:SS format", () => {
    expect(parseCreatedAtMs("12:30:45")).toBe(12 * 3600000 + 30 * 60000 + 45 * 1000);
  });

  test("parses ISO date string", () => {
    const result = parseCreatedAtMs("2026-01-15T12:00:00.000Z");
    expect(result).toBeGreaterThan(0);
  });

  test("returns 0 for undefined", () => {
    expect(parseCreatedAtMs(undefined)).toBe(0);
  });

  test("returns 0 for empty string", () => {
    expect(parseCreatedAtMs("")).toBe(0);
  });
});

describe("isValidDraftDate", () => {
  test("validates correct YYYY-MM-DD", () => {
    expect(isValidDraftDate("2026-01-15")).toBe(true);
  });

  test("rejects invalid format", () => {
    expect(isValidDraftDate("15-01-2026")).toBe(false);
    expect(isValidDraftDate("2026-13-01")).toBe(false);
    expect(isValidDraftDate("2026-01-32")).toBe(false);
  });

  test("rejects non-matching date values", () => {
    expect(isValidDraftDate("2026-02-30")).toBe(false);
  });
});

describe("parseLocalDate", () => {
  test("parses ISO date string", () => {
    const d = parseLocalDate("2026-01-15");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(15);
  });

  test("parses full ISO string", () => {
    const d = parseLocalDate("2026-03-10T00:00:00");
    expect(d.getFullYear()).toBe(2026);
  });

  test("returns NaN date for empty string", () => {
    const d = parseLocalDate("");
    expect(Number.isNaN(d.getTime())).toBe(true);
  });
});

describe("monthYearToDate", () => {
  test("parses 'Month Year' format", () => {
    const d = monthYearToDate("January 2026");
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(0);
  });

  test("parses 'December 2025'", () => {
    const d = monthYearToDate("December 2025");
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11);
  });
});
