import type { SummaryRow, Tag, Transaction } from "@/types";
import { monthYearToDate } from "@/utils/dateUtils";
import { shiftColor } from "@/utils/color";
import { labelForTagId } from "@/utils/tags";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
  percentage: number;
};

export type NonFreqSpike = {
  monthYear: string;
  amount: number;
  avg: number;
  ratio: number;
  ratioPct: number;
};

export type LinePoint = { y: number; value: number | null };

export type SavingsTrendMode = "income" | "expense";

export function aggregateExpensesByTag(
  transactions: Transaction[],
  tagColorMap: Record<string, string>,
  tagsList: Tag[],
  mutedColor: string,
  otherLabel: string,
): PieSlice[] {
  return aggregateByTagImpl(
    transactions,
    (tx) => tx.amount < 0 && tx.type.startsWith("GASTO"),
    true,
    tagColorMap,
    tagsList,
    mutedColor,
    otherLabel,
  );
}

export function aggregateIncomesByTag(
  transactions: Transaction[],
  tagColorMap: Record<string, string>,
  tagsList: Tag[],
  mutedColor: string,
  otherLabel: string,
): PieSlice[] {
  return aggregateByTagImpl(
    transactions,
    (tx) => tx.amount >= 0 && tx.type.startsWith("INGRESO"),
    false,
    tagColorMap,
    tagsList,
    mutedColor,
    otherLabel,
  );
}

function aggregateByTagImpl(
  transactions: Transaction[],
  filterFn: (tx: Transaction) => boolean,
  takeAbs: boolean,
  tagColorMap: Record<string, string>,
  tagsList: Tag[],
  mutedColor: string,
  otherLabel: string,
): PieSlice[] {
  const filtered = transactions.filter(filterFn);
  const tagTotals: Record<string, number> = {};
  let untaggedTotal = 0;
  let total = 0;
  filtered.forEach((tx) => {
    const lineItems = (tx.lineItems && tx.lineItems.length > 0)
      ? tx.lineItems
      : [{ amount: String(tx.amount), description: tx.detail ?? "", tags: tx.tags ?? [] }];
    lineItems.forEach((li) => {
      const raw = parseFloat(String(li.amount));
      const liAmount = takeAbs ? Math.abs(raw) : raw;
      if (!Number.isFinite(liAmount) || liAmount === 0) return;
      total += liAmount;
      if (li.tags && li.tags.length > 0) {
        li.tags.forEach((tagId) => {
          tagTotals[tagId] = (tagTotals[tagId] || 0) + liAmount;
        });
      } else {
        untaggedTotal += liAmount;
      }
    });
  });
  if (total === 0) return [];

  const slices: { label: string; value: number; color: string }[] = [];
  const tagEntries = Object.entries(tagTotals).sort(([, a], [, b]) => b - a);
  const colorUsed = new Map<string, number>();
  tagEntries.forEach(([id, val]) => {
    const baseColor = tagColorMap[id] || mutedColor;
    const used = colorUsed.get(baseColor) || 0;
    slices.push({
      label: labelForTagId(id, tagsList),
      value: val,
      color: shiftColor(baseColor, used * 12),
    });
    colorUsed.set(baseColor, (colorUsed.get(baseColor) || 0) + 1);
  });
  if (untaggedTotal > 0) {
    slices.push({ label: otherLabel, value: untaggedTotal, color: mutedColor });
  }
  slices.sort((a, b) => b.value - a.value);
  const grandTotal = slices.reduce((s, sl) => s + sl.value, 0) || 1;
  return slices.map((s) => ({
    ...s,
    percentage: (s.value / grandTotal) * 100,
  }));
}

export function detectNonFreqSpike(
  rows: SummaryRow[],
  threshold = 1.5,
): NonFreqSpike | null {
  if (rows.length < 2) return null;
  const sorted = [...rows].sort(
    (a, b) => monthYearToDate(a.monthYear).getTime() - monthYearToDate(b.monthYear).getTime(),
  );
  const last = sorted[sorted.length - 1];
  const lastNonFreq = Math.abs(last.nonFreqExpense);
  if (lastNonFreq === 0) return null;
  const lookback = sorted.slice(0, -1).slice(-6);
  if (lookback.length === 0) return null;
  const avgNonFreq = lookback.reduce((sum, r) => sum + Math.abs(r.nonFreqExpense), 0) / lookback.length;
  if (avgNonFreq === 0) return null;
  const ratio = lastNonFreq / avgNonFreq;
  if (ratio < threshold) return null;
  return {
    monthYear: last.monthYear,
    amount: lastNonFreq,
    avg: avgNonFreq,
    ratio,
    ratioPct: Math.round(ratio * 100),
  };
}

export function computeSavingsLinePoints(
  rows: SummaryRow[],
  mode: SavingsTrendMode,
  baseY: number,
  plotH: number,
): LinePoint[] {
  if (!rows.length) return [];
  const max = Math.max(1, ...rows.map((r) => Math.max(r.totalIncome, Math.abs(r.totalExpense), 1)));
  if (mode === "expense") {
    return rows.map((row) => {
      const val = Math.abs(row.totalExpense);
      if (max === 0) return { y: baseY, value: null };
      const y = baseY - (val / max) * plotH;
      return { y, value: null };
    });
  }
  return rows.map((row) => {
    if (max === 0) return { y: baseY, value: null };
    const y = baseY - (row.totalIncome / max) * plotH;
    return { y, value: null };
  });
}
