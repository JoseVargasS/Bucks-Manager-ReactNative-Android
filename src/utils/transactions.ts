import { Transaction, TransactionDraft, TransactionType } from "../types";
import { formatDateToISO } from "../domain/bucksLogic";

export function getBlankDraft(type: TransactionType = "GASTO NO FRECUENTE"): TransactionDraft {
  return {
    date: formatDateToISO(new Date()),
    amount: "",
    detail: "",
    type,
  };
}

export function compareTransactionsDesc(a: Transaction, b: Transaction) {
  const dateDiff = new Date(b.rawDate).getTime() - new Date(a.rawDate).getTime();
  if (dateDiff) return dateDiff;
  return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
}

export function filterTransactionsByRollingPeriod(transactions: Transaction[], month: number, year: number, monthCount: number) {
  const end = new Date(year, month + 1, 1).getTime();
  const start = new Date(year, month - Math.max(1, monthCount) + 1, 1).getTime();
  return transactions.filter((tx) => {
    const time = new Date(tx.rawDate).getTime();
    return time >= start && time < end;
  });
}

export function groupTransactionsByDate(transactions: Transaction[]) {
  return transactions.reduce<Array<{ key: string; label: string; items: Transaction[] }>>((groups, tx) => {
    const key = formatDateToISO(new Date(tx.rawDate));
    let group = groups.find((item) => item.key === key);
    if (!group) {
      group = { key, label: formatDateGroupLabel(tx.rawDate), items: [] };
      groups.push(group);
    }
    group.items.push(tx);
    return groups;
  }, []);
}

// local dependency to avoid circular imports
function formatDateGroupLabel(rawDate: string) {
  const date = new Date(rawDate);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (formatDateToISO(date) === formatDateToISO(today))
    return `HOY · ${date.toLocaleDateString("es-PE", { month: "short", day: "2-digit" }).toUpperCase()}`;
  if (formatDateToISO(date) === formatDateToISO(yesterday))
    return `AYER · ${date.toLocaleDateString("es-PE", { month: "short", day: "2-digit" }).toUpperCase()}`;
  return date.toLocaleDateString("es-PE", { month: "short", day: "2-digit", year: "numeric" }).toUpperCase();
}
