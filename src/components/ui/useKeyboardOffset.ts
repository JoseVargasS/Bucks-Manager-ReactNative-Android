import { useEffect, useState } from "react";
import { Keyboard } from "react-native";

export function useKeyboardOffset(visible: boolean, transform: (height: number) => number = (h) => h) {
  const [offset, setOffset] = useState(0);
  useEffect(() => {
    if (!visible) {
      setOffset(0);
      return;
    }
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setOffset(transform(e.endCoordinates.height));
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setOffset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [transform, visible]);
  return offset;
}

