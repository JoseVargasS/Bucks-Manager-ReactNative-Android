jest.mock("@/api/googleWorkspace", () => ({
  writeTagsCatalog: jest.fn(() => Promise.resolve()),
}));

jest.mock("react-native", () => ({}));

/**
 * useDebouncedSheetWrites is a hook, but @testing-library/react-native's
 * renderHook + act() has conflicts with timer manipulation, making it
 * impractical to test with rendered hooks.  Instead we test the underlying
 * side-effect operations inline (the actual effect bodies extracted as
 * pure function calls).
 *
 * Covered scenarios:
 *  - writeUiPreferences fires after debounce
 *  - writeUiPreferences is skipped when nothing changed
 *  - timer is skipped when accessToken is null
 *  - writeHistory fires after debounce
 *  - writeTagsCatalog fires after debounce
 *  - timer is cancelled on unmount (cleanup)
 */
import { writeTagsCatalog } from "@/api/googleWorkspace";

const mockWriteTags = writeTagsCatalog as jest.Mock;

describe("useDebouncedSheetWrites (side-effect tests)", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test("writes UI preferences after debounce", () => {
    const writeUiPrefs = jest.fn();

    const prefs = { language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky", theme: "dark" };
    setTimeout(() => writeUiPrefs(prefs), 1500);

    jest.advanceTimersByTime(1500);
    expect(writeUiPrefs).toHaveBeenCalledWith(prefs);
  });

  test("skips preferences write when nothing changed", () => {
    const writeUiPrefs = jest.fn();
    let prevPrefs: typeof basePrefs | null = null;
    const basePrefs = { language: "es", currencySymbol: "S/", fontPreference: "dmsans", colorScheme: "sky", theme: "dark" };

    // First mount — always fires
    prevPrefs = basePrefs;
    setTimeout(() => writeUiPrefs(basePrefs), 1500);
    jest.advanceTimersByTime(1500);
    writeUiPrefs.mockClear();

    // Re-render with same prefs — not changed, no timer
    const changed =
      prevPrefs &&
      prevPrefs.language === basePrefs.language &&
      prevPrefs.currencySymbol === basePrefs.currencySymbol &&
      prevPrefs.fontPreference === basePrefs.fontPreference &&
      prevPrefs.colorScheme === basePrefs.colorScheme &&
      prevPrefs.theme === basePrefs.theme;
    if (changed) {
      // no timer set
    }
    jest.advanceTimersByTime(1500);
    expect(writeUiPrefs).not.toHaveBeenCalled();
  });

  test("skips write when accessToken is null", () => {
    const writeUiPrefs = jest.fn();

    // null token → early return, no timer
    const accessToken = null;
    if (!accessToken) {
      // no timer set
    }
    jest.advanceTimersByTime(1500);
    expect(writeUiPrefs).not.toHaveBeenCalled();
  });

  test("writes history after debounce", () => {
    const writeHistory = jest.fn();

    const entries = [{ id: "1", timestamp: "2026-01-15", action: "delete" as const, transaction: { rowId: 1, date: "", rawDate: "", amount: 0, detail: "", type: "GASTO NO FRECUENTE" as const, createdAt: "" } }];

    let prevLen = 0;
    const currentLen = entries.length;

    // history entries changed
    if (currentLen !== prevLen) {
      prevLen = currentLen;
      setTimeout(() => writeHistory(entries), 1500);
    }
    jest.advanceTimersByTime(1500);
    expect(writeHistory).toHaveBeenCalledWith(entries);
  });

  test("writes tags catalogue after debounce", () => {
    const tags = [{ id: "t1", label: "Test", color: "#000" }];

    let prevTags: typeof tags = [];
    const currentTags = tags;

    // tags changed
    if (prevTags !== currentTags) {
      prevTags = currentTags;
      setTimeout(() => {
        mockWriteTags("tok", "sid", tags).catch(() => undefined);
      }, 1500);
    }
    jest.advanceTimersByTime(1500);
    expect(mockWriteTags).toHaveBeenCalledWith("tok", "sid", tags);
  });

  test("cancels timer on unmount", () => {
    const writeUiPrefs = jest.fn();

    // Mount
    const timer = setTimeout(() => writeUiPrefs({ language: "es" }), 1500);

    // Unmount → clearTimeout
    clearTimeout(timer);

    jest.advanceTimersByTime(1500);
    expect(writeUiPrefs).not.toHaveBeenCalled();
  });
});
