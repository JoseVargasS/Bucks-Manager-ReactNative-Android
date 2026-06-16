import { Text, View } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";

export function PieCard({ title, values, colors, labels, tints, danger = false }: { title: string; values: number[]; colors: Palette; labels: string[]; tints: string[]; danger?: boolean }) {
  const total = values.reduce((a: number, b: number) => a + b, 0) || 1;
  let cumulative = 0;
  const segments = values.map((v: number) => {
    const start = cumulative;
    cumulative += v;
    return { value: v, pct: v / total, startAngle: (start / total) * 360 };
  });
  const stroke = 2 * Math.PI * 38;
  return (
    <View style={[styles.chartCard, { backgroundColor: colors.card }]}>
      <Text style={[styles.sectionTitle, { color: colors.text }]}>{title} — S/ {values.reduce((a: number, b: number) => a + b, 0).toFixed(2)}</Text>
      <Svg width={128} height={128}>
        <Circle cx={64} cy={64} r={38} stroke={colors.border} strokeWidth={18} fill="none" />
        {segments.map((seg: { value: number; pct: number; startAngle: number }, i: number) => {
          const color = tints?.[i] || (danger ? colors.red : colors.green);
          return (
            <Circle
              key={i}
              cx={64} cy={64} r={38}
              stroke={color}
              strokeWidth={18} fill="none"
              strokeDasharray={`${stroke * seg.pct} ${stroke}`}
              strokeLinecap="butt"
              rotation={seg.startAngle - 90}
              origin="64,64"
            />
          );
        })}
      </Svg>
      {labels && <View style={{ width: "100%", marginTop: 8, gap: 4 }}>
        {labels.map((label: string, i: number) => {
          const color = tints?.[i] || (danger ? colors.red : colors.green);
          return (
            <View key={label} style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: color }} />
              <Text style={{ flex: 1, fontSize: 11, fontWeight: "500", color: colors.text }}>{label}</Text>
              <Text style={{ fontSize: 11, fontWeight: "700", color, fontVariant: ["tabular-nums"] }}>S/ {values[i].toFixed(2)}</Text>
            </View>
          );
        })}
      </View>}
    </View>
  );
}
