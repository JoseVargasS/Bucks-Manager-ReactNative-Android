import { useEffect, useRef } from "react";
import { Animated, Easing } from "react-native";

/**
 * PIN unlock transition. Content is gated only while the PIN screen actually
 * blocks it. usePin sets pinVerified to false whenever the app backgrounds —
 * even with PIN disabled — so keying the unlock animation off pinVerified
 * alone would leave the content invisible (black screen) on return.
 */
export function usePinGate(pinEnabled: boolean, pinVerified: boolean) {
  const pinGated = pinEnabled && !pinVerified;
  const unlockAnim = useRef(new Animated.Value(pinGated ? 0 : 1)).current;
  useEffect(() => {
    if (pinGated) {
      unlockAnim.setValue(0);
    } else {
      Animated.timing(unlockAnim, {
        toValue: 1,
        duration: 380,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: false,
      }).start();
    }
  }, [pinGated, unlockAnim]);

  return { pinGated, unlockAnim };
}
