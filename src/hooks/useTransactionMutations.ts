import { Alert } from "react-native";
import {
  buildTransactionFromDraft,
  insertChronologically,
  uniqueMonthKeys,
} from "@/domain/bucksLogic";
import { transactionToDraft } from "@/utils/transactions";
import { markFreshCreatedAt } from "@/utils/freshRows";
import { addHistoryEntry, removeHistoryEntry } from "@/utils/history";
import {
  saveTransaction,
  insertTransactionAtRow,
  updateTransaction as updateGoogleTransaction,
  deleteTransaction as deleteGoogleTransaction,
  moveTransaction as moveGoogleTransaction,
} from "@/api/googleWorkspace";
import type {
  HistoryEntry,
  SummaryRow,
  Transaction,
  TransactionDraft,
} from "@/types";

interface FinState {
  transactions: Transaction[];
  summaries: SummaryRow[];
  freqIncome: Record<string, number>;
  month: number;
  year: number;
  selectedRows: number[];
  recalcAndReplaceTransactions: (next: Transaction[], affectedMonths: string[]) => void;
  setPeriod: (month: number, year: number) => void;
  toggleSearchActive: (active: boolean) => void;
  clearSelection: () => void;
  removeFromSelection: (rowId: number) => void;
  renumberTransactions: (items: Transaction[]) => Transaction[];
  persistFinancialState: (tx: Transaction[], summaries: SummaryRow[], freqIncome: Record<string, number>, syncedAt?: string | null, sheetId?: string) => void;
}

interface SessionState {
  accessToken: string;
  spreadsheetId: string;
}

interface SyncApi {
  reloadFromGoogle: (token?: string, sheetId?: string, showLoader?: boolean, forceFresh?: boolean) => Promise<void>;
  syncGoogleInBackground: (task: (freshToken: string) => Promise<void>, title: string) => void;
  pendingSyncRef: React.MutableRefObject<boolean>;
}

export interface TransactionMutationsApi {
  submitDraft: (currentDraft: TransactionDraft, currentEdit: Transaction | null) => boolean;
  deleteTx: (tx: Transaction) => Promise<void>;
  deleteSelectedRows: () => Promise<void>;
  undoDeleteEntry: (entry: HistoryEntry) => Promise<void>;
  moveTx: (tx: Transaction, direction: "up" | "down") => Promise<void>;
  reconcilePeriod: (nextTransactions: Transaction[], currentMonth: number, currentYear: number) => void;
}

