import { useCallback } from "react";
import type { ConfirmConfig } from "@/components/modals/ConfirmModal";
import type { Transaction } from "@/types";
import { removeConnectedAccount } from "@/data/connectedAccounts";
import type { OptionSheetHandle } from "@/components/modals/OptionSheet";

type ConfirmDeps = {
  deleteTx: (tx: Transaction) => void;
  deleteSelectedRows: () => void;
  removeGoogleAccount: () => Promise<void>;
  disconnectGoogle: () => void;
  selectedRowsLength: number;
  setConfirmConfig: (cfg: ConfirmConfig | null) => void;
  optionSheetRef?: React.RefObject<OptionSheetHandle | null>;
};

export function useConfirmCallbacks({
  deleteTx,
  deleteSelectedRows,
  removeGoogleAccount,
  disconnectGoogle,
  selectedRowsLength,
  setConfirmConfig,
  optionSheetRef,
}: ConfirmDeps) {
  const requestDisconnectGoogle = useCallback(() => {
    setConfirmConfig({ kind: "disconnect" });
  }, [setConfirmConfig]);

  const requestDelete = useCallback(
    (tx: Transaction) => {
      setConfirmConfig({ kind: "delete", tx });
    },
    [setConfirmConfig],
  );

  const requestDeleteSelected = useCallback(() => {
    if (!selectedRowsLength) return;
    setConfirmConfig({ kind: "deleteSelected", count: selectedRowsLength });
  }, [selectedRowsLength, setConfirmConfig]);

  const closeConfirm = useCallback(
    () => setConfirmConfig(null),
    [setConfirmConfig],
  );

  function handleConfirm(cfg: ConfirmConfig) {
    if (cfg.kind === "delete" && cfg.tx) deleteTx(cfg.tx);
    else if (cfg.kind === "deleteSelected") deleteSelectedRows();
    else if (cfg.kind === "removeAccount") {
      if (cfg.email) optionSheetRef?.current?.removeOption(`account:${cfg.email}`);
      void removeGoogleAccount();
    } else if (cfg.kind === "removeConnectedAccount" && cfg.email) {
      optionSheetRef?.current?.removeOption(`account:${cfg.email}`);
      void removeConnectedAccount(cfg.email);
    } else if (cfg.kind === "disconnect") void disconnectGoogle();
  }

  return {
    requestDisconnectGoogle,
    requestDelete,
    requestDeleteSelected,
    handleConfirm,
    closeConfirm,
  };
}
