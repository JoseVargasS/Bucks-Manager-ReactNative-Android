import { useEffect, useRef, useState } from "react";
import { Keyboard, Platform } from "react-native";

export function useKeyboardOffset(visible: boolean, transform: (height: number) => number = (h) => h) {
  const [offset, setOffset] = useState(0);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  useEffect(() => {
    if (!visible) {
      setOffset(0);
      return;
    }
    // ponytail: willShow on iOS arrives before the frame covers inputs;
    // Android only reliably sends didShow
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setOffset(transformRef.current(e.endCoordinates.height));
      },
    );
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setOffset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);
  return offset;
}
