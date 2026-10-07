import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { ANIM_VALUE_FADE } from "@/theme/constants";

/**
 * Softens background-sync value jumps (hydration, reconciliation) on KPI and
 * card amounts: dips opacity when the displayed string changes, then eases
 * back. Opacity only on the native driver — never blocks interaction, and
 * list rows must not use it (render budget).
 */
export function useValueFade(value: string) {
  const valueRef = useRef<Animated.Value | null>(null);
  if (!valueRef.current) valueRef.current = new Animated.Value(1);
  const animated = valueRef.current;
  const prevRef = useRef(value);

  useEffect(() => {
    if (prevRef.current === value) return;
    prevRef.current = value;
    animated.stopAnimation();
    animated.setValue(0.55);
    Animated.timing(animated, {
      toValue: 1,
      duration: ANIM_VALUE_FADE,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [value, animated]);

  return { opacity: animated };
}
