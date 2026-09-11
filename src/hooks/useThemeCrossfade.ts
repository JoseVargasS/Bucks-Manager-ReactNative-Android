import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Easing } from "react-native";
import { getPalette, type ColorSchemePreference } from "@/theme/colors";
import type { ThemeMode } from "@/types";

/**
 * Encapsulates the animated theme crossfade transition.
 *
 * React Native's core Animated cannot interpolate colors on the native
 * driver, so the background crossfade is drawn as two opacity overlays over a
 * solid base color that always matches the current theme. If a transition is
 * interrupted (e.g. the app is backgrounded mid-animation) the screen keeps a
 * valid solid background instead of a broken/black one.
 *
 * When the theme changes externally (e.g. from preference restore on
 * startup), a useEffect syncs `themeProgress` without animation so the
 * background colour is correct from the first frame.
 */
export function useThemeCrossfade(
  theme: ThemeMode,
  accentColorScheme: ColorSchemePreference,
  toggleTheme: () => void,
  saveTheme: (t: ThemeMode) => void,
) {
  const themeRef = useRef<Animated.Value | null>(null);
  if (!themeRef.current)
    themeRef.current = new Animated.Value(theme === "dark" ? 1 : 0);
  const themeProgress = themeRef.current;
  const themeAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  // Tracks the last theme that was set BY the toggle animation.
  // When the theme changes from elsewhere (e.g. preference restore),
  // the useEffect below snaps themeProgress to match without animating.
  const lastAnimatedThemeRef = useRef(theme);

  // Sync themeProgress when the theme changes externally.
  useEffect(() => {
    if (theme !== lastAnimatedThemeRef.current) {
      themeProgress.setValue(theme === "dark" ? 1 : 0);
      lastAnimatedThemeRef.current = theme;
    }
  }, [theme, themeProgress]);

  // Stop any in-flight transition on unmount so the value cannot leak.
  useEffect(() => () => themeAnimRef.current?.stop(), []);

  const themeBgDark = useMemo(
    () => getPalette("dark", accentColorScheme).bg,
    [accentColorScheme],
  );
  const themeBgLight = useMemo(
    () => getPalette("light", accentColorScheme).bg,
    [accentColorScheme],
  );

  // Solid base color — always valid, independent of the animation state.
  const themeBg = theme === "dark" ? themeBgDark : themeBgLight;

  // Two overlays replace the color interpolation: dark fades in, light fades
  // out, so the crossfade stays smooth in both directions.
  const themeDarkOverlay = useMemo(
    () => ({
      backgroundColor: themeBgDark,
      opacity: themeProgress,
    }),
    [themeBgDark, themeProgress],
  );
  const themeLightOverlay = useMemo(
    () => ({
      backgroundColor: themeBgLight,
      opacity: themeProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [1, 0],
      }),
    }),
    [themeBgLight, themeProgress],
  );
  const themeProgressContentOpacity = useMemo(
    () =>
      themeProgress.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [1, 0.92, 1],
      }),
    [themeProgress],
  );

  // Snaps the transition to the current theme. Used on foreground resume so
  // a backgrounded mid-animation value cannot leave a stale blended overlay.
  const snapThemeProgress = useCallback(() => {
    themeAnimRef.current?.stop();
    themeProgress.setValue(theme === "dark" ? 1 : 0);
  }, [theme, themeProgress]);

  const toggleThemeWithCrossfade = useCallback(() => {
    const goingDark = theme !== "dark";
    const target = goingDark ? 1 : 0;
    themeAnimRef.current?.stop();
    themeAnimRef.current = Animated.timing(themeProgress, {
      toValue: target,
      duration: 320,
      easing: Easing.out(Easing.cubic),
      // ponytail: opacity-only overlays, safe on native driver (no color interpolation)
      useNativeDriver: true,
    });
    themeAnimRef.current.start();
    lastAnimatedThemeRef.current = goingDark ? "dark" : "light";
    toggleTheme();
    saveTheme(goingDark ? "dark" : "light");
  }, [theme, themeProgress, toggleTheme, saveTheme]);

  return {
    themeBg,
    themeDarkOverlay,
    themeLightOverlay,
    themeProgressContentOpacity,
    toggleThemeWithCrossfade,
    snapThemeProgress,
  };
}
