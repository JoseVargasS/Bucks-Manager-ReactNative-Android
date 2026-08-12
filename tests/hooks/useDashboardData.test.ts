jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: () => unknown) => fn(),
}));

import { useDashboardData } from "@/hooks/useDashboardData";
import { UI_COPY } from "@/i18n";
import { dark } from "@/theme/colors";
import type { Tag, Transaction } from "@/types";

function tx(
  rowId: number,
  rawDateMs: number,
  amount: number,
  type: Transaction["type"],
  tags: string[] = [],
): Transaction {
  return {
    rowId,
    date: "",
    rawDate: new Date(rawDateMs).toISOString(),
    rawDateMs,
    amount,
    detail: `tx-${rowId}`,
    type,
    tags,
  };
}

describe("useDashboardData", () => {
  const tagsList: Tag[] = [
    { id: "t1", label: "Food", color: "#ff0000" },
    { id: "t2", label: "Health", color: "#00ff00" },
  ];
  const tagColorMap = { t1: "#ff0000", t2: "#00ff00" };
  const colors = dark;
  const copy = UI_COPY.en;

  // January 2026 is the current month, December 2025 is the previous one.
  const jan1 = new Date(2026, 0, 5).getTime();
  const jan2 = new Date(2026, 0, 15).getTime();
  const dec1 = new Date(2025, 11, 5).getTime();

  const transactions: Transaction[] = [
    tx(2, jan1, 1000, "INGRESO NO FRECUENTE"),
    tx(3, jan2, -300, "GASTO NO FRECUENTE", ["t1"]),
    tx(4, jan2, -200, "GASTO NO FRECUENTE", ["t2"]),
    tx(5, dec1, 500, "INGRESO NO FRECUENTE"),
    tx(6, dec1, -100, "GASTO NO FRECUENTE", ["t1"]),
  ];

  it("groups transactions into the current and previous month", () => {
    const data = useDashboardData(transactions, 0, 2026, tagColorMap, tagsList, colors, copy);

    expect(data.monthKey).toBe("January 2026");
    expect(data.prevMonthKey).toBe("December 2025");
    expect(data.monthTransactions).toHaveLength(3);
    expect(data.prevMonthTransactions).toHaveLength(2);
  });

  it("computes savingsRate and balanceChange from the monthly summaries", () => {
    const data = useDashboardData(transactions, 0, 2026, tagColorMap, tagsList, colors, copy);

    // January: 1000 income + (-500) expenses = 500 net.
    expect(data.summary.totalIncome).toBe(1000);
    expect(data.summary.totalExpense).toBe(-500);
    expect(data.savingsRate).toBe("50%");

    // December: 500 income + (-100) expense = 400 net.
    expect(data.prevSummary.netMonthly).toBe(400);
    expect(data.balanceChange).toBe(25);
    expect(data.vsPrev).toBe("+25%");
    expect(data.vsPrevPositive).toBe(true);
  });

  it("returns the last 7 transactions in reverse chronological order", () => {
    const data = useDashboardData(transactions, 0, 2026, tagColorMap, tagsList, colors, copy);
    expect(data.recentTransactions).toHaveLength(5);
    expect(data.recentTransactions[0].rowId).toBe(6);
    expect(data.recentTransactions[4].rowId).toBe(2);
  });

  it("aggregates expense pie data by tag with the correct total", () => {
    const data = useDashboardData(transactions, 0, 2026, tagColorMap, tagsList, colors, copy);

    expect(data.expensePieData).toHaveLength(2);
    const total = data.expensePieData.reduce((sum, slice) => sum + slice.value, 0);
    expect(total).toBe(500);

    const food = data.expensePieData.find((slice) => slice.label === "Food");
    const health = data.expensePieData.find((slice) => slice.label === "Health");
    expect(food?.value).toBe(300);
    expect(health?.value).toBe(200);
    expect(food?.percentage).toBeCloseTo(60);
    expect(health?.percentage).toBeCloseTo(40);
  });

  it("handles an empty transaction list", () => {
    const data = useDashboardData([], 0, 2026, tagColorMap, tagsList, colors, copy);

    expect(data.monthTransactions).toEqual([]);
    expect(data.prevMonthTransactions).toEqual([]);
    expect(data.recentTransactions).toEqual([]);
    expect(data.savingsRate).toBe("—");
    expect(data.expensePieData).toEqual([]);
  });
});
