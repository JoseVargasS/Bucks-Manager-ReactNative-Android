import { useEffect, useRef, useState } from "react";
import { Keyboard } from "react-native";

export function useKeyboardOffset(visible: boolean, transform: (height: number) => number = (h) => h) {
  const [offset, setOffset] = useState(0);
  const transformRef = useRef(transform);
  transformRef.current = transform;
  useEffect(() => {
    if (!visible) {
      setOffset(0);
      return;
    }
    const showSub = Keyboard.addListener("keyboardDidShow", (e) => {
      setOffset(transformRef.current(e.endCoordinates.height));
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => setOffset(0));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [visible]);
  return offset;
}
