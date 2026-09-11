import { useEffect, useRef } from "react";
import { AppState, type Animated } from "react-native";
import { hideAsync } from "expo-splash-screen";
import { logError } from "@/utils/errorHandler";

type ForegroundSyncDeps = {
  accessToken: string;
  spreadsheetId: string;
  splashGone: boolean;
  pinGated: boolean;
  unlockAnim: Animated.Value;
  snapThemeProgress: () => void;
  reloadFromGoogle: (
    token?: string,
    sheetId?: string,
    showLoader?: boolean,
    forceFresh?: boolean,
  ) => Promise<void>;
};

/**
 * Foreground resume. The screen can come back blank when the app resumes:
 * the native splash may still be up, or an interrupted unlock/toggle
 * animation may have left content invisible. The token refresh is real but
 * heavy (a full sheet read + applyFinancialState), so it is debounced well
 * past the user's first interaction to avoid stealing the JS thread on
 * resume.
 */
export function useForegroundSync({
  accessToken,
  spreadsheetId,
  splashGone,
  pinGated,
  unlockAnim,
  snapThemeProgress,
  reloadFromGoogle,
}: ForegroundSyncDeps) {
  const onForegroundRef = useRef<() => void>(() => {});
  const foregroundReloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const accessTokenRef = useRef(accessToken);
  accessTokenRef.current = accessToken;
  const spreadsheetIdRefForFg = useRef(spreadsheetId);
  spreadsheetIdRefForFg.current = spreadsheetId;
  const splashGoneRef = useRef(splashGone);
  splashGoneRef.current = splashGone;
  const pinGatedRef = useRef(pinGated);
  pinGatedRef.current = pinGated;
  const reloadFromGoogleRef = useRef(reloadFromGoogle);
  reloadFromGoogleRef.current = reloadFromGoogle;
  const unlockAnimRef = useRef(unlockAnim);
  unlockAnimRef.current = unlockAnim;
  const snapThemeProgressRef = useRef(snapThemeProgress);
  snapThemeProgressRef.current = snapThemeProgress;
  useEffect(() => {
    onForegroundRef.current = () => {
      if (splashGoneRef.current) hideAsync().catch(() => undefined);
      unlockAnimRef.current.stopAnimation();
      unlockAnimRef.current.setValue(pinGatedRef.current ? 0 : 1);
      snapThemeProgressRef.current();
      const token = accessTokenRef.current;
      const sheetId = spreadsheetIdRefForFg.current;
      if (token && sheetId) {
        if (foregroundReloadTimerRef.current)
          clearTimeout(foregroundReloadTimerRef.current);
        foregroundReloadTimerRef.current = setTimeout(() => {
          // Usa refs actuales para no disparar reload con sheetId viejo tras A→B
          const freshToken = accessTokenRef.current;
          const freshSheetId = spreadsheetIdRefForFg.current;
          if (!freshToken || !freshSheetId) return;
          if (freshSheetId !== sheetId) return;
          reloadFromGoogleRef.current(freshToken, freshSheetId, false)
            .catch((error) => logError(error, "foreground:reload"));
        }, 1500);
      }
    };
  });
  useEffect(() => {
    const sub = AppState.addEventListener("change", (next) => {
      if (next === "active") onForegroundRef.current();
      if (next !== "active" && foregroundReloadTimerRef.current) {
        clearTimeout(foregroundReloadTimerRef.current);
        foregroundReloadTimerRef.current = null;
      }
    });
    return () => {
      sub.remove();
      if (foregroundReloadTimerRef.current)
        clearTimeout(foregroundReloadTimerRef.current);
    };
  }, []);
}
