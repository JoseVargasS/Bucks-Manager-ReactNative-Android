import { useEffect, useRef } from "react";
import { AppState, type Animated } from "react-native";
import { hideAsync } from "expo-splash-screen";
import { logError } from "@/utils/errorHandler";

// Log corto para el reintento fallido: cuenta + status, nunca el JSON crudo.
function shortForegroundError(error: unknown, accountEmail?: string): Error {
  const msg = error instanceof Error ? error.message : String(error);
  const status = msg.match(/Google API (\d+)/)?.[1];
  if (status === "401" || status === "403") {
    return new Error(`Google ${status} al reanudar (cuenta ${accountEmail || "?"}), reintento con token fresco falló`);
  }
  return new Error(msg.slice(0, 160));
}

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
  refreshSessionToken?: () => Promise<string | null>;
  isAuthFailure?: (error: unknown) => boolean;
  accountEmail?: string;
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
  refreshSessionToken,
  isAuthFailure,
  accountEmail,
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
  const refreshTokenRef = useRef(refreshSessionToken);
  refreshTokenRef.current = refreshSessionToken;
  const isAuthFailureRef = useRef(isAuthFailure);
  isAuthFailureRef.current = isAuthFailure;
  const accountEmailRef = useRef(accountEmail);
  accountEmailRef.current = accountEmail;
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
          void (async () => {
            // Usa refs actuales para no disparar reload con sheetId viejo tras A→B
            const freshSheetId = spreadsheetIdRefForFg.current;
            if (!freshSheetId) return;
            if (freshSheetId !== sheetId) return;
            // El token en memoria puede haber perdido vigencia en fondo: se
            // refresca sin UI antes del reload (fallback al actual si falla).
            const current = accessTokenRef.current;
            const refreshed = await refreshTokenRef.current?.().catch(() => null);
            const t = refreshed || current;
            if (!t) return;
            try {
              await reloadFromGoogleRef.current(t, freshSheetId, false);
            } catch (error) {
              // Un reintento con token recién refrescado ante 401/403; si igual
              // falla, log corto (sin el JSON crudo) con la cuenta para diagnóstico.
              if (isAuthFailureRef.current?.(error)) {
                const retry = await refreshTokenRef.current?.().catch(() => null);
                if (retry && retry !== t) {
                  await reloadFromGoogleRef.current(retry, freshSheetId, false)
                    .catch((retryError) => logError(shortForegroundError(retryError, accountEmailRef.current), "foreground:reload"));
                  return;
                }
              }
              logError(shortForegroundError(error, accountEmailRef.current), "foreground:reload");
            }
          })();
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
