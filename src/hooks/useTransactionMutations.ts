import { Alert } from "react-native";
import {
  buildTransactionFromDraft,
  insertChronologically,
  recalculateSummariesForMonths,
  uniqueMonthKeys,
} from "@/domain/bucksLogic";
import { formatDateToISO } from "@/utils/dateUtils";
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
  setTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>;
  summaries: SummaryRow[];
  setSummaries: React.Dispatch<React.SetStateAction<SummaryRow[]>>;
  freqIncome: Record<string, number>;
  month: number;
  year: number;
  setMonth: React.Dispatch<React.SetStateAction<number>>;
  setYear: React.Dispatch<React.SetStateAction<number>>;
  selectedRows: number[];
  setSelectedRows: React.Dispatch<React.SetStateAction<number[]>>;
  setSearchActive: React.Dispatch<React.SetStateAction<boolean>>;
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
    transactions, setTransactions,
    summaries, setSummaries,
    freqIncome,
    month, year, setMonth, setYear,
    selectedRows, setSelectedRows, setSearchActive,
    renumberTransactions, persistFinancialState,
  } = fin;
  const { accessToken, spreadsheetId } = session;
  const { reloadFromGoogle, syncGoogleInBackground, pendingSyncRef } = sync;
  const { setHistoryEntries } = history;

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
      setMonth(d.getMonth());
      setYear(d.getFullYear());
    } else {
      setMonth(new Date().getMonth());
      setYear(new Date().getFullYear());
    }
    setSearchActive(false);
    setSelectedRows([]);
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
    const currentTransactions = transactions;
    const currentFreqIncome = freqIncome;

    const optimistic = buildTransactionFromDraft(
      currentDraft,
      currentEdit?.rowId || currentTransactions.length + 2,
    );
    const next = currentEdit
      ? renumberTransactions(
          insertChronologically(
            currentTransactions.filter(
              (tx) => tx.rowId !== currentEdit.rowId,
            ),
            optimistic,
          ),
        )
      : renumberTransactions(
          insertChronologically(currentTransactions, optimistic),
        );
    const affectedMonths = currentEdit
      ? uniqueMonthKeys([currentEdit, optimistic])
      : uniqueMonthKeys([optimistic]);
    const nextSummaries = recalculateSummariesForMonths(
      next,
      currentFreqIncome,
      affectedMonths,
      summaries,
    );
    setTransactions(next);
    setSummaries(nextSummaries);
    if (!currentEdit) {
      const txDate = new Date(optimistic.rawDate);
      if (!Number.isNaN(txDate.getTime())) {
        setMonth(txDate.getMonth());
        setYear(txDate.getFullYear());
        setSearchActive(false);
        setSelectedRows([]);
      }
    }
    persistFinancialState(next, nextSummaries, currentFreqIncome, undefined, spreadsheetId);

    const token = accessToken;
    const sheetId = spreadsheetId;
    if (token && sheetId) {
      pendingSyncRef.current = true;
      syncGoogleInBackground(
        async (freshToken) => {
          if (currentEdit) {
            await updateGoogleTransaction(
              freshToken,
              sheetId,
              currentEdit.rowId,
              currentDraft,
            );
          } else {
            await saveTransaction(freshToken, sheetId, currentDraft);
          }
          await reloadFromGoogle(freshToken, sheetId, false, true);
        },
        currentEdit ? copy.editRecord : copy.newRecord,
      );
    }
    return true;
  }

  async function deleteTx(tx: Transaction) {
    setSelectedRows((current) => current.filter((rowId) => rowId !== tx.rowId));
    const next = renumberTransactions(
      transactions.filter((item) => item.rowId !== tx.rowId),
    );
    const affectedMonths = uniqueMonthKeys([tx]);
    const nextSummaries = recalculateSummariesForMonths(
      next,
      freqIncome,
      affectedMonths,
      summaries,
    );
    setTransactions(next);
    setSummaries(nextSummaries);
    reconcilePeriod(next, month, year);
    persistFinancialState(next, nextSummaries, freqIncome, undefined, spreadsheetId);
    addHistoryEntry({ action: "delete", transaction: tx })
      .then((entry) => {
        setHistoryEntries((prev) => [entry, ...prev]);
      })
      .catch(() => undefined);
    if (accessToken && spreadsheetId) {
      pendingSyncRef.current = true;
      syncGoogleInBackground(async (freshToken) => {
        await deleteGoogleTransaction(freshToken, spreadsheetId, tx.rowId);
        await reloadFromGoogle(freshToken, spreadsheetId, false, true);
      }, copy.deleteRecord);
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
    const affectedMonths = uniqueMonthKeys(selected);
    const nextSummaries = recalculateSummariesForMonths(
      next,
      freqIncome,
      affectedMonths,
      summaries,
    );
    setTransactions(next);
    setSummaries(nextSummaries);
    reconcilePeriod(next, month, year);
    persistFinancialState(next, nextSummaries, freqIncome, undefined, spreadsheetId);
    setSelectedRows([]);
    for (const tx of selected) {
      addHistoryEntry({ action: "delete", transaction: tx })
        .then((entry) => {
          setHistoryEntries((prev) => [entry, ...prev]);
        })
        .catch(() => undefined);
    }
    if (accessToken && spreadsheetId) {
      pendingSyncRef.current = true;
      syncGoogleInBackground(async (freshToken) => {
        for (const tx of selected)
          await deleteGoogleTransaction(freshToken, spreadsheetId, tx.rowId);
        await reloadFromGoogle(freshToken, spreadsheetId, false, true);
      }, copy.deleteSelection);
    }
  }

  async function moveTx(tx: Transaction, direction: "up" | "down") {
    try {
      if (accessToken && spreadsheetId) {
        pendingSyncRef.current = true;
        syncGoogleInBackground(async (freshToken) => {
          await moveGoogleTransaction(
            freshToken,
            spreadsheetId,
            tx.rowId,
            direction,
          );
          await reloadFromGoogle(freshToken, spreadsheetId, false, true);
        }, copy.moveRecord);
        return;
      }
      const index = transactions.findIndex((item) => item.rowId === tx.rowId);
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || targetIndex < 0 || targetIndex >= transactions.length)
        return;
      const next = [...transactions];
      [next[index], next[targetIndex]] = [next[targetIndex], next[index]];
      const moved = next.map((item, idx) => ({ ...item, rowId: idx + 2 }));
      const nextSummaries = recalculateSummariesForMonths(
        moved,
        freqIncome,
        [],
        summaries,
      );
      setTransactions(moved);
      setSummaries(nextSummaries);
      persistFinancialState(moved, nextSummaries, freqIncome, undefined, spreadsheetId);
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
    const affectedMonths = uniqueMonthKeys([entry.transaction]);
    const nextSummaries = recalculateSummariesForMonths(
      restored,
      freqIncome,
      affectedMonths,
      summaries,
    );
    setTransactions(restored);
    setSummaries(nextSummaries);
    persistFinancialState(restored, nextSummaries, freqIncome, undefined, spreadsheetId);
    if (accessToken && spreadsheetId) {
      pendingSyncRef.current = true;
      const concepto = entry.transaction.lineItems
        ? (entry.transaction.detail.split(":")[0] || "")
        : "";
      const lineItems = entry.transaction.lineItems
        ? entry.transaction.lineItems.map((li) => ({
            id: li.id,
            amount: li.formula ? `=${li.formula}` : String(li.amount),
            description: li.description,
            tags: li.tags,
          }))
        : [{ id: "li-1", amount: entry.transaction.formula
            ? `=${entry.transaction.formula}`
            : String(Math.abs(entry.transaction.amount)), description: entry.transaction.detail, tags: entry.transaction.tags || [] }];
      const draft: TransactionDraft = {
        date: formatDateToISO(entry.transaction.rawDate),
        amount: entry.transaction.formula
          ? `=${entry.transaction.formula}`
          : String(Math.abs(entry.transaction.amount)),
        detail: entry.transaction.detail,
        type: entry.transaction.type,
        createdAt: entry.transaction.createdAt,
        tags: entry.transaction.tags || [],
        concepto,
        lineItems,
      };
      syncGoogleInBackground(async (freshToken) => {
        await insertTransactionAtRow(
          freshToken,
          spreadsheetId,
          draft,
          entry.transaction.rowId,
        );
        await reloadFromGoogle(freshToken, spreadsheetId, false, true);
      }, copy.undoAction);
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
