import type { LineItem, SearchFilters, SummaryRow, Transaction, TransactionDraft, TransactionType } from "@/types";
import { MONTH_NAMES_EN } from "@/i18n";
import { calculateExpression, isMathFormula, normalizeAmountExpression } from "@/utils/expressionParser";
import { formatDateForSheet, getMonthYear, isValidDraftDate, parseCreatedAtMs, parseLocalDate, monthYearToDate } from "@/utils/dateUtils";

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
    return draft.lineItems.reduce(
      (sum, li) => sum + calculateExpression(normalizeAmountExpression(li.amount)),
      0,
    );
  }
  const calculated = calculateExpression(normalizeAmountExpression(draft.amount));
  if (draft.type.startsWith("GASTO")) return -Math.abs(calculated);
  return Math.abs(calculated);
}

export function isValidTransactionDraft(draft: TransactionDraft): boolean {
  if (!draft.date || !isValidDraftDate(draft.date)) return false;

  if (draft.lineItems && draft.lineItems.length > 0) {
    let hasAmount = false;
    for (const li of draft.lineItems) {
      const raw = li.amount.trim();
      if (!raw) continue;
      const val = calculateExpression(raw);
      if (!Number.isFinite(val) || val === 0) return false;
      hasAmount = true;
    }
    if (!hasAmount) return false;
    const total = draft.lineItems.reduce(
      (sum, li) => sum + calculateExpression(normalizeAmountExpression(li.amount)),
      0,
    );
    if (draft.type.startsWith("GASTO")) return total < 0;
    return total > 0;
  }

  const amount = calculateExpression(normalizeAmountExpression(draft.amount));
  return Boolean(
    draft.detail.trim()
      && Math.abs(amount) > 0
      && (draft.type.startsWith("INGRESO") ? amount > 0 : amount < 0),
  );
}

