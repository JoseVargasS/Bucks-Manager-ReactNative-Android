import { useCallback, useRef, useState } from "react";
import type { TransactionModalHandle } from "@/components/modals/TransactionModal";
import type { DetailModalHandle } from "@/components/modals/DetailModal";
import type { SearchModalHandle } from "@/components/modals/SearchModal";
import type { OptionSheetHandle } from "@/components/modals/OptionSheet";
import type { ConfirmConfig } from "@/components/modals/ConfirmModal";
import type { MergePromptConfig } from "@/components/modals/MergePromptModal";

type MergePromptCallback = MergePromptConfig & {
  onMerge: () => void;
  onRemoteOnly: () => void;
};

type UseAppModalsParams = {
  exportVisible: boolean;
  openExport: () => void;
  closeExport: () => void;
  historyVisible: boolean;
  openHistory: () => void;
  closeHistory: () => void;
  pinSetupVisible: boolean;
  setPinSetupVisible: (visible: boolean) => void;
  tagEditorVisible: boolean;
  openTagEditor: () => void;
  closeTagEditor: () => void;
};

/**
 * Owns the modal refs and the App-level modal state (confirm dialog and
 * merge prompt) plus the pass-through of secondary modal visibility from
 * their owning hooks. Returns stable { refs, openers, closers, state }.
 */
export function useAppModals({
  exportVisible,
  openExport,
  closeExport,
  historyVisible,
  openHistory,
  closeHistory,
  pinSetupVisible,
  setPinSetupVisible,
  tagEditorVisible,
  openTagEditor,
  closeTagEditor,
}: UseAppModalsParams) {
  const transactionModalRef = useRef<TransactionModalHandle>(null);
  const detailModalRef = useRef<DetailModalHandle>(null);
  const searchModalRef = useRef<SearchModalHandle>(null);
  const optionSheetRef = useRef<OptionSheetHandle>(null);

  const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(null);
  const [mergePrompt, setMergePrompt] = useState<MergePromptConfig | null>(null);
  const mergeCallbacksRef = useRef<{
    onMerge: () => void;
    onRemoteOnly: () => void;
  } | null>(null);

  const openConfirm = setConfirmConfig;
  const closeConfirm = useCallback(() => setConfirmConfig(null), []);

  const openMergePrompt = useCallback((cfg: MergePromptCallback) => {
    mergeCallbacksRef.current = {
      onMerge: cfg.onMerge,
      onRemoteOnly: cfg.onRemoteOnly,
    };
    setMergePrompt({ localCount: cfg.localCount, remoteCount: cfg.remoteCount });
  }, []);
  const closeMergePrompt = useCallback(() => setMergePrompt(null), []);
  const confirmMerge = useCallback(() => {
    mergeCallbacksRef.current?.onMerge();
    setMergePrompt(null);
    mergeCallbacksRef.current = null;
  }, []);
  const remoteOnlyMerge = useCallback(() => {
    mergeCallbacksRef.current?.onRemoteOnly();
    setMergePrompt(null);
    mergeCallbacksRef.current = null;
  }, []);

  const closePinSetup = useCallback(
    () => setPinSetupVisible(false),
    [setPinSetupVisible],
  );

  return {
    refs: {
      transactionModalRef,
      detailModalRef,
      searchModalRef,
      optionSheetRef,
    },
    openers: {
      openConfirm,
      openMergePrompt,
      openExport,
      openHistory,
      openTagEditor,
    },
    closers: {
      closeConfirm,
      closeMergePrompt,
      confirmMerge,
      remoteOnlyMerge,
      closeExport,
      closeHistory,
      closePinSetup,
      closeTagEditor,
    },
    state: {
      confirmConfig,
      mergePrompt,
      exportVisible,
      historyVisible,
      pinSetupVisible,
      tagEditorVisible,
    },
  };
}
