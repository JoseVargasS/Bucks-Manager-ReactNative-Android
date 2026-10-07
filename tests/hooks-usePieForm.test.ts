import { renderHook } from "@testing-library/react-native";
import { Animated } from "react-native";
import { usePieForm } from "@/hooks/usePieForm";
import { ANIM_PIE_FORM } from "@/theme/constants";

jest.mock("react-native", () => ({
  Animated: {
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      setValue: jest.fn(),
      stopAnimation: jest.fn(),
      addListener: jest.fn().mockReturnValue(1),
      removeListener: jest.fn(),
    })),
    timing: jest.fn().mockImplementation(() => ({ start: jest.fn() })),
  },
  Easing: {
    out: jest.fn().mockImplementation((e: unknown) => e),
    cubic: "cubic",
  },
}));

describe("usePieForm", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("starts unformed at zero progress", async () => {
    const { result } = await renderHook(() => usePieForm("a"));
    expect(result.current).toEqual({ progress: 0, formed: false });
  });

  it("drives formation on the JS driver", async () => {
    await renderHook(() => usePieForm("a"));
    expect(jest.mocked(Animated.timing)).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ duration: ANIM_PIE_FORM, useNativeDriver: false }),
    );
  });

  it("does not replay for the same identity", async () => {
    const { rerender } = await renderHook(
      ({ identity }: { identity: string }) => usePieForm(identity),
      { initialProps: { identity: "a" } },
    );
    await rerender({ identity: "a" });
    expect(jest.mocked(Animated.timing)).toHaveBeenCalledTimes(1);
  });

  it("replays when the identity changes", async () => {
    const { rerender } = await renderHook(
      ({ identity }: { identity: string }) => usePieForm(identity),
      { initialProps: { identity: "a" } },
    );
    await rerender({ identity: "b" });
    expect(jest.mocked(Animated.timing)).toHaveBeenCalledTimes(2);
  });
});
