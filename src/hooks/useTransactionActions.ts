import { useCallback, useRef } from "react";
import type {
  TransactionModalHandle,
} from "@/components/modals/TransactionModal";
import type { DetailModalHandle } from "@/components/modals/DetailModal";
import type { SearchModalHandle } from "@/components/modals/SearchModal";
import type { OptionSheetHandle } from "@/components/modals/OptionSheet";
import { getBlankDraft, transactionToDraft } from "@/utils/transactions";
import type { SearchFilters, Tab, Transaction } from "@/types";

type TransactionActionsDeps = {
  transactionModalRef: React.RefObject<TransactionModalHandle | null>;
  detailModalRef: React.RefObject<DetailModalHandle | null>;
  searchModalRef: React.RefObject<SearchModalHandle | null>;
  optionSheetRef: React.RefObject<OptionSheetHandle | null>;
  clearSelection: () => void;
  toggleSelection: (tx: Transaction) => void;
  changeTab: (tab: Tab) => void;
  hookApplySearchFilters: (filters: SearchFilters) => void;
  hookClearSearchFilters: () => void;
  toggleSearchActive: (active: boolean) => void;
  searchFilters: SearchFilters;
  moveTx: (tx: Transaction, direction: "up" | "down") => void;
  copy: {
    moveRecord: string;
    moveUpOnePosition: string;
    moveDownOnePosition: string;
  };
  colors: { info: string; warn: string };
  selectedRows: readonly number[];
};

export function useTransactionActions({
  transactionModalRef,
  detailModalRef,
  searchModalRef,
  optionSheetRef,
  clearSelection,
  toggleSelection,
  changeTab,
  hookApplySearchFilters,
  hookClearSearchFilters,
  toggleSearchActive,
  searchFilters,
  moveTx,
  copy,
  colors,
  selectedRows,
}: TransactionActionsDeps) {
  const openAdd = useCallback(() => {
    transactionModalRef.current?.open(getBlankDraft());
  }, [transactionModalRef]);

  const openEdit = useCallback(
    (tx: Transaction) => {
      detailModalRef.current?.close();
      transactionModalRef.current?.open(transactionToDraft(tx), tx);
      requestAnimationFrame(() => clearSelection());
    },
    [clearSelection, detailModalRef, transactionModalRef],
  );

  const applySearchFilters = useCallback(
    (nextFilters: SearchFilters) => {
      requestAnimationFrame(() => {
        hookApplySearchFilters(nextFilters);
        changeTab("expenses");
        clearSelection();
      });
    },
    [changeTab, clearSelection, hookApplySearchFilters],
  );

  const clearSearchFilters = useCallback(() => {
    requestAnimationFrame(() => {
      hookClearSearchFilters();
    });
  }, [hookClearSearchFilters]);

  const selectedRowsRef = useRef(selectedRows);
  selectedRowsRef.current = selectedRows;
  const handleTransactionPress = useCallback(
    (tx: Transaction) => {
      if (selectedRowsRef.current.length) {
        toggleSelection(tx);
        return;
      }
      detailModalRef.current?.open(tx);
    },
    [toggleSelection, detailModalRef],
  );

  const openMoveMenu = useCallback(
    (tx: Transaction) => {
      optionSheetRef.current?.open({
        title: copy.moveRecord,
        selectedValue: "",
        options: [
          {
            label: copy.moveUpOnePosition,
            value: "up",
            icon: "arrow-up",
            tone: colors.info,
          },
          {
            label: copy.moveDownOnePosition,
            value: "down",
            icon: "arrow-down",
            tone: colors.warn,
          },
        ],
        onSelect: (direction: string) =>
          moveTx(tx, direction as "up" | "down"),
      });
    },
    [
      colors.info,
      colors.warn,
      copy.moveDownOnePosition,
      copy.moveRecord,
      copy.moveUpOnePosition,
      moveTx,
      optionSheetRef,
    ],
  );

  const exitSearch = useCallback(
    () => toggleSearchActive(false),
    [toggleSearchActive],
  );

  const openSearch = useCallback(
    () => searchModalRef.current?.open(searchFilters),
    [searchFilters, searchModalRef],
  );

  return {
    openAdd,
    openEdit,
    applySearchFilters,
    clearSearchFilters,
    handleTransactionPress,
    openMoveMenu,
    exitSearch,
    openSearch,
  };
}
