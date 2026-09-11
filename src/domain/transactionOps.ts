import type {
  LineItem,
  SearchFilters,
  Transaction,
  TransactionDraft,
  TransactionType,
} from "@/types";
import { MONTH_NAMES_EN } from "@/i18n";
import {
  calculateExpression,
  isMathFormula,
  normalizeAmountExpression,
} from "@/utils/expressionParser";
import {
  formatDateForSheet,
  isValidDraftDate,
  parseCreatedAtMs,
} from "@/utils/dateUtils";

export const SHEET_NAMES = {
  transactions: "INCOME AND EXPENSES",
  summary: "MONTHLY SUMMARY",
};

export const DEFAULT_SPREADSHEET_LOCALE = "en_US";

export const TRANSACTION_TYPES: TransactionType[] = [
  "INGRESO FRECUENTE",
  "INGRESO NO FRECUENTE",
  "GASTO FRECUENTE",
  "GASTO NO FRECUENTE",
];

export const MONTH_NAMES = MONTH_NAMES_EN;

export function formatMoney(value: number, symbol = "S/", decimals = 2): string {
  const n = Number(value) || 0;
  const sign = n >= 0 ? "+ " : "- ";
  return `${sign}${symbol} ${Math.abs(n).toFixed(decimals)}`;
}

export function normalizeDraftAmount(draft: TransactionDraft): number {
  if (draft.lineItems && draft.lineItems.length > 0) {
    const sumAbs = draft.lineItems.reduce(
      (sum, li) => sum + Math.abs(calculateExpression(normalizeAmountExpression(li.amount))),
      0,
    );
    return draft.type.startsWith("GASTO") ? -sumAbs : sumAbs;
  }
  const calculated = calculateExpression(normalizeAmountExpression(draft.amount));
  if (draft.type.startsWith("GASTO")) return -Math.abs(calculated);
  return Math.abs(calculated);
}

export function isValidTransactionDraft(draft: TransactionDraft): boolean {
  if (!draft.date || !isValidDraftDate(draft.date)) return false;

  if (draft.lineItems && draft.lineItems.length > 0) {
    let hasAmount = false;
    let sumAbs = 0;
    for (const li of draft.lineItems) {
      const raw = li.amount.trim();
      if (!raw) continue;
      const val = calculateExpression(normalizeAmountExpression(raw));
      if (!Number.isFinite(val) || Math.abs(val) === 0) return false;
      hasAmount = true;
      sumAbs += Math.abs(val);
    }
    if (!hasAmount) return false;
    return sumAbs > 0;
  }

  const amount = calculateExpression(normalizeAmountExpression(draft.amount));
  return Boolean(
    draft.detail.trim()
      && Math.abs(amount) > 0,
  );
}

export function buildTransactionFromDraft(draft: TransactionDraft, rowId: number): Transaction {
  if (!isValidTransactionDraft(draft)) throw new Error("Invalid transaction draft");
  const date = new Date(`${draft.date}T00:00:00`);
  const createdAt = draft.createdAt || new Date().toISOString();

  if (draft.lineItems && draft.lineItems.length > 0) {
    const isExpense = draft.type.startsWith("GASTO");
    const lineItems: LineItem[] = [];
    for (const li of draft.lineItems) {
      if (li.amount.trim() === "") continue;
      const raw = normalizeAmountExpression(li.amount);
      const parsed = calculateExpression(raw);
      if (!Number.isFinite(parsed) || Math.abs(parsed) === 0) continue;
      const amount = isExpense ? -Math.abs(parsed) : Math.abs(parsed);
      const storedFormula = isMathFormula(li.amount) ? raw : undefined;
      lineItems.push({
        id: li.id,
        amount,
        formula: storedFormula,
        description: li.description.trim(),
        tags: isExpense ? li.tags : [],
      });
    }
    if (lineItems.length === 0) throw new Error("Invalid transaction draft");
    const totalAmount = lineItems.reduce((sum, li) => sum + li.amount, 0);
    const allTags = [...new Set(lineItems.flatMap((li) => li.tags))];
    const detailCol = buildDetailColumn((draft.concepto || "").trim(), lineItems);
    return {
      rowId,
      date: formatDateForSheet(date),
      rawDate: date.toISOString(),
      rawDateMs: date.getTime(),
      createdAtMs: parseCreatedAtMs(createdAt),
      amount: totalAmount,
      detail: detailCol,
      type: draft.type,
      createdAt,
      tags: draft.type.startsWith("GASTO") ? allTags : [],
      lineItems,
    };
  }

  const amount = normalizeDraftAmount(draft);
  return {
    rowId,
    date: formatDateForSheet(date),
    rawDate: date.toISOString(),
    rawDateMs: date.getTime(),
    createdAtMs: parseCreatedAtMs(createdAt),
    amount,
    formula: isMathFormula(draft.amount) ? normalizeAmountExpression(draft.amount) : "",
    detail: draft.detail.trim(),
    type: draft.type,
    createdAt,
    tags: draft.type.startsWith("GASTO") ? draft.tags : [],
  };
}

