import { renderHook, act } from "@testing-library/react-native";
import { Animated } from "react-native";
import { ANIM_TAB_PAGER } from "@/theme/constants";
import { useTabNavigation } from "@/hooks/useTabNavigation";

const startMock = jest.fn();

jest.mock("react-native", () => ({
  Animated: {
    Value: jest.fn().mockImplementation((val: number) => ({
      _value: val,
      setValue: jest.fn(),
      stopAnimation: jest.fn(),
      interpolate: jest.fn(),
    })),
    timing: jest.fn().mockImplementation(() => ({
      start: startMock,
    })),
  },
  Easing: {
    out: jest.fn().mockReturnValue("easing-out"),
  },
  useWindowDimensions: jest.fn().mockReturnValue({ width: 400, height: 800 }),
  StatusBar: { currentHeight: 24 },
}));

const timing = Animated.timing as jest.Mock;

function finishSlide(finished: boolean) {
  const cb = startMock.mock.calls[0][0] as (r: { finished: boolean }) => void;
  cb({ finished });
}

describe("useTabNavigation", () => {
  beforeEach(() => {
    timing.mockClear();
    startMock.mockClear();
  });

  test("difiere el commit al completar el slide, no al presionar", async () => {
    const { result } = await renderHook(() => useTabNavigation());
    await act(async () => {
      result.current.changeTab("expenses");
    });
    // El slide arranca pero el estado commitea en reposo.
    expect(result.current.tab).toBe("dashboard");
    expect(result.current.paging).toBe(true);
    expect(timing).toHaveBeenCalledTimes(1);
    await act(async () => {
      finishSlide(true);
    });
    expect(result.current.tab).toBe("expenses");
    expect(result.current.paging).toBe(false);
  });

  test("ignora el completion de un slide cancelado", async () => {
    const { result } = await renderHook(() => useTabNavigation());
    await act(async () => {
      result.current.changeTab("summary");
    });
    expect(result.current.paging).toBe(true);
    await act(async () => {
      finishSlide(false);
    });
    expect(result.current.tab).toBe("dashboard");
    expect(result.current.paging).toBe(false);
  });

  test("changeTab anima el pager al indice por el ancho", async () => {
    const { result } = await renderHook(() => useTabNavigation());
    await act(async () => {
      result.current.changeTab("summary");
    });
    expect(timing).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ toValue: -2 * 400, duration: ANIM_TAB_PAGER }),
    );
  });

  test("changeTab al tab actual es no-op", async () => {
    const { result } = await renderHook(() => useTabNavigation());
    await act(async () => {
      result.current.changeTab("dashboard");
    });
    expect(timing).not.toHaveBeenCalled();
    expect(result.current.tab).toBe("dashboard");
  });
});
