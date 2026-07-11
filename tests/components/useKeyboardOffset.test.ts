import { renderHook, act } from "@testing-library/react-native";
import { Keyboard } from "react-native";
import { useKeyboardOffset } from "@/components/ui/useKeyboardOffset";

jest.mock("react-native", () => ({
  Keyboard: {
    addListener: jest.fn(() => ({ remove: jest.fn() })),
  },
}));

describe("useKeyboardOffset", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("returns 0 when not visible", async () => {
    const { result } = await renderHook(() => useKeyboardOffset(false));
    expect(result.current).toBe(0);
  });

  it("subscribes to keyboard events when visible", async () => {
    await renderHook(() => useKeyboardOffset(true));
    expect(Keyboard.addListener).toHaveBeenCalledWith("keyboardDidShow", expect.any(Function));
    expect(Keyboard.addListener).toHaveBeenCalledWith("keyboardDidHide", expect.any(Function));
  });

  it("updates offset on keyboard show", async () => {
    let showCallback: (e: { endCoordinates: { height: number } }) => void = () => {};
    (Keyboard.addListener as jest.Mock).mockImplementation((event, cb) => {
      if (event === "keyboardDidShow") showCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = await renderHook(() => useKeyboardOffset(true));
    await act(async () => { showCallback({ endCoordinates: { height: 300 } }); });
    expect(result.current).toBe(300);
  });

  it("resets offset on keyboard hide", async () => {
    let hideCallback: () => void = () => {};
    (Keyboard.addListener as jest.Mock).mockImplementation((event, cb) => {
      if (event === "keyboardDidHide") hideCallback = cb;
      return { remove: jest.fn() };
    });

    const { result } = await renderHook(() => useKeyboardOffset(true));
    await act(async () => { hideCallback(); });
    expect(result.current).toBe(0);
  });

  it("applies transform function", async () => {
    let showCallback: (e: { endCoordinates: { height: number } }) => void = () => {};
    (Keyboard.addListener as jest.Mock).mockImplementation((event, cb) => {
      if (event === "keyboardDidShow") showCallback = cb;
      return { remove: jest.fn() };
    });

    const transform = (h: number) => h * 0.5;
    const { result } = await renderHook(() => useKeyboardOffset(true, transform));
    await act(async () => { showCallback({ endCoordinates: { height: 400 } }); });
    expect(result.current).toBe(200);
  });

  it("cleans up listeners on unmount", async () => {
    const { unmount } = await renderHook(() => useKeyboardOffset(true));
    unmount();
    expect(Keyboard.addListener).toHaveBeenCalled();
  });
});
