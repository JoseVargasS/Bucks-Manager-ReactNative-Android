import { useEffect, useRef } from "react";
import { writeTagsCatalog } from "@/api/googleWorkspace";
import type { HistoryEntry, Tag } from "@/types";
import type { UiPreferencesSnapshot } from "./usePreferences";

/**
 * Manages three debounced sheet-write effects:
 * 1. UI preferences snapshot (language, currency, font, colour, theme)
 * 2. Deletion history entries
 * 3. Tag catalogue
 *
 * Each effect debounces writes by 1500 ms so that rapid local changes
 * are batched into a single remote write.  Refs are used for the write
 * functions so that new closure references (e.g. on every render of
 * the caller) do not tear the timer.
 */
export function useDebouncedSheetWrites(
  accessToken: string | null,
  spreadsheetId: string | null,
  preferences: {
    language: string;
    currencySymbol: string;
    fontPreference: string;
    fontSizeScale: number;
    colorScheme: string;
    theme: string;
  },
  writeUiPreferences: (snapshot: UiPreferencesSnapshot) => void,
  historyEntries: HistoryEntry[],
  writeHistory: (entries: HistoryEntry[]) => void,
  tagsList: Tag[],
) {
  // ─── UI preferences debounced write ────────────────────────────────
  const writeUiPrefsRef = useRef(writeUiPreferences);
  useEffect(() => {
    writeUiPrefsRef.current = writeUiPreferences;
  });
  const prevPrefsRef = useRef<typeof preferences | null>(null);

  useEffect(() => {
    if (!accessToken || !spreadsheetId) return;
    if (
      prevPrefsRef.current &&
      prevPrefsRef.current.language === preferences.language &&
      prevPrefsRef.current.currencySymbol === preferences.currencySymbol &&
      prevPrefsRef.current.fontPreference === preferences.fontPreference &&
      prevPrefsRef.current.fontSizeScale === preferences.fontSizeScale &&
      prevPrefsRef.current.colorScheme === preferences.colorScheme &&
      prevPrefsRef.current.theme === preferences.theme
    ) {
      return;
    }
    prevPrefsRef.current = preferences;
    const timer = setTimeout(() => {
      writeUiPrefsRef.current(preferences as UiPreferencesSnapshot);
    }, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    preferences.language,
    preferences.currencySymbol,
    preferences.fontPreference,
    preferences.fontSizeScale,
    preferences.colorScheme,
    preferences.theme,
    accessToken,
    spreadsheetId,
  ]);

  // ─── History debounced write ──────────────────────────────────────
  const writeHistoryRef = useRef(writeHistory);
  useEffect(() => {
    writeHistoryRef.current = writeHistory;
  });
  const prevHistoryLenRef = useRef(0);

  useEffect(() => {
    if (!accessToken || !spreadsheetId) return;
    if (historyEntries.length === prevHistoryLenRef.current) return;
    prevHistoryLenRef.current = historyEntries.length;
    const timer = setTimeout(() => {
      writeHistoryRef.current(historyEntries);
    }, 1500);
    return () => clearTimeout(timer);
  }, [historyEntries, accessToken, spreadsheetId]);

  // ─── Tags catalogue debounced write ───────────────────────────────
  const prevTagsRef = useRef(tagsList);

  useEffect(() => {
    if (!accessToken || !spreadsheetId) return;
    if (prevTagsRef.current === tagsList) return;
    prevTagsRef.current = tagsList;
    const timer = setTimeout(() => {
      writeTagsCatalog(accessToken, spreadsheetId, tagsList).catch(
        () => undefined,
      );
    }, 1500);
    return () => clearTimeout(timer);
  }, [tagsList, accessToken, spreadsheetId]);
}
