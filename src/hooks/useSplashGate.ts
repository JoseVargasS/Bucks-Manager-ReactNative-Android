import { useCallback, useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
import { hideAsync } from "expo-splash-screen";

/**
 * Splash gate: retains the splash mounted while it plays its exit fade.
 * The shell stays mounted behind the video splash; a black veil bridges
 * black → theme so the first frame never flashes `themeBg`.
 *
 * Two states: `splashGone` (logic: video finished) vs `splashVisible`
 * (mount: overlay stays until the veil fade completes, so the unmount
 * commit never coincides with the veil start and can't blink a frame).
 * Native modals must gate on `!splashVisible` — RN `Modal` paints above
 * the splash overlay.
 */
export function useSplashGate(splashWanted: boolean) {
  const [splashGone, setSplashGone] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);
  const veilAnimRef = useRef<Animated.CompositeAnimation | null>(null);
  const hideSplash = useCallback(() => {
    hideAsync().catch(() => undefined);
    setSplashGone(true);
  }, []);
  useEffect(() => {
    if (splashWanted) {
      setSplashGone(false);
      setSplashVisible(true);
    }
  }, [splashWanted]);

  // Black veil after video: first frame post-splash stays #000000 then fades
  // 120ms hold + 280ms out, so there's no 1-frame plomo flash before dashboard
  const postSplashBlack = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    veilAnimRef.current?.stop();
    if (!splashGone) {
      postSplashBlack.setValue(1);
      return;
    }
    postSplashBlack.setValue(1);
    const anim = Animated.timing(postSplashBlack, {
      toValue: 0,
      duration: 280,
      delay: 120,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    });
    veilAnimRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) setSplashVisible(false);
    });
    const fallback = setTimeout(() => setSplashVisible(false), 900);
    return () => clearTimeout(fallback);
  }, [splashGone, postSplashBlack]);

  return { splashGone, splashVisible, hideSplash, postSplashBlack };
}
