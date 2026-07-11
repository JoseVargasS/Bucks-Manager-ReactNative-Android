import { renderHook, act } from "@testing-library/react-native";
import { useModalTransition } from "@/components/ui/useModalTransition";

jest.mock("react-native", () => ({
  Animated: {
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      stopAnimation: jest.fn(),
      interpolate: jest.fn().mockReturnValue({ __interpolated: true }),
    })),
    timing: jest.fn().mockImplementation(() => ({
      start: jest.fn((cb?: (result: { finished: boolean }) => void) => {
        if (cb) cb({ finished: true });
      }),
      stop: jest.fn(),
    })),
    parallel: jest.fn().mockImplementation(() => ({
      start: jest.fn(),
    })),
  },
  Easing: {
    out: jest.fn().mockReturnValue("easing-out"),
    in: jest.fn().mockReturnValue("easing-in"),
  },
}));

describe("useModalTransition", () => {
  it("returns modalVisible true when visible", async () => {
    const { result } = await renderHook(() => useModalTransition(true));
    expect((result.current as ReturnType<typeof useModalTransition>).modalVisible).toBe(true);
  });

  it("returns containerStyle with opacity", async () => {
    const { result } = await renderHook(() => useModalTransition(true));
    expect((result.current as ReturnType<typeof useModalTransition>).containerStyle).toHaveProperty("opacity");
  });

  it("returns panelStyle with transform array", async () => {
    const { result } = await renderHook(() => useModalTransition(true));
    const r = result.current as ReturnType<typeof useModalTransition>;
    expect(r.panelStyle.transform).toHaveLength(2);
  });

  it("calls onClosed when animation finishes hiding", async () => {
    const onClosed = jest.fn();
    const { rerender } = await renderHook(
      ({ visible }: { visible: boolean }) => useModalTransition(visible, 16, 1, onClosed),
      { initialProps: { visible: true } },
    );

    await act(async () => { rerender({ visible: false }); });
    expect(onClosed).toHaveBeenCalled();
  });
});
