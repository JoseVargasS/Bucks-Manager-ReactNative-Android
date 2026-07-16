import { useCallback, useEffect, useState } from "react";
import { loadHistory } from "@/utils/history";
import type { HistoryEntry } from "@/types";

export function useHistoryPanel() {
  const [historyEntries, setHistoryEntries] = useState<HistoryEntry[]>([]);
  const [historyVisible, setHistoryVisible] = useState(false);

  useEffect(() => {
    loadHistory()
      .then(setHistoryEntries)
      .catch(() => undefined);
  }, []);

  const openHistory = useCallback(() => setHistoryVisible(true), []);
  const closeHistory = useCallback(() => setHistoryVisible(false), []);

  return {
    historyEntries,
    setHistoryEntries,
    historyVisible,
    openHistory,
    closeHistory,
  };
}
