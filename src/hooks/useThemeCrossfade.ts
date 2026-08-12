import { useCallback, useEffect, useMemo, useRef } from "react";
import { Animated, Easing } from "react-native";
import { getPalette, type ColorSchemePreference } from "@/theme/colors";
import type { ThemeMode } from "@/types";

/**
 * Encapsulates the animated theme crossfade transition.
 *
 * Creates an Animated.Value that interpolates between the light and dark
 * background colors, and provides a toggle callback that runs the
 * animation, flips the theme, and persists the choice.
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

  const themeBgDark = useMemo(
    () => getPalette("dark", accentColorScheme).bg,
    [accentColorScheme],
  );
  const themeBgLight = useMemo(
    () => getPalette("light", accentColorScheme).bg,
    [accentColorScheme],
  );
  const themeProgressBg = useMemo(
    () =>
      themeProgress.interpolate({
        inputRange: [0, 1],
        outputRange: [themeBgLight, themeBgDark],
      }),
    [themeProgress, themeBgLight, themeBgDark],
  );

  const toggleThemeWithCrossfade = useCallback(() => {
    const goingDark = theme !== "dark";
    const target = goingDark ? 1 : 0;
    themeAnimRef.current?.stop();
    themeAnimRef.current = Animated.timing(themeProgress, {
      toValue: target,
      duration: 50,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    themeAnimRef.current.start();
    lastAnimatedThemeRef.current = goingDark ? "dark" : "light";
    toggleTheme();
    saveTheme(goingDark ? "dark" : "light");
  }, [theme, themeProgress, toggleTheme, saveTheme]);

  return { themeProgressBg, toggleThemeWithCrossfade };
}
