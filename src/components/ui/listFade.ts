import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { ANIM_LIST_FADE } from "@/theme/constants";

/**
 * Container-level list veil: fades the whole list on period/filter identity
 * change (never per recycled row — the SectionList virtualizer, keyExtractor
 * and removeClippedSubviews contract stay untouched). Native driver.
 */
export function useListFade(identity: string) {
  const valueRef = useRef<Animated.Value | null>(null);
  if (!valueRef.current) valueRef.current = new Animated.Value(1);
  const value = valueRef.current;
  const prevRef = useRef<{ seen: boolean; identity: string }>({ seen: false, identity });

  useEffect(() => {
    const prev = prevRef.current;
    if (!prev.seen) {
      prev.seen = true;
      prev.identity = identity;
      return;
    }
    if (prev.identity === identity) return;
    prev.identity = identity;
    value.stopAnimation();
    value.setValue(0.6);
    Animated.timing(value, {
      toValue: 1,
      duration: ANIM_LIST_FADE,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [identity, value]);

  return { opacity: value };
}
