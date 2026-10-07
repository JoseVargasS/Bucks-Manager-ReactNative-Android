import { memo, useCallback, useMemo, useState } from "react";
import { Animated } from "react-native";
import Svg, { Circle, G, Line, Path, Rect, Text as SvgText } from "react-native-svg";

import { computeSavingsLinePoints, MONTH_NAMES, formatMoney, savingsNetBounds, type SavingsTrendMode } from "@/domain/bucksLogic";
import { UI_MONTH_NAMES } from "@/i18n";
import { type Palette } from "@/theme/colors";
import { T } from "@/theme/typography";
import { compactNumber } from "@/utils/formats";
import { useChartEnter } from "./chartFade";
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
  const enterStyle = useChartEnter(
    // Content signature, not the array identity: background reloads rebuild
    // the arrays with identical content and must not replay the entrance.
    useMemo(
      () => `${mode}|` + rows.map((r) => `${r.monthYear}:${r.totalIncome}:${r.totalExpense}:${r.netMonthly}`).join("|"),
      [rows, mode],
    ),
  );
  const displayRows = rows.slice(-12);
  const columnWidth = PLOT_W / Math.max(1, displayRows.length - 1 || 1);
  const rawMax = Math.max(1, ...displayRows.map((r) => Math.max(r.totalIncome, Math.abs(r.totalExpense), 1)));
  const isNet = mode === "net";
  const netBounds = useMemo(() => savingsNetBounds(displayRows), [displayRows]);
  const zeroY = isNet ? BASE_Y - ((0 - netBounds.min) / Math.max(1, netBounds.max - netBounds.min)) * PLOT_H : BASE_Y;

  const { points, lineColor, areaColor } = useMemo(() => {
    const pts = computeSavingsLinePoints(displayRows, mode, BASE_Y, PLOT_H);
    if (mode === "expense") {
      return { points: pts, lineColor: colors.expense, areaColor: colors.expenseSoft };
    }
    return { points: pts, lineColor: colors.income, areaColor: colors.incomeSoft };
  }, [displayRows, mode, colors]);

  const netPointColor = useCallback((index: number) => (
    displayRows[index].netMonthly >= 0 ? colors.income : colors.expense
  ), [displayRows, colors]);

  const netSegments = useMemo(() => {
    if (!isNet || points.length < 2) return [];
    const segs: { d: string; color: string }[] = [];
    for (let i = 0; i < points.length - 1; i++) {
      const x1 = PLOT_LEFT + i * columnWidth;
      const x2 = PLOT_LEFT + (i + 1) * columnWidth;
      const v1 = displayRows[i].netMonthly;
      const v2 = displayRows[i + 1].netMonthly;
      const y1 = points[i].y;
      const y2 = points[i + 1].y;
      const c1 = v1 >= 0 ? colors.income : colors.expense;
      if ((v1 >= 0) === (v2 >= 0)) {
        segs.push({ d: `M ${x1} ${y1} L ${x2} ${y2}`, color: c1 });
      } else {
        const t = (0 - v1) / (v2 - v1);
        const xc = x1 + t * (x2 - x1);
        const c2 = v2 >= 0 ? colors.income : colors.expense;
        segs.push({ d: `M ${x1} ${y1} L ${xc} ${zeroY}`, color: c1 });
        segs.push({ d: `M ${xc} ${zeroY} L ${x2} ${y2}`, color: c2 });
      }
    }
    return segs;
  }, [isNet, points, displayRows, columnWidth, colors, zeroY]);

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

  const hasData = displayRows.some((row) => row.totalIncome > 0 || row.totalExpense !== 0 || row.netMonthly !== 0);

  if (!hasData) return null;

  const span = Math.max(1, netBounds.max - netBounds.min);
  const labels: { y: number; text: string }[] = [0.5, 1].map((ratio) => {
    const y = BASE_Y - ratio * PLOT_H;
    const text = isNet
      ? compact(netBounds.min + ((BASE_Y - y) / PLOT_H) * span)
      : compact(rawMax * ratio);
    return { y, text };
  });

  return (
    <Animated.View style={enterStyle}>
    <Svg width="100%" height={190} viewBox={`0 0 ${CHART_W} 190`} style={{ marginTop: 12 }}>
      {isNet && (
        <Line x1={PLOT_LEFT} y1={zeroY} x2={CHART_W - 8} y2={zeroY} stroke={colors.borderStrong} strokeWidth={1} />
      )}
      {!isNet && (
        <Line x1={PLOT_LEFT} y1={BASE_Y} x2={CHART_W - 8} y2={BASE_Y} stroke={colors.border} strokeWidth={0.75} strokeDasharray="3 5" />
      )}
      <SvgText x={2} y={(isNet ? zeroY : BASE_Y) + 3} fontSize={T.chartLabel.fontSize} fill={colors.muted} fontFamily={fontFamily} fontWeight="500">
        0
      </SvgText>
      {labels.map((lbl, idx) => (
        <G key={idx}>
          <Line x1={PLOT_LEFT} y1={lbl.y} x2={CHART_W - 8} y2={lbl.y} stroke={colors.border} strokeWidth={0.5} strokeDasharray="3 5" />
          <SvgText x={2} y={lbl.y + 3} fontSize={T.chartLabel.fontSize} fill={colors.muted} fontFamily={fontFamily} fontWeight="500">
            {lbl.text}
          </SvgText>
        </G>
      ))}

      {!isNet && <Path d={areaD} fill={areaColor} opacity={0.35} />}
      {!isNet && (
        <Path d={pathD} fill="none" stroke={lineColor} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      )}
      {isNet && netSegments.map((seg, idx) => (
        <Path key={idx} d={seg.d} fill="none" stroke={seg.color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}

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
        const pointColor = isNet ? netPointColor(i) : lineColor;
        const tooltipValue = isNet
          ? formatMoney(displayRows[i].netMonthly, currencySymbol ?? "", 0)
          : mode === "income"
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
            <Circle cx={x} cy={pt.y} r={dotR} fill={isSelected ? pointColor : colors.card} stroke={pointColor} strokeWidth={isSelected ? 2.5 : 2} />
            {showValue && (
              <SvgText
                x={tooltipX}
                y={tooltipY}
                fontSize={isSelected ? T.chartLabel.fontSize : T.chartValue.fontSize}
                fill={pointColor}
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
              fontSize={T.chartLabel.fontSize}
              fill={isSelected ? pointColor : colors.muted}
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
    </Animated.View>
  );
});

function compact(value: number) {
  return compactNumber(value);
}
