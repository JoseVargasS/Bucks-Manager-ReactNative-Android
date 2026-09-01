import { memo, useCallback, useMemo, useState } from "react";
import { Animated } from "react-native";
import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";

import { MONTH_NAMES, formatMoney } from "@/domain/bucksLogic";
import { UI_MONTH_NAMES } from "@/i18n";
import { type Palette } from "@/theme/colors";
import { type SummaryRow } from "@/types";
import { T } from "@/theme/typography";
import { useAppFontFamily } from "./AppText";
import { useChartFade } from "./chartFade";

const AnimG = Animated.createAnimatedComponent(G);

export const BarChart = memo(function BarChart({
  rows,
  colors,
  language,
  onSelectMonth,
  isYearly = false,
  currencySymbol = "",
}: {
  rows: SummaryRow[];
  colors: Palette;
  language: "es" | "en";
  onSelectMonth?: (monthYear: string) => void;
  isYearly?: boolean;
  currencySymbol?: string;
}) {
  const fontFamily = useAppFontFamily();
  const displayRows = rows.slice(-12);
  const max = Math.max(1, ...displayRows.map((row) => Math.max(row.totalIncome, Math.abs(row.totalExpense))));
  const chartWidth = 360;
  const plotLeft = 30;
  const plotWidth = 322;
  const baseY = 158;
  const plotHeight = 126;
  const columnWidth = plotWidth / Math.max(1, displayRows.length);
  const barWidth = Math.min(10, Math.max(5, columnWidth * 0.28));
  const gap = 3;

  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  const handleSelect = useCallback((monthYear: string) => {
    setSelectedKey((prev) => {
      const next = prev === monthYear ? null : monthYear;
      if (next) onSelectMonth?.(next);
      return next;
    });
  }, [onSelectMonth]);

  const selectedIndex = useMemo(
    () => (selectedKey === null ? -1 : displayRows.findIndex((r) => r.monthYear === selectedKey)),
    [selectedKey, displayRows],
  );

  const opacitiesRef = useChartFade(displayRows.length, selectedIndex);

  const hitTargets = useMemo(() => {
    return displayRows.map((row, index) => {
      const groupWidth = barWidth * 2 + gap;
      const x = plotLeft + index * columnWidth + (columnWidth - groupWidth) / 2;
      return {
        key: row.monthYear,
        x: x - 2,
        y: baseY - plotHeight - 1,
        width: groupWidth + 4,
        height: plotHeight + 20,
      };
    });
  }, [displayRows, barWidth, columnWidth, gap, plotLeft, baseY, plotHeight]);

  return (
    <Svg width="100%" height={190} viewBox={`0 0 ${chartWidth} 190`} style={{ marginTop: 12 }}>
      {[0.25, 0.5, 0.75, 1].map((ratio) => {
        const y = baseY - plotHeight * ratio;
        return (
          <G key={ratio}>
            <Line x1={plotLeft} y1={y} x2={chartWidth - 8} y2={y} stroke={colors.border} strokeWidth={0.75} strokeDasharray="3 5" />
            {(ratio === 0.5 || ratio === 1) && (
              <SvgText x={2} y={y + 3} fontSize={T.chartLabel.fontSize} fill={colors.muted} fontFamily={fontFamily} fontWeight={String(T.chartLabel.fontWeight)}>{compact(max * ratio)}</SvgText>
            )}
          </G>
        );
      })}
      <Line x1={plotLeft} y1={baseY} x2={chartWidth - 8} y2={baseY} stroke={colors.borderStrong} strokeWidth={1} />
      {displayRows.map((row, index) => {
        const groupWidth = barWidth * 2 + gap;
        const x = plotLeft + index * columnWidth + (columnWidth - groupWidth) / 2;
        const incomeHeight = row.totalIncome ? Math.max(3, (row.totalIncome / max) * plotHeight) : 0;
        const expenseHeight = row.totalExpense ? Math.max(3, (Math.abs(row.totalExpense) / max) * plotHeight) : 0;
        const labelText = isYearly
          ? row.monthYear.split(" ").pop() || ""
          : (() => {
              const sourceMonth = row.monthYear.split(" ")[0];
              const month = Math.max(0, MONTH_NAMES.findIndex((name) => name.toLowerCase() === sourceMonth.toLowerCase()));
              return UI_MONTH_NAMES[language][month].slice(0, 3).toUpperCase();
            })();
        const isSelectable = typeof onSelectMonth === "function";
        const isSelected = selectedKey === row.monthYear;
        const showTooltip = isSelectable && isSelected;
        return (
          <AnimG key={row.monthYear} opacity={opacitiesRef.current[index]}>
            <Rect x={x} y={baseY - incomeHeight} width={barWidth} height={incomeHeight} rx={3} fill={colors.income} opacity={0.92} />
            <Rect x={x + barWidth + gap} y={baseY - expenseHeight} width={barWidth} height={expenseHeight} rx={3} fill={colors.expense} opacity={0.88} />
            {showTooltip && (row.totalIncome > 0 || row.totalExpense !== 0) && (
              <>
                <SvgText x={x + groupWidth / 2} y={baseY - Math.max(incomeHeight, expenseHeight) - 14} fontSize={T.chartValue.fontSize} fill={colors.income} fontFamily={fontFamily} textAnchor="middle" fontWeight={String(T.chartValue.fontWeight)}>
                  {formatMoney(row.totalIncome, currencySymbol ?? "", 0)}
                </SvgText>
                <SvgText x={x + groupWidth / 2} y={baseY - Math.max(incomeHeight, expenseHeight) - 3} fontSize={T.chartValue.fontSize} fill={colors.expense} fontFamily={fontFamily} textAnchor="middle" fontWeight={String(T.chartValue.fontWeight)}>
                  {formatMoney(Math.abs(row.totalExpense), currencySymbol ?? "", 0)}
                </SvgText>
              </>
            )}
            <SvgText x={x + groupWidth / 2} y={baseY + 17} fontSize={T.chartLabel.fontSize} fill={colors.muted} fontFamily={fontFamily} textAnchor="middle" fontWeight={String(T.label.fontWeight)}>
              {labelText}
            </SvgText>
            {isSelectable && (
              <Rect
                x={hitTargets[index].x}
                y={hitTargets[index].y}
                width={hitTargets[index].width}
                height={hitTargets[index].height}
                fill="transparent"
                onPress={() => handleSelect(row.monthYear)}
              />
            )}
          </AnimG>
        );
      })}
    </Svg>
  );
});

const compactFormatter = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

function compact(value: number) {
  return compactFormatter.format(value);
}
