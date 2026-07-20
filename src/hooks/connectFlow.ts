import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { saveTransaction } from "@/api/googleWorkspace";
import { calculateSummaries } from "@/domain/bucksLogic";
import { DEFAULT_TAGS, labelForTagId } from "@/utils/tags";
import { transactionToDraft } from "@/utils/transactions";
import type { LanguageMode, Tag, Transaction, SummaryRow } from "@/types";

export function combineTransactions(local: Transaction[], remote: Transaction[]): Transaction[] {
  const merged = [...local, ...remote];
  merged.sort((a, b) => {
    const da = a.rawDate.localeCompare(b.rawDate);
    if (da !== 0) return da;
    const ca = a.createdAtMs ?? a.createdAt ?? "";
    const cb = b.createdAtMs ?? b.createdAt ?? "";
    return ca < cb ? -1 : ca > cb ? 1 : 0;
  });
  return merged;
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
  if (offlineTxs.length === 0) {
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
