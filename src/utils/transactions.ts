import type { LineItemDraft, Transaction, TransactionDraft, TransactionType } from "@/types";
import { calculateExpression, formatDateToISO } from "@/domain/bucksLogic";
import { UI_COPY, type UiCopy } from "@/i18n";
import { formatDateGroupLabel } from "./formats";

/** Convierte un Transaction en un TransactionDraft para edición o restauración */
export function transactionToDraft(tx: Transaction): TransactionDraft {
  const concepto = tx.lineItems ? (tx.detail.split(":")[0] || "") : tx.detail;
  const lineItems = tx.lineItems
    ? tx.lineItems.map((li) => ({
        id: li.id,
        amount: li.formula ? `=${li.formula}` : String(li.amount),
        description: li.description,
        tags: li.tags,
      }))
    : [{ id: "li-1", amount: tx.formula ? `=${tx.formula}` : String(tx.amount), description: "", tags: tx.tags || [] }];
  return {
    date: formatDateToISO(tx.rawDate),
    amount: tx.formula ? `=${tx.formula}` : String(tx.amount),
    detail: tx.detail,
    type: tx.type,
    createdAt: tx.createdAt,
    tags: tx.tags || [],
    concepto,
    lineItems,
  };
}

/** Crea un TransactionDraft vacío con tipo por defecto "GASTO NO FRECUENTE" y fecha actual */
export function getBlankDraft(
  type: TransactionType = "GASTO NO FRECUENTE",
): TransactionDraft {
  return {
    date: formatDateToISO(new Date()),
    amount: "",
    detail: "",
    type,
    concepto: "",
    tags: [],
    lineItems: [{ id: "li-1", amount: "", description: "", tags: [] }],
  };
}

export function computeLineItemsTotal(items: LineItemDraft[]): { total: number; error: string | null } {
  let total = 0;
  for (const item of items) {
    const raw = item.amount.trim();
    if (!raw) continue;
    const value = calculateExpression(raw);
    if (!Number.isFinite(value)) return { total: 0, error: `"${raw}" no es válido` };
    total += value;
  }
  return { total, error: null };
}

/** Ordena transacciones por fecha descendente, resolviendo empates por createdAt */
export function sortTransactionsDesc(
  transactions: Transaction[],
): Transaction[] {
  return [...transactions].sort((a, b) => {
    const da = a.rawDateMs ?? Date.parse(a.rawDate);
    const db = b.rawDateMs ?? Date.parse(b.rawDate);
    const ca = a.createdAtMs ?? (a.createdAt ? Date.parse(a.createdAt) : 0);
    const cb = b.createdAtMs ?? (b.createdAt ? Date.parse(b.createdAt) : 0);
    return db - da || cb - ca || a.rowId - b.rowId;
  });
}

/** Filtra transacciones dentro de una ventana de N meses hacia atrás desde el mes/año dados */
export function filterTransactionsByRollingPeriod(
  transactions: Transaction[],
  month: number,
  year: number,
  monthCount: number,
): Transaction[] {
  const end = new Date(year, month + 1, 1).getTime();
  const start = new Date(
    year,
    month - Math.max(1, monthCount) + 1,
    1,
  ).getTime();
  return transactions.filter((tx) => {
    const time = tx.rawDateMs ?? Date.parse(tx.rawDate);
    return time >= start && time < end;
  });
}

/** Agrupa transacciones por fecha en segmentos con etiqueta y array de items */
export function groupTransactionsByDate(
  transactions: Transaction[],
  copy: UiCopy = UI_COPY.es,
): Array<{ key: string; label: string; items: Transaction[] }> {
  const groups: Array<{ key: string; label: string; items: Transaction[] }> =
    [];
  const groupsByDate = new Map<string, (typeof groups)[number]>();
  transactions.forEach((tx) => {
    const key = tx.date || formatDateToISO(new Date(tx.rawDate));
    let group = groupsByDate.get(key);
    if (!group) {
      group = { key, label: formatDateGroupLabel(tx.rawDate, copy), items: [] };
      groupsByDate.set(key, group);
      groups.push(group);
    }
    group.items.push(tx);
  });
  return groups;
}
