import { memo, useMemo, useState } from "react";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { computeSavingsLinePoints, MONTH_NAMES, formatMoney, type SavingsTrendMode } from "@/domain/bucksLogic";
import { UI_MONTH_NAMES } from "@/i18n";
import { type Palette } from "@/theme/colors";
import { type SummaryRow } from "@/types";
import { useAppFontFamily } from "./AppText";

const CHART_W = 360;
const PLOT_LEFT = 36;
const PLOT_W = 316;
const BASE_Y = 158;
const PLOT_H = 126;

export { type SavingsTrendMode } from "@/domain/bucksLogic";

export const SavingsLineChart = memo(function SavingsLineChart({
  rows,
  colors,
  language,
  mode = "income",
  currencySymbol = "",
  isYearly = false,
}: {
  rows: SummaryRow[];
  colors: Palette;
  language: "es" | "en";
  mode?: SavingsTrendMode;
  currencySymbol?: string;
  isYearly?: boolean;
}) {
  const fontFamily = useAppFontFamily();
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const displayRows = rows.slice(-12);
  const columnWidth = PLOT_W / Math.max(1, displayRows.length - 1 || 1);
  const rawMax = Math.max(1, ...displayRows.map((r) => Math.max(r.totalIncome, Math.abs(r.totalExpense), 1)));

  const { points, lineColor, areaColor } = useMemo(() => {
    const pts = computeSavingsLinePoints(displayRows, mode, BASE_Y, PLOT_H);
    if (mode === "expense") {
      return { points: pts, lineColor: colors.expense, areaColor: colors.expenseSoft };
    }
    return { points: pts, lineColor: colors.income, areaColor: colors.incomeSoft };
  }, [displayRows, mode, colors]);

  const pathD = useMemo(() => {
    if (points.length === 0) return "";
    return points
      .map((pt, i) => {
        const x = PLOT_LEFT + i * columnWidth;
        return `${i === 0 ? "M" : "L"} ${x} ${pt.y}`;
      })
      .join(" ");
  }, [points, columnWidth]);

  const areaD = useMemo(() => {
    if (points.length === 0) return "";
    const firstX = PLOT_LEFT;
    const lastX = PLOT_LEFT + (points.length - 1) * columnWidth;
    return `${pathD} L ${lastX} ${BASE_Y} L ${firstX} ${BASE_Y} Z`;
  }, [pathD, points, columnWidth]);

  const hasData = displayRows.some((row) => row.totalIncome > 0 || row.totalExpense !== 0);

  if (!hasData) return null;

  const labels: { y: number; text: string }[] = [0.5, 1].map((ratio) => ({
    y: BASE_Y - ratio * PLOT_H,
    text: compact(rawMax * ratio),
  }));

  return (
    <Svg width="100%" height={190} viewBox={`0 0 ${CHART_W} 190`} style={{ marginTop: 12 }}>
      <Line x1={PLOT_LEFT} y1={BASE_Y} x2={CHART_W - 8} y2={BASE_Y} stroke={colors.border} strokeWidth={0.75} strokeDasharray="3 5" />
      <SvgText x={2} y={BASE_Y + 3} fontSize={10} fill={colors.muted} fontFamily={fontFamily} fontWeight="500">
        0
      </SvgText>
      {labels.map((lbl, idx) => (
        <G key={idx}>
          <Line x1={PLOT_LEFT} y1={lbl.y} x2={CHART_W - 8} y2={lbl.y} stroke={colors.border} strokeWidth={0.5} strokeDasharray="3 5" />
          <SvgText x={2} y={lbl.y + 3} fontSize={10} fill={colors.muted} fontFamily={fontFamily} fontWeight="500">
            {lbl.text}
          </SvgText>
        </G>
      ))}

      <Path d={areaD} fill={areaColor} opacity={0.35} />
      <Path d={pathD} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

      {points.map((pt, i) => {
        const x = PLOT_LEFT + i * columnWidth;
        const isSelected = selectedIndex === i;
        const dotR = isSelected ? 7 : 4.5;
        const labelText = isYearly
          ? (displayRows[i].monthYear.split(" ").pop() || "").slice(-2)
          : (() => {
              const monthName = MONTH_NAMES.findIndex(
                (name) => name.toLowerCase() === (displayRows[i].monthYear.split(" ")[0] || "").toLowerCase(),
              );
              return UI_MONTH_NAMES[language][Math.max(0, monthName)].slice(0, 3).toUpperCase();
            })();
        const showValue = isSelected;
        const tooltipValue = mode === "income"
          ? formatMoney(displayRows[i].totalIncome, currencySymbol ?? "", 0)
          : formatMoney(displayRows[i].totalExpense, currencySymbol ?? "", 0);
        const isRightEdge = i === points.length - 1 || i === points.length - 2;
        const isLeftEdge = i === 0 || i === 1;
        const textAnchor = isRightEdge ? "end" : isLeftEdge ? "start" : "middle";
        const tooltipX = isRightEdge ? x - 8 : isLeftEdge ? x + 8 : x;
        const tooltipY = Math.max(14, pt.y - 12);
        const hitRadius = Math.max(18, columnWidth * 0.48);
        return (
          <G key={i}>
            <Rect
              x={x - hitRadius}
              y={tooltipY - 20}
              width={hitRadius * 2}
              height={BASE_Y - tooltipY + 40}
              fill="transparent"
              onPress={() => setSelectedIndex(isSelected ? -1 : i)}
            />
            <Circle cx={x} cy={pt.y} r={dotR} fill={isSelected ? lineColor : colors.card} stroke={lineColor} strokeWidth={isSelected ? 2.5 : 2} />
            {showValue && (
              <SvgText
                x={tooltipX}
                y={tooltipY}
                fontSize={isSelected ? 10 : 9}
                fill={lineColor}
                fontFamily={fontFamily}
                textAnchor={textAnchor}
                fontWeight="700"
              >
                {tooltipValue}
              </SvgText>
            )}
            <SvgText
              x={x}
              y={BASE_Y + 17}
              fontSize={10.5}
              fill={isSelected ? lineColor : colors.muted}
              fontFamily={fontFamily}
              textAnchor="middle"
              fontWeight={isSelected ? "700" : "600"}
            >
              {labelText}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
});

function compact(value: number) {
  return new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 }).format(value);
}
