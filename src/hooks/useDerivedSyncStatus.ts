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
  // ponytail: "Mostrando datos guardados" era puro ruido — con datos locales
  // no se muestra nada, al user no le interesa el estado del sync.
  if (syncError) return hasLocalData ? "" : syncError;
  if (pendingSync) return copy.pendingSyncStatus;
  if (isSyncing) {
    return hasLocalData ? "" : copy.syncing;
  }
  return "";
}
