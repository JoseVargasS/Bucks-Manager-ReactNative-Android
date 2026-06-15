import Svg, { G, Rect } from "react-native-svg";
import { SummaryRow } from "../../types";
import { Palette } from "../../theme/colors";

export function BarChart({ rows, colors }: { rows: SummaryRow[]; colors: Palette }) {
  const max = Math.max(1, ...rows.map((row) => Math.max(row.totalIncome, Math.abs(row.totalExpense))));
  return (
    <Svg width="100%" height={190}>
      {rows.slice(-12).map((row, index) => {
        const x = 18 + index * 26;
        const inc = (row.totalIncome / max) * 120;
        const exp = (Math.abs(row.totalExpense) / max) * 120;
        return (
          <G key={row.monthYear}>
            <Rect x={x} y={150 - inc} width={9} height={inc} rx={3} fill={colors.green} />
            <Rect x={x + 11} y={150 - exp} width={9} height={exp} rx={3} fill={colors.red} />
          </G>
        );
      })}
    </Svg>
  );
}
