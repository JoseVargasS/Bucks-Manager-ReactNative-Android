import { Transaction, TransactionDraft, TransactionType } from "../types";
import { formatDateToISO } from "../domain/bucksLogic";
import { formatDateGroupLabel } from "./formats";
import { UI_COPY, UiCopy } from "../i18n";

/** Crea un TransactionDraft vacío con tipo por defecto "GASTO NO FRECUENTE" y fecha actual */
export function getBlankDraft(type: TransactionType = "GASTO NO FRECUENTE"): TransactionDraft {
  return { date: formatDateToISO(new Date()), amount: "", detail: "", type };
}

/** Ordena transacciones por fecha descendente, resolviendo empates por createdAt */
export function compareTransactionsDesc(a: Transaction, b: Transaction): number {
  const dateDiff = new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
  if (dateDiff) return dateDiff;
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
}

/** Filtra transacciones dentro de una ventana de N meses hacia atrás desde el mes/año dados */
export function filterTransactionsByRollingPeriod(transactions: Transaction[], month: number, year: number, monthCount: number): Transaction[] {
  const end = new Date(year, month + 1, 1).getTime();
  const start = new Date(year, month - Math.max(1, monthCount) + 1, 1).getTime();
  return transactions.filter((tx) => {
    const time = new Date(tx.rawDate).getTime();
    return time >= start && time < end;
  });
}

/** Agrupa transacciones por fecha en segmentos con etiqueta y array de items */
export function groupTransactionsByDate(transactions: Transaction[], copy: UiCopy = UI_COPY.es): Array<{ key: string; label: string; items: Transaction[] }> {
  return transactions.reduce<Array<{ key: string; label: string; items: Transaction[] }>>((groups, tx) => {
    const key = formatDateToISO(new Date(tx.rawDate));
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, label: formatDateGroupLabel(tx.rawDate, copy), items: [] };
      groups.push(group);
    }
    group.items.push(tx);
    return groups;
  }, []);
}
