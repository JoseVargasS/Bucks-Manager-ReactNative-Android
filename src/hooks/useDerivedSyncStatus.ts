import type { UiCopy } from "@/i18n";

type SyncStatusInput = {
  authError: string;
  syncError: string;
  hasLocalData: boolean;
  pendingSync: boolean;
  isSyncing: boolean;
  copy: Pick<UiCopy, "showingSavedData" | "pendingSyncStatus" | "syncing">;
};

export function useDerivedSyncStatus({
  authError,
  syncError,
  hasLocalData,
  pendingSync,
  isSyncing,
  copy,
}: SyncStatusInput): string {
  if (authError) return authError;
  if (syncError) return hasLocalData ? copy.showingSavedData : syncError;
  if (pendingSync) return copy.pendingSyncStatus;
  if (isSyncing) {
    return hasLocalData
      ? `${copy.showingSavedData} · ${copy.syncing.toLowerCase()}`
      : copy.syncing;
  }
  return "";
}