function buildDetailColumn(concepto: string, lineItems: LineItem[]): string {
  const descs = lineItems.map((li) => li.description).join(", ");
  return concepto ? `${concepto}: ${descs}` : descs;
}

export function insertChronologically(transactions: Transaction[], tx: Transaction): Transaction[] {
  const next = [...transactions];
  const targetMs = tx.rawDateMs ?? Date.parse(tx.rawDate);
  const targetDate = targetMs - (targetMs % 86400000);
  const targetTime = tx.createdAtMs ?? 0;
  const index = next.findIndex((item) => {
    const itemMs = item.rawDateMs ?? Date.parse(item.rawDate);
    const itemDate = itemMs - (itemMs % 86400000);
    if (itemDate > targetDate) return true;
    if (itemDate === targetDate) {
      const itemTime = item.createdAtMs ?? 0;
      if (itemTime !== targetTime) return itemTime > targetTime;
      return item.rowId > (tx.rowId || 0);
    }
    return false;
  });
  if (index === -1) next.push(tx);
  else next.splice(index, 0, tx);
  return next.map((item, idx) => ({ ...item, rowId: idx + 2 }));
}

export function applySearch(
  transactions: Transaction[],
  filters: SearchFilters,
  tagLabelsById: Record<string, string> = {},
): Transaction[] {
  const text = filters.text.toLowerCase().trim();
  const tag = (filters.tag || "").trim();
  const min = filters.minAmount ? Number(filters.minAmount) : null;
  const max = filters.maxAmount ? Number(filters.maxAmount) : null;
  const start = filters.startDate ? Date.parse(`${filters.startDate}T00:00:00`) : null;
  const end = filters.endDate ? Date.parse(`${filters.endDate}T23:59:59`) : null;

  // ponytail: cheap filters first; haystack/amount only built when needed.
  // Sort stays here (newest-first before slice); visibleTransactions re-sorts ≤150 rows, negligible.
  return transactions
    .filter((tx) => {
      if (tag && !(tx.tags || []).includes(tag)) return false;
      if (min !== null || max !== null) {
        const abs = Math.abs(Number(tx.amount) || 0);
        if (min !== null && abs < min) return false;
        if (max !== null && abs > max) return false;
      }
      if (start || end) {
        const date = tx.rawDateMs ?? Date.parse(tx.rawDate);
        if (start && date < start) return false;
        if (end && date > end) return false;
      }
      if (text) {
        const tagLabels = (tx.tags || [])
          .map((id) => tagLabelsById[id] ?? id)
          .join(" ");
        const haystack = `${tx.detail} ${tx.type} ${tagLabels} ${(tx.lineItems || []).map((li) => li.description).join(" ")}`.toLowerCase();
        if (!haystack.includes(text)) return false;
      }
      return true;
    })
    .sort((a, b) => (b.rawDateMs ?? Date.parse(b.rawDate)) - (a.rawDateMs ?? Date.parse(a.rawDate)) || (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
    .slice(0, 150);
}
