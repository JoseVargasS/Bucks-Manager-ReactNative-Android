import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { ANIM_PIE_FORM } from "@/theme/constants";

/**
 * Circular donut formation: progress 0→1 that the caller maps to arc angles
 * (each slice grows from the top). Progress lives in state — the subtree is
 * tiny (a handful of paths) and it only re-renders for ~600ms per data
 * change. JS driver on purpose: path `d` cannot interpolate on the native
 * driver (same reason as the theme shell). Replays on every data-identity
 * change; labels render once `formed` flips at the end. Interaction is never
 * blocked.
 *
 * Two anti-jank measures: state updates are throttled to ~30fps (a 120Hz
 * panel would otherwise re-render 120 times a second), and the start waits
 * one frame so a month-change commit paints before the formation competes
 * for the JS thread.
 */
const FORM_FRAME_MS = 33;

export function usePieForm(identity: unknown): { progress: number; formed: boolean } {
  const [progress, setProgress] = useState(0);
  const [formed, setFormed] = useState(false);
  const progressRef = useRef<Animated.Value | null>(null);
  if (!progressRef.current) progressRef.current = new Animated.Value(0);
  const animated = progressRef.current;
  const prevRef = useRef<{ seen: boolean; identity: unknown }>({ seen: false, identity });

  useEffect(() => {
    const prev = prevRef.current;
    if (prev.seen && prev.identity === identity) return;
    prev.seen = true;
    prev.identity = identity;
    animated.stopAnimation();
    setFormed(false);
    animated.setValue(0);
    setProgress(0);
    let listenerId = "";
    let lastEmit = 0;
    let cancelled = false;
    const begin = () => {
      if (cancelled) return;
      listenerId = animated.addListener(({ value }) => {
        const now = Date.now();
        if (value < 1 && now - lastEmit < FORM_FRAME_MS) return;
        lastEmit = now;
        setProgress(value);
      });
      Animated.timing(animated, {
        toValue: 1,
        duration: ANIM_PIE_FORM,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start(({ finished }) => {
        animated.removeListener(listenerId);
        if (finished && !cancelled) {
          setProgress(1);
          setFormed(true);
        }
      });
    };
    // Wait one frame so a month-change commit paints before the formation
    // competes for the JS thread. Falls back to immediate start where
    // requestAnimationFrame is unavailable (tests).
    if (typeof requestAnimationFrame === "function") requestAnimationFrame(begin);
    else begin();
    return () => {
      cancelled = true;
      animated.removeListener(listenerId);
    };
  }, [identity, animated]);

  return { progress, formed };
}
