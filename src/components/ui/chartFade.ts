import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";
import { ANIM_CHART_ENTER } from "@/theme/constants";

const DIM_OPACITY = 0.32;
const IDLE_OPACITY = 0.94;
const SELECTED_OPACITY = 1;

export function useChartFade(itemCount: number, selectedIndex: number, dataIdentity?: unknown) {
  const opacitiesRef = useRef<Animated.Value[]>([]);
  const dataRef = useRef(dataIdentity);

  if (opacitiesRef.current.length !== itemCount || dataIdentity !== dataRef.current) {
    opacitiesRef.current = Array.from({ length: itemCount }, () => new Animated.Value(IDLE_OPACITY));
    dataRef.current = dataIdentity;
  }

  useEffect(() => {
    const opacities = opacitiesRef.current;
    if (opacities.length === 0) return;
    const target = selectedIndex === -1 ? IDLE_OPACITY : DIM_OPACITY;
    const anims = opacities.map((value, i) =>
      Animated.timing(value, {
        toValue: i === selectedIndex ? SELECTED_OPACITY : target,
        duration: 220,
        useNativeDriver: true,
      }),
    );
    Animated.parallel(anims).start();
  }, [selectedIndex, itemCount]);

  return opacitiesRef;
}

/**
 * Shared chart entrance: fades, rises and settles the whole chart whenever
 * its data identity changes (period/tab/segment switch). First mount stays
 * visible — container-level, rows/slices untouched, native driver.
 */
export function useChartEnter(identity: unknown) {
  const valueRef = useRef<Animated.Value | null>(null);
  if (!valueRef.current) valueRef.current = new Animated.Value(1);
  const value = valueRef.current;
  const prevRef = useRef<{ seen: boolean; identity: unknown }>({ seen: false, identity });

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
    value.setValue(0);
    Animated.timing(value, {
      toValue: 1,
      duration: ANIM_CHART_ENTER,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [identity, value]);

  return {
    opacity: value.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
    transform: [
      { translateY: value.interpolate({ inputRange: [0, 1], outputRange: [10, 0] }) },
      { scale: value.interpolate({ inputRange: [0, 1], outputRange: [0.97, 1] }) },
    ],
  };
}
