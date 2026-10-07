import { useEffect, useRef } from "react";
import { Animated } from "react-native";

const SWEEP_HIGHLIGHT_DURATION = 220;
const SWEEP_HOLD_DURATION = 260;
const SWEEP_GAP_DURATION = 140;
const SWEEP_START_DELAY = 380;
const SWEEP_IDLE_OPACITY = 0.94;
const SWEEP_MAX_CYCLES = 3;

/** Runs a finite highlight sweep across pie slices on first mount only, then stops. */
export function usePieSweep(opacities: Animated.Value[], selectedKey: string | null): void {
  const sweepToken = useRef(0);
  const hasSweptRef = useRef(false);

  useEffect(() => {
    if (selectedKey !== null) return;
    if (opacities.length === 0) return;
    // Data changes are covered by the shared chart entrance (useChartEnter);
    // replaying the sweep on every change reads as lag, not polish.
    if (hasSweptRef.current) return;
    hasSweptRef.current = true;
    const token = ++sweepToken.current;
    const n = opacities.length;
    let i = 0;
    let cycles = 0;
    const step = () => {
      if (sweepToken.current !== token) return;
      if (cycles >= SWEEP_MAX_CYCLES) return;
      Animated.timing(opacities[i], {
        toValue: 1,
        duration: SWEEP_HIGHLIGHT_DURATION,
        useNativeDriver: true,
      }).start();
      setTimeout(() => {
        if (sweepToken.current !== token) return;
        Animated.timing(opacities[i], {
          toValue: SWEEP_IDLE_OPACITY,
          duration: SWEEP_HIGHLIGHT_DURATION,
          useNativeDriver: true,
        }).start();
        i = (i + 1) % n;
        if (i === 0) cycles += 1;
        if (sweepToken.current === token && cycles < SWEEP_MAX_CYCLES) {
          setTimeout(step, SWEEP_GAP_DURATION);
        }
      }, SWEEP_HOLD_DURATION);
    };
    const initial = setTimeout(step, SWEEP_START_DELAY);
    return () => {
      clearTimeout(initial);
    };
  }, [selectedKey, opacities]);
}
