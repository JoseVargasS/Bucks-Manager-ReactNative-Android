import { renderHook } from "@testing-library/react-native";
import { useChartFade } from "@/components/ui/chartFade";

jest.mock("react-native", () => ({
  Animated: {
    Value: jest.fn().mockImplementation((val: number) => ({ _value: val })),
    timing: jest.fn().mockImplementation(() => ({ start: jest.fn() })),
    parallel: jest.fn().mockImplementation(() => ({ start: jest.fn() })),
  },
}));

describe("useChartFade", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns a ref with correct number of opacities", async () => {
    const { result } = await renderHook(() => useChartFade(3, 0));
    expect((result.current as ReturnType<typeof useChartFade>).current).toHaveLength(3);
  });

  it("creates correct number of opacity values", async () => {
    const { result } = await renderHook(() => useChartFade(5, 2));
    expect((result.current as ReturnType<typeof useChartFade>).current).toHaveLength(5);
  });

  it("re-creates opacities when count changes", async () => {
    const { result, rerender } = await renderHook(
      ({ count, selected }: { count: number; selected: number }) => useChartFade(count, selected),
      { initialProps: { count: 3, selected: 0 } },
    );
    const first = (result.current as ReturnType<typeof useChartFade>).current;

    await rerender({ count: 5, selected: 0 });
    const after = (result.current as ReturnType<typeof useChartFade>).current;
    expect(after).toHaveLength(5);
    expect(after).not.toBe(first);
  });

  it("re-creates opacities when dataIdentity changes", async () => {
    const { result, rerender } = await renderHook(
      ({ count, selected, identity }: { count: number; selected: number; identity: string }) =>
        useChartFade(count, selected, identity),
      { initialProps: { count: 3, selected: 0, identity: "a" } },
    );
    const first = (result.current as ReturnType<typeof useChartFade>).current;

    await rerender({ count: 3, selected: 0, identity: "b" });
    expect((result.current as ReturnType<typeof useChartFade>).current).not.toBe(first);
  });

  it("does not re-create when dataIdentity stays the same", async () => {
    const { result, rerender } = await renderHook(
      ({ count, selected, identity }: { count: number; selected: number; identity: string }) =>
        useChartFade(count, selected, identity),
      { initialProps: { count: 3, selected: 0, identity: "a" } },
    );
    const first = (result.current as ReturnType<typeof useChartFade>).current;

    await rerender({ count: 3, selected: 1, identity: "a" });
    expect((result.current as ReturnType<typeof useChartFade>).current).toBe(first);
  });
});
