import { useEffect } from "react";
import type { HistoryEntry } from "@/types";
import type { UiPreferencesSnapshot } from "@/hooks/usePreferences";
import { useSplashGate } from "@/hooks/useSplashGate";
import { usePinGate } from "@/hooks/usePinGate";
import { useForegroundSync } from "@/hooks/useForegroundSync";

export type MergePromptWireConfig = {
  localCount: number;
  remoteCount: number;
  onMerge: () => void;
  onRemoteOnly: () => void;
};

type UseAppShellParams = {
  bootstrapping: boolean;
  accountTransition: boolean;
  rehydratingCache: boolean;
  accessToken: string;
  spreadsheetId: string;
  isFirstRemoteLoad: boolean;
  hasLocalData: boolean;
  pinEnabled: boolean;
  pinVerified: boolean;
  snapThemeProgress: () => void;
  reloadFromGoogle: () => Promise<void>;
  wireRemoteHistory: (apply: (entries: HistoryEntry[]) => void) => void;
  wireRemoteUiPreferences: (apply: (prefs: UiPreferencesSnapshot) => void) => void;
  wireMergePrompt: (cb: (cfg: MergePromptWireConfig) => void) => void;
  applyRemotePreferences: (prefs: UiPreferencesSnapshot) => void;
  setHistoryEntries: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  openMergePrompt: (cfg: MergePromptWireConfig) => void;
};

/**
 * Owns the app shell lifecycle: splash gate, sheet→local wiring
 * (history, UI preferences, merge prompt), PIN gate, and foreground resume.
 * All wired callbacks are stable, so the effects below run once on mount
 * with honest deps (no exhaustive-deps disables).
 */
export function useAppShell({
  bootstrapping,
  accountTransition,
  rehydratingCache,
  accessToken,
  spreadsheetId,
  isFirstRemoteLoad,
  hasLocalData,
  pinEnabled,
  pinVerified,
  snapThemeProgress,
  reloadFromGoogle,
  wireRemoteHistory,
  wireRemoteUiPreferences,
  wireMergePrompt,
  applyRemotePreferences,
  setHistoryEntries,
  openMergePrompt,
}: UseAppShellParams) {
  const splashWanted = Boolean(
    bootstrapping ||
    accountTransition ||
    rehydratingCache ||
    (accessToken && isFirstRemoteLoad && !hasLocalData),
  );
  const { splashVisible, hideSplash, postSplashBlack } = useSplashGate(splashWanted);

  // Wire remote history (sheet → local) once on mount.
  useEffect(() => {
    wireRemoteHistory((sheetHistory) => {
      setHistoryEntries((prev) => {
        const byId = new Map<string, HistoryEntry>();
        for (const e of prev) byId.set(e.id, e);
        for (const e of sheetHistory) byId.set(e.id, e);
        return Array.from(byId.values());
      });
    });
  }, [wireRemoteHistory, setHistoryEntries]);

  // Wire the remote-applier (sheet → local) once on mount.
  useEffect(() => {
    wireRemoteUiPreferences(applyRemotePreferences);
  }, [wireRemoteUiPreferences, applyRemotePreferences]);

  // Wire the merge prompt (sheet → local) once on mount.
  useEffect(() => {
    wireMergePrompt(openMergePrompt);
  }, [wireMergePrompt, openMergePrompt]);

  const { pinGated, unlockAnim } = usePinGate(pinEnabled, pinVerified);
  useForegroundSync({
    accessToken,
    spreadsheetId,
    splashGone: !splashVisible,
    pinGated,
    unlockAnim,
    snapThemeProgress,
    reloadFromGoogle,
  });

  return { splashWanted, splashVisible, hideSplash, postSplashBlack, pinGated, unlockAnim };
}
