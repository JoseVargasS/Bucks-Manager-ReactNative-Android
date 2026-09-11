import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { hideAsync } from "expo-splash-screen";

/**
 * Splash gate: retains the splash mounted while it plays its exit fade.
 * The shell stays mounted behind the video splash; a black veil bridges
 * black → theme so the first frame never flashes `themeBg`.
 */
export function useSplashGate(splashWanted: boolean) {
  const [splashGone, setSplashGone] = useState(false);
  const hideSplash = useCallback(() => {
    hideAsync().catch(() => undefined);
    setSplashGone(true);
  }, []);
  useEffect(() => {
    if (splashWanted) setSplashGone(false);
  }, [splashWanted]);

  // Black veil after video: first frame post-splash stays #000000 then fades
  // 120ms hold + 280ms out, so there's no 1-frame plomo flash before dashboard
  const postSplashBlack = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!splashGone) return;
    postSplashBlack.setValue(1);
    Animated.timing(postSplashBlack, {
      toValue: 0,
      duration: 280,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [splashGone, postSplashBlack]);

  return { splashGone, hideSplash, postSplashBlack };
}
