import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { findCompatibleSheets, createBucksSpreadsheet, saveTransaction } from "@/api/googleWorkspace";
import { calculateSummaries, SHEET_NAMES } from "@/domain/bucksLogic";
import { DEFAULT_TAGS, labelForTagId } from "@/utils/tags";
import { transactionToDraft } from "@/utils/transactions";
import type { LanguageMode, Tag, Transaction, SummaryRow } from "@/types";

export function combineTransactions(local: Transaction[], remote: Transaction[]): Transaction[] {
  // Deduplica por fingerprint estable (rowId+rawDate+createdAt) para evitar
  // claves React duplicadas cuando local y remoto ya contienen el mismo registro
  // tras el upload de fondo. Luego renumera para garantizar rowId únicos.
  const seen = new Set<string>();
  const unique: Transaction[] = [];
  for (const tx of [...local, ...remote]) {
    const k = `${tx.rowId}-${tx.rawDate}-${tx.createdAtMs ?? tx.createdAt ?? ""}`;
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(tx);
  }
  unique.sort((a, b) => {
    const da = a.rawDate.localeCompare(b.rawDate);
    if (da !== 0) return da;
    const ca = a.createdAtMs ?? a.createdAt ?? "";
    const cb = b.createdAtMs ?? b.createdAt ?? "";
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });
  return unique.map((tx, idx) => ({ ...tx, rowId: idx + 2 }));
}

// ponytail: djb2-like hash para color determinístico de tags huérfanos.
export function hashId(id: string): number {
  let hash = 5381;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) + hash + id.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function ensureTagsInCatalogue(
  transactions: Transaction[],
  currentTags: Tag[],
  language: LanguageMode,
  tagColors: string[],
): Tag[] {
  const existingIds = new Set(currentTags.map((t) => t.id));
  const toAdd: Tag[] = [];
  for (const t of transactions) {
    if (!t.tags) continue;
    for (const tagId of t.tags) {
      if (existingIds.has(tagId)) continue;
      existingIds.add(tagId);
      const dt = DEFAULT_TAGS.find((d) => d.id === tagId);
      if (dt) {
        toAdd.push({ id: dt.id, label: dt[language], color: dt.color });
      } else {
        toAdd.push({
          id: tagId,
          label: labelForTagId(tagId, currentTags),
          color: tagColors[hashId(tagId) % tagColors.length],
        });
      }
    }
  }
  return toAdd.length > 0 ? [...currentTags, ...toAdd] : currentTags;
}

export interface OfflineConnectDeps {
  syncQueueRef: { current: Promise<void> };
  setPendingSync: (v: boolean) => void;
  pendingSyncRef: { current: boolean };
  reloadFromGoogle: (token?: string, sheetId?: string, showLoader?: boolean, forceFresh?: boolean) => Promise<void>;
}

/**
 * Find a compatible spreadsheet in Drive or create one if none exists.
 * Returns the sheet ID and whether it was just created.
 * Pure discovery — no UI state, no selectSpreadsheet side effects.
 */
export async function findOrCreateSpreadsheet(
  token: string,
): Promise<{ sheetId: string; isNewSheet: boolean }> {
  const candidates = await findCompatibleSheets(token);
  const namedSheet = candidates.find(
    (c) => c.name.trim().toUpperCase() === SHEET_NAMES.transactions,
  );
  if (namedSheet) {
    return { sheetId: namedSheet.id, isNewSheet: false };
  }
  if (candidates.length > 0) {
    return { sheetId: candidates[0].id, isNewSheet: false };
  }
  const sheetId = await createBucksSpreadsheet(token);
  return { sheetId, isNewSheet: true };
}

export function scheduleBackgroundUpload(
  txs: Transaction[],
  sheetId: string,
  deps: OfflineConnectDeps,
) {
  deps.syncQueueRef.current = deps.syncQueueRef.current
    .catch(() => undefined)
    .then(async () => {
      const tokens = await GoogleSignin.getTokens();
      const fresh = tokens.accessToken || "";
      if (!fresh) return;
      deps.setPendingSync(true);
      deps.pendingSyncRef.current = true;
      for (const tx of txs) {
        try {
          await saveTransaction(fresh, sheetId, transactionToDraft(tx));
        } catch {
          // ponytail: best-effort; reloadFromGoogle reconcilia después
        }
      }
      deps.pendingSyncRef.current = false;
      deps.setPendingSync(false);
      await deps.reloadFromGoogle(fresh, sheetId, false, true);
    })
    .catch(() => {
      deps.pendingSyncRef.current = false;
      deps.setPendingSync(false);
    });
}

