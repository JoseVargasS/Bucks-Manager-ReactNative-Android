import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";

import { type Palette } from "@/theme/colors";
import { Text } from "./AppText";

const AnimPath = Animated.createAnimatedComponent(Path);

export type PieSlice = {
  label: string;
  value: number;
  color: string;
  percentage: number;
};

type MergedSlice = PieSlice & { key: string; isMerged: boolean };

const CX = 130;
const CY = 115;
const OR = 78;
const IR = 46;
const SELECTED_GROW = 8;
const DIM_OPACITY = 0.32;
const IDLE_OPACITY = 0.94;
const SELECTED_OPACITY = 1;
const SVG_W = 260;
const SVG_H = 230;
const LABEL_MARGIN = 35;
const ROW_HEIGHT = 30;

function pt(cx: number, cy: number, r: number, deg: number) {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function arc(
  cx: number,
  cy: number,
  oR: number,
  iR: number,
  a0: number,
  a1: number,
): string {
  if (a1 - a0 >= 359.99) {
    const m = (a0 + a1) / 2;
    return [
      `M ${pt(cx, cy, oR, a0).x} ${pt(cx, cy, oR, a0).y}`,
      `A ${oR} ${oR} 0 0 0 ${pt(cx, cy, oR, m).x} ${pt(cx, cy, oR, m).y}`,
      `L ${pt(cx, cy, iR, m).x} ${pt(cx, cy, iR, m).y}`,
      `A ${iR} ${iR} 0 0 1 ${pt(cx, cy, iR, a0).x} ${pt(cx, cy, iR, a0).y} Z`,
      `M ${pt(cx, cy, oR, m).x} ${pt(cx, cy, oR, m).y}`,
      `A ${oR} ${oR} 0 0 0 ${pt(cx, cy, oR, a1).x} ${pt(cx, cy, oR, a1).y}`,
      `L ${pt(cx, cy, iR, a1).x} ${pt(cx, cy, iR, a1).y}`,
      `A ${iR} ${iR} 0 0 1 ${pt(cx, cy, iR, m).x} ${pt(cx, cy, iR, m).y} Z`,
    ].join(" ");
  }
  const s = pt(cx, cy, oR, a1),
    e = pt(cx, cy, oR, a0);
  const si = pt(cx, cy, iR, a1),
    ei = pt(cx, cy, iR, a0);
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${oR} ${oR} 0 ${lg} 0 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${iR} ${iR} 0 ${lg} 1 ${si.x} ${si.y} Z`;
}

function trimLabel(text: string, max: number) {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}

const SliceRow = memo(function SliceRow({
  slice,
  selected,
  dimmed,
  color,
  colors,
  fm,
  onPress,
}: {
  slice: MergedSlice;
  selected: boolean;
  dimmed: boolean;
  color: string;
  colors: Palette;
  fm: (v: number) => string;
  onPress: (key: string) => void;
}) {
  const handlePress = useCallback(
    () => onPress(slice.key),
    [onPress, slice.key],
  );
  return (
    <Pressable
      onPress={handlePress}
      hitSlop={6}
      style={({ pressed }) => ({
        flexDirection: "row",
        alignItems: "center",
        gap: 10,
        paddingVertical: 8,
        paddingHorizontal: 10,
        marginHorizontal: -10,
        borderRadius: 10,
        backgroundColor: selected
          ? colors.input
          : pressed
            ? colors.input
            : "transparent",
        opacity: dimmed ? 0.45 : 1,
      })}
    >
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 3,
          backgroundColor: color,
          flexShrink: 0,
        }}
      />
      <Text
        numberOfLines={1}
        style={{
          flex: 1,
          color: selected ? colors.text : colors.muted,
          fontSize: 13,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {slice.label}
      </Text>
      <Text
        style={{
          color,
          fontSize: 12,
          fontWeight: "700",
          fontVariant: ["tabular-nums"],
          minWidth: 44,
          textAlign: "right",
        }}
      >
        {slice.percentage.toFixed(1)}%
      </Text>
      <Text
        style={{
          color: colors.text,
          fontSize: 13,
          fontWeight: "600",
          fontVariant: ["tabular-nums"],
          minWidth: 64,
          textAlign: "right",
        }}
      >
        {fm(slice.value)}
      </Text>
    </Pressable>
  );
});

export const PieChart = memo(function PieChart({
  data,
  colors,
  currencySymbol,
  formatValue,
  totalLabel = "total",
  otherLabel,
}: {
  data: PieSlice[];
  colors: Palette;
  currencySymbol: string;
  formatValue?: (v: number) => string;
  totalLabel?: string;
  otherLabel?: string;
}) {
  const fm = useMemo(
    () => formatValue || ((v: number) => `${currencySymbol}${v.toFixed(0)}`),
    [formatValue, currencySymbol],
  );

  const merged = useMemo<MergedSlice[]>(() => {
    if (!data.length) return [];
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const small: PieSlice[] = [];
    const main: PieSlice[] = [];
    sorted.forEach((s) => (s.percentage < 5 ? small : main).push(s));
    if (small.length > 1) {
      const mergedValue = small.reduce((sum, s) => sum + s.value, 0);
      const total = data.reduce((sum, s) => sum + s.value, 0) || 1;
      const mergedSlice: MergedSlice = {
        key: "__others__",
        label: otherLabel || "Otros",
        value: mergedValue,
        color: colors.muted,
        percentage: (mergedValue / total) * 100,
        isMerged: true,
      };
      return [
        ...main.map((s, i) => ({ ...s, key: `${i}`, isMerged: false })),
        mergedSlice,
      ].sort((a, b) => b.value - a.value);
    }
    return sorted.map((s, i) => ({ ...s, key: `${i}`, isMerged: false }));
  }, [data, colors.muted, otherLabel]);

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);

  const arcs = useMemo(() => {
    let a = 0;
    return merged.map((s) => {
      const sw = (s.percentage / 100) * 360;
      const a0 = a;
      const a1 = a + sw;
      a = a1;
      return { slice: s, a0, a1, mid: (a0 + a1) / 2 };
    });
  }, [merged]);

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const selectedIndex = useMemo(
    () =>
      selectedKey === null
        ? -1
        : merged.findIndex((s) => s.key === selectedKey),
    [selectedKey, merged],
  );

  const handleSelect = useCallback((key: string) => {
    setSelectedKey((prev) => (prev === key ? null : key));
  }, []);

  const clearSelection = useCallback(() => setSelectedKey(null), []);

  useEffect(() => {
    if (selectedKey === null) return;
    if (selectedIndex === -1) setSelectedKey(null);
  }, [selectedKey, selectedIndex]);

  const opacitiesRef = useRef<Animated.Value[]>([]);
  const dataRef = useRef(data);
  if (opacitiesRef.current.length !== merged.length || data !== dataRef.current) {
    opacitiesRef.current = merged.map(() => new Animated.Value(IDLE_OPACITY));
    dataRef.current = data;
  }
  const opacities = opacitiesRef.current;

  useEffect(() => {
    if (opacities.length === 0) return;
    const target = selectedIndex === -1 ? IDLE_OPACITY : DIM_OPACITY;
    const anims = opacities.map((value, i) =>
      Animated.timing(value, {
        toValue: i === selectedIndex ? SELECTED_OPACITY : target,
        duration: 220,
        useNativeDriver: false,
      }),
    );
    Animated.parallel(anims).start();
  }, [selectedIndex, opacities, merged.length]);

  const sweepToken = useRef(0);
  useEffect(() => {
    if (selectedKey !== null) return;
    if (opacities.length === 0) return;
    const token = ++sweepToken.current;
    const n = opacities.length;
    let i = 0;
    const step = () => {
      if (sweepToken.current !== token) return;
      Animated.timing(opacities[i], {
        toValue: 1,
        duration: 220,
        useNativeDriver: false,
      }).start();
      setTimeout(() => {
        if (sweepToken.current !== token) return;
        Animated.timing(opacities[i], {
          toValue: IDLE_OPACITY,
          duration: 220,
          useNativeDriver: false,
        }).start();
        i = (i + 1) % n;
        if (sweepToken.current === token) setTimeout(step, 140);
      }, 260);
    };
    const initial = setTimeout(step, 380);
    return () => {
      clearTimeout(initial);
    };
  }, [selectedKey, opacities]);

  const labelPlacements = useMemo(() => {
    const items = arcs
      .filter((a) => a.slice.percentage >= 5)
      .map((a) => {
        const tickOuter = pt(CX, CY, OR + 12, a.mid);
        return { arc: a, tickOuter, isLeft: tickOuter.x < CX };
      });

    const assign = (group: typeof items) => {
      const sorted = [...group].sort((a, b) => a.tickOuter.y - b.tickOuter.y);
      const result: (typeof sorted[0] & { placedY: number })[] = [];
      let lastY = -Infinity;
      for (const item of sorted) {
        const placedY = Math.max(item.tickOuter.y, lastY + ROW_HEIGHT);
        result.push({ ...item, placedY });
        lastY = placedY;
      }
      return result;
    };

    const left = assign(items.filter((c) => c.isLeft));
    const right = assign(items.filter((c) => !c.isLeft));
    return [...left, ...right];
  }, [arcs]);

  if (!data.length) return null;

  const selected = selectedIndex >= 0 ? merged[selectedIndex] : null;
  const hasSelection = selected !== null;

  return (
    <View style={{ alignItems: "center", gap: 16 }}>
      <Pressable
        onPress={clearSelection}
        style={{ width: "100%", alignItems: "center" }}
      >
        <Svg
          width="100%"
          height={SVG_H}
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {arcs.map((a, i) => {
            const isSelected = a.slice.key === selectedKey;
            const r = isSelected ? OR + SELECTED_GROW : OR;
            return (
              <AnimPath
                key={a.slice.key}
                d={arc(CX, CY, r, IR, a.a0, a.a1)}
                fill={a.slice.color}
                opacity={opacities[i]}
                onPress={() => handleSelect(a.slice.key)}
              />
            );
          })}
          {hasSelection && selected ? (
            <G>
              <SvgText
                x={CX}
                y={CY - 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill={colors.muted}
                letterSpacing={0.4}
              >
                {trimLabel(selected.label.toUpperCase(), 14)}
              </SvgText>
              <SvgText
                x={CX}
                y={CY + 6}
                textAnchor="middle"
                fontSize={16}
                fontWeight="700"
                fill={colors.text}
              >
                {fm(selected.value)}
              </SvgText>
              <SvgText
                x={CX}
                y={CY + 22}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill={selected.color}
              >
                {selected.percentage.toFixed(1)}%
              </SvgText>
            </G>
          ) : (
            <G>
              <SvgText
                x={CX}
                y={CY - 3}
                textAnchor="middle"
                fontSize={15}
                fontWeight="700"
                fill={colors.text}
              >
                {fm(total)}
              </SvgText>
              <SvgText
                x={CX}
                y={CY + 12}
                textAnchor="middle"
                fontSize={10}
                fontWeight="500"
                fill={colors.muted}
              >
                {totalLabel}
              </SvgText>
            </G>
          )}
          {labelPlacements.map((p) => {
            const tickInner = pt(CX, CY, OR + 2, p.arc.mid);
            const lineEndX = p.isLeft ? LABEL_MARGIN : SVG_W - LABEL_MARGIN;
            return (
              <G key={`lbl-${p.arc.slice.key}`}>
                <Line
                  x1={tickInner.x}
                  y1={tickInner.y}
                  x2={p.tickOuter.x}
                  y2={p.tickOuter.y}
                  stroke={p.arc.slice.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.9}
                />
                <Line
                  x1={p.tickOuter.x}
                  y1={p.tickOuter.y}
                  x2={lineEndX}
                  y2={p.placedY}
                  stroke={p.arc.slice.color}
                  strokeWidth={1.5}
                  strokeOpacity={0.9}
                />
                <SvgText
                  x={lineEndX}
                  y={p.placedY - 4}
                  textAnchor={p.isLeft ? "end" : "start"}
                  fontSize={10.5}
                  fontWeight="600"
                  fill={p.arc.slice.color}
                >
                  {trimLabel(p.arc.slice.label, 14)}
                </SvgText>
                <SvgText
                  x={lineEndX}
                  y={p.placedY + 11}
                  textAnchor={p.isLeft ? "end" : "start"}
                  fontSize={13}
                  fontWeight="700"
                  fill={p.arc.slice.color}
                >
                  {`${p.arc.slice.percentage.toFixed(1)}%`}
                </SvgText>
              </G>
            );
          })}
        </Svg>
      </Pressable>

      <View style={{ width: "100%", gap: 2, paddingHorizontal: 8 }}>
        {arcs.map((a) => (
          <SliceRow
            key={a.slice.key}
            slice={a.slice}
            selected={a.slice.key === selectedKey}
            dimmed={hasSelection && a.slice.key !== selectedKey}
            color={a.slice.color}
            colors={colors}
            fm={fm}
            onPress={handleSelect}
          />
        ))}
      </View>
    </View>
  );
});
