import { memo, useCallback, useEffect, useMemo, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import Svg, { G, Line, Path, Text as SvgText } from "react-native-svg";

import { type PieSlice } from "@/domain/bucksLogic";
import { type Palette } from "@/theme/colors";
import { useChartFade } from "./chartFade";
import { usePieForm } from "@/hooks/usePieForm";
import { PIE_GEOMETRY, arc, pt, trimLabel } from "@/utils/pieGeometry";
import { usePieSweep } from "@/hooks/usePieSweep";
import { PieSliceRow } from "./PieSliceRow";
import { usePieGeometry } from "@/hooks/usePieGeometry";

const AnimPath = Animated.createAnimatedComponent(Path);

export type MergedSlice = PieSlice & { key: string };

export const PieChart = memo(function PieChart({
  data,
  colors,
  currencySymbol,
  formatValue,
  totalLabel = "total",
  chartOnly,
  selectedKey: externalSelectedKey,
  onSelectKey,
}: {
  data: PieSlice[];
  colors: Palette;
  currencySymbol: string;
  formatValue?: (v: number) => string;
  totalLabel?: string;
  chartOnly?: boolean;
  selectedKey?: string | null;
  onSelectKey?: (key: string | null) => void;
}) {
  const fm = useMemo(
    () => formatValue || ((v: number) => `${currencySymbol}${v.toFixed(0)}`),
    [formatValue, currencySymbol],
  );

  const total = useMemo(() => data.reduce((s, d) => s + d.value, 0), [data]);
  const { merged, arcs, labelPlacements } = usePieGeometry(data);

  const [internalSelectedKey, setInternalSelectedKey] = useState<string | null>(null);
  const isControlled = externalSelectedKey !== undefined;
  const selectedKey = isControlled ? externalSelectedKey : internalSelectedKey;

  const selectedIndex = useMemo(
    () =>
      selectedKey === null
        ? -1
        : merged.findIndex((s) => s.key === selectedKey),
    [selectedKey, merged],
  );

  const handleSelect = useCallback((key: string) => {
    if (isControlled) {
      onSelectKey?.(selectedKey === key ? null : key);
    } else {
      setInternalSelectedKey((prev) => (prev === key ? null : key));
    }
  }, [isControlled, selectedKey, onSelectKey]);

  const clearSelection = useCallback(() => {
    if (isControlled) {
      onSelectKey?.(null);
    } else {
      setInternalSelectedKey(null);
    }
  }, [isControlled, onSelectKey]);

  useEffect(() => {
    if (selectedKey === null) return;
    if (selectedIndex === -1) {
      if (isControlled) {
        onSelectKey?.(null);
      } else {
        setInternalSelectedKey(null);
      }
    }
  }, [selectedKey, selectedIndex, isControlled, onSelectKey]);

  const opacitiesRef = useChartFade(merged.length, selectedIndex, data);
  const opacities = opacitiesRef.current;

  usePieSweep(opacities, selectedKey);

  const { progress, formed } = usePieForm(
    // Content signature, not the array identity: background reloads rebuild
    // the arrays with identical content and must not replay the formation.
    useMemo(() => data.map((d) => `${d.label}:${d.value}`).join("|"), [data]),
  );
  const formedArcs = useMemo(
    () => arcs.map((a) => ({ ...a, a0: a.a0 * progress, a1: a.a1 * progress })),
    [arcs, progress],
  );

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
          height={PIE_GEOMETRY.svgHeight}
          viewBox={`0 0 ${PIE_GEOMETRY.svgWidth} ${PIE_GEOMETRY.svgHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          {formedArcs.map((a, i) => {
            const isSelected = a.slice.key === selectedKey;
            const r = isSelected
              ? PIE_GEOMETRY.outerRadius + PIE_GEOMETRY.selectedGrow
              : PIE_GEOMETRY.outerRadius;
            return (
              <AnimPath
                key={a.slice.key}
                d={arc(
                  PIE_GEOMETRY.cx,
                  PIE_GEOMETRY.cy,
                  r,
                  PIE_GEOMETRY.innerRadius,
                  a.a0,
                  a.a1,
                )}
                fill={a.slice.color}
                opacity={opacities[i]}
                onPress={() => handleSelect(a.slice.key)}
              />
            );
          })}
          {formed && (hasSelection && selected ? (
            <G>
              <SvgText
                x={PIE_GEOMETRY.cx}
                y={PIE_GEOMETRY.cy - 12}
                textAnchor="middle"
                fontSize={11}
                fontWeight="600"
                fill={colors.muted}
                letterSpacing={0.4}
              >
                {trimLabel(selected.label.toUpperCase(), 14)}
              </SvgText>
              <SvgText
                x={PIE_GEOMETRY.cx}
                y={PIE_GEOMETRY.cy + 6}
                textAnchor="middle"
                fontSize={16}
                fontWeight="700"
                fill={colors.text}
              >
                {fm(selected.value)}
              </SvgText>
              <SvgText
                x={PIE_GEOMETRY.cx}
                y={PIE_GEOMETRY.cy + 22}
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
                x={PIE_GEOMETRY.cx}
                y={PIE_GEOMETRY.cy - 3}
                textAnchor="middle"
                fontSize={15}
                fontWeight="700"
                fill={colors.text}
              >
                {fm(total)}
              </SvgText>
              <SvgText
                x={PIE_GEOMETRY.cx}
                y={PIE_GEOMETRY.cy + 12}
                textAnchor="middle"
                fontSize={10}
                fontWeight="500"
                fill={colors.muted}
              >
                {totalLabel}
              </SvgText>
            </G>
          ))}
          {formed && labelPlacements.map((p) => {
            const tickInner = pt(
              PIE_GEOMETRY.cx,
              PIE_GEOMETRY.cy,
              PIE_GEOMETRY.outerRadius + 2,
              p.arc.mid,
            );
            const lineEndX = p.isLeft
              ? PIE_GEOMETRY.labelMargin
              : PIE_GEOMETRY.svgWidth - PIE_GEOMETRY.labelMargin;
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

      {!chartOnly && (
        <View style={{ width: "100%", gap: 2, paddingHorizontal: 8 }}>
          {arcs.map((a) => (
            <PieSliceRow
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
      )}
    </View>
  );
});
