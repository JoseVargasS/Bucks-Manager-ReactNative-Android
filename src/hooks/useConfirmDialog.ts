import { useCallback } from "react";
import type { ConfirmConfig } from "@/components/modals/ConfirmModal";
import type { Transaction } from "@/types";

type ConfirmDeps = {
  deleteTx: (tx: Transaction) => void;
  deleteSelectedRows: () => void;
  removeGoogleAccount: () => Promise<void>;
  disconnectGoogle: () => void;
  selectedRowsLength: number;
  setConfirmConfig: (cfg: ConfirmConfig | null) => void;
};

export function useConfirmCallbacks({
  deleteTx,
  deleteSelectedRows,
  removeGoogleAccount,
  disconnectGoogle,
  selectedRowsLength,
  setConfirmConfig,
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
    else if (cfg.kind === "removeAccount") void removeGoogleAccount();
    else if (cfg.kind === "disconnect") void disconnectGoogle();
  }

  return {
    requestDisconnectGoogle,
    requestDelete,
    requestDeleteSelected,
    handleConfirm,
    closeConfirm,
  };
}
