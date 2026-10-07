import { renderHook } from "@testing-library/react-native";
import { markFreshCreatedAt, useFreshCreatedAt } from "@/utils/freshRows";

jest.mock("react-native", () => ({}));

describe("freshRows", () => {
  test("unmarked timestamps are not fresh", async () => {
    const { result } = await renderHook(() => useFreshCreatedAt(111));
    expect(result.current).toBe(false);
  });

  test("marked timestamps read fresh", async () => {
    markFreshCreatedAt([222]);
    const { result } = await renderHook(() => useFreshCreatedAt(222));
    expect(result.current).toBe(true);
  });

  test("marks expire after the window", async () => {
    const now = Date.now();
    const spy = jest.spyOn(Date, "now").mockReturnValue(now);
    markFreshCreatedAt([333]);
    spy.mockReturnValue(now + 60_000);
    const { result } = await renderHook(() => useFreshCreatedAt(333));
    expect(result.current).toBe(false);
    spy.mockRestore();
  });

  test("ignores missing values", () => {
    expect(() => markFreshCreatedAt([undefined])).not.toThrow();
  });
});