export function useTransactionMutations(
  fin: FinState,
  session: SessionState,
  sync: SyncApi,
  history: {
    setHistoryEntries: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
  },
  copy: { incompleteData: string; completeRequired: string; editRecord: string; newRecord: string; deleteRecord: string; deleteSelection: string; moveRecord: string; moveRecordError: string; undoAction: string },
): TransactionMutationsApi {
  const {
    transactions, recalcAndReplaceTransactions,
    freqIncome,
    month, year, setPeriod, toggleSearchActive, clearSelection, removeFromSelection,
    selectedRows,
    renumberTransactions, persistFinancialState,
  } = fin;
  const { accessToken, spreadsheetId } = session;
  const { reloadFromGoogle, syncGoogleInBackground, pendingSyncRef } = sync;
  const { setHistoryEntries } = history;

  /** Updates local state and persists cache after a transaction mutation. */
  function applyTransactionUpdate(next: Transaction[], affectedMonths: string[]) {
    recalcAndReplaceTransactions(next, affectedMonths);
    persistFinancialState(next, [], freqIncome, undefined, spreadsheetId);
  }

  /** Queues a Google Sheets write via the sync queue, then reconciles state. */
  function syncWithReload(apiCall: (freshToken: string) => Promise<void>, title: string) {
    pendingSyncRef.current = true;
    syncGoogleInBackground(async (freshToken) => {
      await apiCall(freshToken);
      await reloadFromGoogle(freshToken, spreadsheetId, false, true);
    }, title);
  }

  function reconcilePeriod(
    nextTransactions: Transaction[],
    currentMonth: number,
    currentYear: number,
  ) {
    const stillHasData = nextTransactions.some((tx) => {
      const d = tx.rawDateMs != null ? new Date(tx.rawDateMs) : new Date(tx.rawDate);
      return !Number.isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
    });
    if (stillHasData) return;
    let bestTs = 0;
    for (const tx of nextTransactions) {
      const ts = tx.rawDateMs ?? Date.parse(tx.rawDate);
      if (ts > bestTs && !Number.isNaN(ts)) bestTs = ts;
    }
    if (bestTs > 0) {
      const d = new Date(bestTs);
      setPeriod(d.getMonth(), d.getFullYear());
    } else {
      setPeriod(new Date().getMonth(), new Date().getFullYear());
    }
    toggleSearchActive(false);
    clearSelection();
  }

  function submitDraft(
    currentDraft: TransactionDraft,
    currentEdit: Transaction | null,
  ): boolean {
    if (!currentDraft.date) {
      Alert.alert(copy.incompleteData, copy.completeRequired);
      return false;
    }
    if (currentDraft.lineItems && currentDraft.lineItems.length > 0) {
      const hasAmount = currentDraft.lineItems.some((li) => li.amount.trim());
      if (!hasAmount) {
        Alert.alert(copy.incompleteData, copy.completeRequired);
        return false;
      }
    } else if (!currentDraft.amount || !currentDraft.detail.trim()) {
      Alert.alert(copy.incompleteData, copy.completeRequired);
      return false;
    }
    const optimistic = buildTransactionFromDraft(
      currentDraft,
      currentEdit?.rowId || transactions.length + 2,
    );
    const next = currentEdit
      ? renumberTransactions(
          insertChronologically(
            transactions.filter(
              (tx) => tx.rowId !== currentEdit.rowId,
            ),
            optimistic,
          ),
        )
      : renumberTransactions(
          insertChronologically(transactions, optimistic),
        );
    const affectedMonths = currentEdit
      ? uniqueMonthKeys([currentEdit, optimistic])
      : uniqueMonthKeys([optimistic]);
    applyTransactionUpdate(next, affectedMonths);
    markFreshCreatedAt([optimistic.createdAtMs]);
    if (!currentEdit) {
      const txDate = new Date(optimistic.rawDate);
      if (!Number.isNaN(txDate.getTime())) {
        setPeriod(txDate.getMonth(), txDate.getFullYear());
        toggleSearchActive(false);
        clearSelection();
      }
    }
    if (accessToken && spreadsheetId) {
      syncWithReload(
        async (freshToken) => {
          if (currentEdit) {
            await updateGoogleTransaction(freshToken, spreadsheetId, currentEdit.rowId, currentDraft);
          } else {
            await saveTransaction(freshToken, spreadsheetId, currentDraft);
          }
        },
        currentEdit ? copy.editRecord : copy.newRecord,
      );
    }
    return true;
  }

  async function deleteTx(tx: Transaction) {
    removeFromSelection(tx.rowId);
    const next = renumberTransactions(
      transactions.filter((item) => item.rowId !== tx.rowId),
    );
    applyTransactionUpdate(next, uniqueMonthKeys([tx]));
    reconcilePeriod(next, month, year);
    addHistoryEntry({ action: "delete", transaction: tx })
      .then((entry) => setHistoryEntries((prev) => [entry, ...prev]))
      .catch(() => undefined);
    if (accessToken && spreadsheetId) {
      syncWithReload((t) => deleteGoogleTransaction(t, spreadsheetId, tx.rowId), copy.deleteRecord);
    }
  }

  async function deleteSelectedRows() {
    const selectedIds = new Set(selectedRows);
    const selected = transactions
      .filter((tx) => selectedIds.has(tx.rowId))
      .sort((a, b) => b.rowId - a.rowId);
    if (!selected.length) return;
    const next = renumberTransactions(
      transactions.filter((item) => !selectedIds.has(item.rowId)),
    );
    applyTransactionUpdate(next, uniqueMonthKeys(selected));
    reconcilePeriod(next, month, year);
    clearSelection();
    for (const tx of selected) {
      addHistoryEntry({ action: "delete", transaction: tx })
        .then((entry) => setHistoryEntries((prev) => [entry, ...prev]))
        .catch(() => undefined);
    }
    if (accessToken && spreadsheetId) {
      syncWithReload(
        async (t) => {
          for (const tx of selected)
            await deleteGoogleTransaction(t, spreadsheetId, tx.rowId);
        },
        copy.deleteSelection,
      );
    }
  }

  async function moveTx(tx: Transaction, direction: "up" | "down") {
    try {
      if (accessToken && spreadsheetId) {
        syncWithReload(
          async (t) => moveGoogleTransaction(t, spreadsheetId, tx.rowId, direction),
          copy.moveRecord,
        );
        return;
      }
      const index = transactions.findIndex((item) => item.rowId === tx.rowId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= transactions.length)
        return;
      const next = [...transactions];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      const moved = next.map((item, idx) => ({ ...item, rowId: idx + 2 }));
      applyTransactionUpdate(moved, []);
    } catch (error) {
      Alert.alert(
        copy.moveRecord,
        error instanceof Error ? error.message : copy.moveRecordError,
      );
    }
  }

  async function undoDeleteEntry(entry: HistoryEntry) {
    const entryId = entry.id;
    setHistoryEntries((prev) => prev.filter((e) => e.id !== entryId));
    removeHistoryEntry(entryId).catch(() => undefined);

    const restored = insertChronologically(transactions, entry.transaction);
    applyTransactionUpdate(restored, uniqueMonthKeys([entry.transaction]));
    if (accessToken && spreadsheetId) {
      const draft = transactionToDraft(entry.transaction);
      syncWithReload(
        async (freshToken) => {
          await insertTransactionAtRow(freshToken, spreadsheetId, draft, entry.transaction.rowId);
        },
        copy.undoAction,
      );
    }
  }

  return {
    submitDraft,
    deleteTx,
    deleteSelectedRows,
    undoDeleteEntry,
    moveTx,
    reconcilePeriod,
  };
}