export async function handleOfflineAfterConnect(
  offlineTxs: Transaction[],
  wasOffline: boolean,
  isNewSheet: boolean,
  sheetId: string,
  fin: {
    applyFinancialState: (tx: Transaction[], summaries: SummaryRow[], freqIncome: Record<string, number>, syncedAt: string | null) => void;
    persistFinancialState: (tx: Transaction[], summaries: SummaryRow[], freqIncome: Record<string, number>, syncedAt?: string | null, sheetId?: string) => void;
    freqIncomeRef: { current: Record<string, number> };
  },
  tags: {
    tagsListRef: { current: Tag[] };
    setTagsList: React.Dispatch<React.SetStateAction<Tag[]>>;
  },
  helpers: {
    tagColors: string[];
    language: LanguageMode;
  },
  connectDeps: OfflineConnectDeps,
  sessionSetters: {
    setConnectionStatus: (v: string | null) => void;
    setOffline: (v: boolean) => void;
  },
  mergePromptRef: { current: ((cfg: { localCount: number; remoteCount: number; onMerge: () => void; onRemoteOnly: () => void }) => void) | null },
  remoteStatsRef: { current: { count: number; txs: Transaction[] } },
): Promise<void> {
  // Solo combina si viene de modo offline (datos locales sin cuenta). Al cambiar
  // de cuenta estando ya logueado (wasOffline=false) debe cambiar directo.
  if (!wasOffline || offlineTxs.length === 0) {
    sessionSetters.setConnectionStatus(null);
    sessionSetters.setOffline(false);
    return;
  }
  const { tagsListRef, setTagsList } = tags;
  if (isNewSheet) {
    fin.applyFinancialState(offlineTxs, calculateSummaries(offlineTxs, fin.freqIncomeRef.current), fin.freqIncomeRef.current, new Date().toISOString());
    const nextTags = ensureTagsInCatalogue(offlineTxs, tagsListRef.current, helpers.language, helpers.tagColors);
    if (nextTags !== tagsListRef.current) setTagsList(nextTags);
    fin.persistFinancialState(offlineTxs, [], fin.freqIncomeRef.current, new Date().toISOString(), sheetId);
    scheduleBackgroundUpload(offlineTxs, sheetId, connectDeps);
    await new Promise((r) => setTimeout(r, 2000));
    sessionSetters.setConnectionStatus(null);
    sessionSetters.setOffline(false);
    return;
  }
  const remoteCount = remoteStatsRef.current.count;
  const remoteTxs = remoteStatsRef.current.txs;
  await new Promise<void>((resolve) => {
    const cb = mergePromptRef.current;
    if (!cb) { sessionSetters.setConnectionStatus(null); sessionSetters.setOffline(false); resolve(); return; }
    cb({
      localCount: offlineTxs.length,
      remoteCount,
      onMerge: () => {
        const combined = combineTransactions(offlineTxs, remoteTxs);
        fin.applyFinancialState(combined, calculateSummaries(combined, fin.freqIncomeRef.current), fin.freqIncomeRef.current, new Date().toISOString());
        const nextTags = ensureTagsInCatalogue(combined, tagsListRef.current, helpers.language, helpers.tagColors);
        if (nextTags !== tagsListRef.current) setTagsList(nextTags);
        fin.persistFinancialState(combined, [], fin.freqIncomeRef.current, new Date().toISOString(), sheetId);
        scheduleBackgroundUpload(offlineTxs, sheetId, connectDeps);
        setTimeout(() => { sessionSetters.setConnectionStatus(null); sessionSetters.setOffline(false); }, 2000);
        resolve();
      },
      onRemoteOnly: () => { sessionSetters.setConnectionStatus(null); sessionSetters.setOffline(false); resolve(); },
    });
  });
}
