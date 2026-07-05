import { useEffect, useRef } from "react";
import { Animated } from "react-native";

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
        useNativeDriver: false,
      }),
    );
    Animated.parallel(anims).start();
  }, [selectedIndex, itemCount]);

  return opacitiesRef;
}