export function buildTransactionFromDraft(draft: TransactionDraft, rowId: number): Transaction {
  if (!isValidTransactionDraft(draft)) throw new Error("Invalid transaction draft");
  const date = new Date(`${draft.date}T00:00:00`);
  const createdAt = draft.createdAt || new Date().toISOString();

  if (draft.lineItems && draft.lineItems.length > 0) {
    const lineItems: LineItem[] = draft.lineItems.map((li) => {
      const raw = normalizeAmountExpression(li.amount);
      const amount = calculateExpression(raw);
      return {
        id: li.id,
        amount,
        formula: isMathFormula(li.amount) ? raw : undefined,
        description: li.description.trim(),
        tags: draft.type.startsWith("GASTO") ? li.tags : [],
      };
    });
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
  const descs = lineItems.map((li) => li.description).join(",");
  return `${concepto}:${descs}`;
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

  return transactions
    .filter((tx) => {
      const abs = Math.abs(Number(tx.amount) || 0);
      const date = tx.rawDateMs ?? Date.parse(tx.rawDate);
      const tagLabels = (tx.tags || [])
        .map((id) => tagLabelsById[id] ?? id)
        .join(" ");
      const haystack = `${tx.detail} ${tx.type} ${tagLabels} ${(tx.lineItems || []).map((li) => li.description).join(" ")}`.toLowerCase();
      if (text && !haystack.includes(text)) return false;
      if (tag && !(tx.tags || []).includes(tag)) return false;
      if (min !== null && abs < min) return false;
      if (max !== null && abs > max) return false;
      if (start && date < start) return false;
      if (end && date > end) return false;
      return true;
    })
    .sort((a, b) => (b.rawDateMs ?? Date.parse(b.rawDate)) - (a.rawDateMs ?? Date.parse(a.rawDate)) || (b.createdAtMs ?? 0) - (a.createdAtMs ?? 0))
    .slice(0, 150);
}

export function calculateMonthSummary(
  transactions: Transaction[],
  freqIncomeByMonth: Record<string, number>,
  monthKey: string,
): SummaryRow {
  const row: SummaryRow = {
    monthYear: monthKey,
    freqIncome: 0,
    nonFreqIncome: 0,
    totalIncome: 0,
    freqExpense: 0,
    nonFreqExpense: 0,
    totalExpense: 0,
    netMonthly: 0,
    netNoFreq: 0,
  };
  transactions.forEach((tx) => {
    if (tx.type === "INGRESO FRECUENTE") row.freqIncome += Number(tx.amount) || 0;
    if (tx.type === "INGRESO NO FRECUENTE") row.nonFreqIncome += Number(tx.amount) || 0;
    if (tx.type === "GASTO FRECUENTE") row.freqExpense += Number(tx.amount) || 0;
    if (tx.type === "GASTO NO FRECUENTE") row.nonFreqExpense += Number(tx.amount) || 0;
  });
  if (row.freqIncome === 0) {
    row.freqIncome = freqIncomeByMonth[monthKey] || 0;
  }
  row.totalIncome = row.freqIncome + row.nonFreqIncome;
  row.totalExpense = row.freqExpense + row.nonFreqExpense;
  row.netMonthly = row.totalIncome + row.totalExpense;
  row.netNoFreq = row.totalIncome + row.totalExpense - row.freqIncome;
  return row;
}

export function getTransactionMonthKey(tx: Transaction): string {
  const date = tx.rawDateMs != null ? new Date(tx.rawDateMs) : parseLocalDate(tx.rawDate);
  return getMonthYear(date);
}

export function recalculateSummariesForMonths(
  transactions: Transaction[],
  freqIncomeByMonth: Record<string, number>,
  monthKeys: string[],
  existingSummaries: SummaryRow[],
): SummaryRow[] {
  if (monthKeys.length === 0) return existingSummaries;
  const monthSet = new Set(monthKeys);
  const byMonth = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    const key = getTransactionMonthKey(tx);
    if (!monthSet.has(key)) return;
    const list = byMonth.get(key);
    if (list) list.push(tx);
    else byMonth.set(key, [tx]);
  });
  const updated = existingSummaries.map((row) =>
    monthSet.has(row.monthYear)
      ? calculateMonthSummary(byMonth.get(row.monthYear) || [], freqIncomeByMonth, row.monthYear)
      : row,
  );
  monthKeys.forEach((key) => {
    if (!updated.some((row) => row.monthYear === key)) {
      updated.push(calculateMonthSummary(byMonth.get(key) || [], freqIncomeByMonth, key));
    }
  });
  updated.sort((a, b) => monthYearToDate(a.monthYear).getTime() - monthYearToDate(b.monthYear).getTime());
  return updated;
}

export function uniqueMonthKeys(transactions: Transaction[]): string[] {
  const set = new Set<string>();
  transactions.forEach((tx) => set.add(getTransactionMonthKey(tx)));
  return Array.from(set);
}

export function calculateSummaries(transactions: Transaction[], freqIncomeByMonth: Record<string, number>): SummaryRow[] {
  const byMonth = new Map<string, Transaction[]>();
  transactions.forEach((tx) => {
    const key = getTransactionMonthKey(tx);
    const list = byMonth.get(key);
    if (list) list.push(tx);
    else byMonth.set(key, [tx]);
  });

  const monthKeys = new Set<string>(byMonth.keys());
  Object.keys(freqIncomeByMonth).forEach((key) => monthKeys.add(key));

  const rows = Array.from(monthKeys).map((monthKey) =>
    calculateMonthSummary(byMonth.get(monthKey) || [], freqIncomeByMonth, monthKey),
  );
  rows.sort((a, b) => monthYearToDate(a.monthYear).getTime() - monthYearToDate(b.monthYear).getTime());
  return rows;
}

// re-exports for backward compat
export { calculateExpression, normalizeAmountExpression } from "@/utils/expressionParser";
export { formatDateToISO, formatDateForSheet, parseSpanishDate, getMonthYear, parseCreatedAtMs } from "@/utils/dateUtils";
