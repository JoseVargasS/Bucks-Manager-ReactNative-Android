import Svg, { G, Line, Rect, Text as SvgText } from "react-native-svg";
import { SummaryRow } from "../../types";
import { Palette } from "../../theme/colors";

export function BarChart({ rows, colors }: { rows: SummaryRow[]; colors: Palette }) {
  const displayRows = rows.slice(-12);
  const max = Math.max(1, ...displayRows.map((row) => Math.max(row.totalIncome, Math.abs(row.totalExpense))));
  const barWidth = 9;
  const gap = 3;
  const columnWidth = 27;
  const baseY = 150;
  const chartHeight = 176;
  return (
    <Svg width="100%" height={chartHeight} style={{ marginBottom: 8 }}>
      <Line x1={12} y1={baseY} x2="96%" y2={baseY} stroke={colors.border} strokeWidth={1} />
      {displayRows.map((row, index) => {
        const x = 14 + index * columnWidth;
        const inc = Math.max(2, (row.totalIncome / max) * 122);
        const exp = Math.max(2, (Math.abs(row.totalExpense) / max) * 122);
        const monthLabel = row.monthYear.slice(0, 3);
        return (
          <G key={row.monthYear}>
            <Rect x={x} y={baseY - inc} width={barWidth} height={inc} rx={3} fill={colors.green} opacity={0.85} />
            <Rect x={x + barWidth + gap} y={baseY - exp} width={barWidth} height={exp} rx={3} fill={colors.red} opacity={0.85} />
            <SvgText x={x + barWidth} y={baseY + 15} fontSize={9} fill={colors.muted} textAnchor="middle" fontWeight="500">
              {monthLabel}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}
