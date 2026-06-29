import { memo } from "react";
import { View } from "react-native";
import Svg, { Path, Text as SvgText } from "react-native-svg";

import { type Palette } from "@/theme/colors";
import { Text } from "./AppText";

export type PieSlice = {
  label: string;
  value: number;
  color: string;
  percentage: number;
};

function polarToCartesian(
  cx: number,
  cy: number,
  r: number,
  angleDeg: number,
): { x: number; y: number } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeDonutSegment(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number,
): string {
  if (endAngle - startAngle >= 359.99) {
    const mid = (startAngle + endAngle) / 2;
    const s1 = polarToCartesian(cx, cy, outerR, startAngle);
    const e1 = polarToCartesian(cx, cy, outerR, mid);
    const s2 = polarToCartesian(cx, cy, innerR, startAngle);
    const e2 = polarToCartesian(cx, cy, innerR, mid);
    const s3 = polarToCartesian(cx, cy, outerR, mid);
    const e3 = polarToCartesian(cx, cy, outerR, endAngle);
    const s4 = polarToCartesian(cx, cy, innerR, mid);
    const e4 = polarToCartesian(cx, cy, innerR, endAngle);
    return [
      `M ${s1.x} ${s1.y} A ${outerR} ${outerR} 0 0 0 ${e1.x} ${e1.y}`,
      `L ${e2.x} ${e2.y}`,
      `A ${innerR} ${innerR} 0 0 1 ${s2.x} ${s2.y} Z`,
      `M ${s3.x} ${s3.y} A ${outerR} ${outerR} 0 0 0 ${e3.x} ${e3.y}`,
      `L ${e4.x} ${e4.y}`,
      `A ${innerR} ${innerR} 0 0 1 ${s4.x} ${s4.y} Z`,
    ].join(" ");
  }
  const start = polarToCartesian(cx, cy, outerR, endAngle);
  const end = polarToCartesian(cx, cy, outerR, startAngle);
  const innerStart = polarToCartesian(cx, cy, innerR, endAngle);
  const innerEnd = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return [
    `M ${start.x} ${start.y}`,
    `A ${outerR} ${outerR} 0 ${largeArc} 0 ${end.x} ${end.y}`,
    `L ${innerEnd.x} ${innerEnd.y}`,
    `A ${innerR} ${innerR} 0 ${largeArc} 1 ${innerStart.x} ${innerStart.y}`,
    "Z",
  ].join(" ");
}

export const PieChart = memo(function PieChart({
  data,
  colors,
  currencySymbol,
  size = 174,
  formatValue,
}: {
  data: PieSlice[];
  colors: Palette;
  currencySymbol: string;
  size?: number;
  formatValue?: (value: number) => string;
}) {
  if (!data.length) return null;

  const cx = size / 2;
  const cy = size / 2;
  const outerR = size / 2 - 4;
  const innerR = outerR * 0.58;
  const total = data.reduce((sum, s) => sum + s.value, 0);
  const fm = formatValue || ((v: number) => `${currencySymbol}${v.toFixed(0)}`);
  let currentAngle = 0;

  const segments = data.map((slice) => {
    const sliceAngle = (slice.percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;
    currentAngle = endAngle;
    const path = describeDonutSegment(
      cx,
      cy,
      outerR,
      innerR,
      startAngle,
      endAngle,
    );
    const midAngle = startAngle + sliceAngle / 2;
    const labelR = (innerR + outerR) / 2;
    const labelPos = polarToCartesian(cx, cy, labelR, midAngle);
    return { ...slice, path, midAngle, labelPos };
  });

  return (
    <View style={{ alignItems: "center", gap: 14 }}>
      <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((seg) => (
          <Path
            key={seg.label}
            d={seg.path}
            fill={seg.color}
            opacity={0.92}
          />
        ))}
        {segments
          .filter((seg) => seg.percentage >= 5)
          .map((seg) => (
            <SvgText
              key={seg.label}
              x={seg.labelPos.x}
              y={seg.labelPos.y}
              textAnchor="middle"
              alignmentBaseline="middle"
              fontSize={10}
              fontWeight="700"
              fill="#fff"
            >
              {seg.percentage.toFixed(0)}%
            </SvgText>
          ))}
        <SvgText
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize={15}
          fontWeight="700"
          fill={colors.text}
        >
          {fm(total)}
        </SvgText>
        <SvgText
          x={cx}
          y={cy + 12}
          textAnchor="middle"
          fontSize={11}
          fontWeight="500"
          fill={colors.muted}
        >
          total
        </SvgText>
      </Svg>

      <View style={{ width: "100%", gap: 8 }}>
        {data.map((slice) => (
          <View
            key={slice.label}
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: 8,
            }}
          >
            <View
              style={{
                width: 10,
                height: 10,
                borderRadius: 3,
                backgroundColor: slice.color,
              }}
            />
            <Text
              numberOfLines={1}
              style={{
                flex: 1,
                color: colors.muted,
                fontSize: 13,
                fontWeight: "500",
              }}
            >
              {slice.label}
            </Text>
            <Text
              style={{
                color: slice.color,
                fontSize: 13,
                fontWeight: "700",
                fontVariant: ["tabular-nums"],
                minWidth: 40,
                textAlign: "right",
              }}
            >
              {slice.percentage.toFixed(0)}%
            </Text>
            <Text
              style={{
                color: colors.text,
                fontSize: 13,
                fontWeight: "600",
                fontVariant: ["tabular-nums"],
                minWidth: 60,
                textAlign: "right",
              }}
            >
              {fm(slice.value)}
            </Text>
          </View>
        ))}
      </View>
    </View>
  );
});
