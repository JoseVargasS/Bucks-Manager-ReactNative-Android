import { memo, useEffect, useRef, useState } from "react";
import { Animated, Pressable, View } from "react-native";
import { type Palette } from "@/theme/colors";
import { type UiCopy } from "@/i18n";
import type { TransactionType } from "@/types";
import { Text } from "./AppText";

export const TypeSelector = memo(function TypeSelector({
  value, onSelect, colors, copy,
}: {
  value: TransactionType; onSelect: (t: TransactionType) => void;
  colors: Palette; copy: UiCopy;
}) {
  const category = value.startsWith("INGRESO") ? "INGRESO" : "GASTO";
  const frequency = value.includes("NO") ? "NO FRECUENTE" : "FRECUENTE";

  return (
    <View style={{ marginBottom: 18, gap: 10 }}>
      <SegmentRow
        options={[
          { key: "GASTO", label: copy.expensesLabel, activeColor: colors.expense },
          { key: "INGRESO", label: copy.income, activeColor: colors.income },
        ]}
        selected={category}
        onSelect={(key) => onSelect(`${key} ${frequency}` as TransactionType)}
        colors={colors}
      />
      <SegmentRow
        options={[
          { key: "FRECUENTE", label: copy.frequent, activeColor: category === "INGRESO" ? colors.income : colors.expense },
          { key: "NO FRECUENTE", label: copy.nonFrequent, activeColor: category === "INGRESO" ? colors.income : colors.warn },
        ]}
        selected={frequency}
        onSelect={(key) => onSelect(`${category} ${key}` as TransactionType)}
        colors={colors}
      />
    </View>
  );
});

const SegmentRow = memo(function SegmentRow({
  options, selected, onSelect, colors,
}: {
  options: { key: string; label: string; activeColor: string }[];
  selected: string;
  onSelect: (key: string) => void;
  colors: Palette;
}) {
  const [containerW, setContainerW] = useState(0);
  const selIndex = options.findIndex((o) => o.key === selected);
  const animIndex = useRef(new Animated.Value(selIndex)).current;

  useEffect(() => {
    Animated.timing(animIndex, { toValue: selIndex, duration: 200, useNativeDriver: true }).start();
  }, [selIndex, animIndex]);

  const segW = containerW > 0 ? (containerW - 6 - (options.length - 1) * 2) / options.length : 0;
  const outputRange = options.map((_, i) => 3 + i * (segW + 2));

  return (
    <View
      onLayout={(e) => setContainerW(e.nativeEvent.layout.width)}
      style={{ flexDirection: "row", backgroundColor: colors.input, borderRadius: 10, padding: 3, gap: 2 }}
    >
      {segW > 0 && (
        <Animated.View
          style={{
            position: "absolute", top: 3, bottom: 3, width: segW,
            backgroundColor: colors.card, borderRadius: 8,
            shadowColor: colors.shadow, shadowOffset: { width: 0, height: 1 },
            shadowOpacity: 0.06, shadowRadius: 2, elevation: 1,
            transform: [{ translateX: animIndex.interpolate({ inputRange: options.map((_, i) => i), outputRange }) }],
          }}
        />
      )}
      {options.map((opt) => {
        const active = selected === opt.key;
        return (
          <Pressable
            key={opt.key}
            onPress={() => onSelect(opt.key)}
            style={{ flex: 1, paddingVertical: 7, paddingHorizontal: 4, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
          >
            <Text
              numberOfLines={1}
              style={{ fontSize: 13, fontWeight: active ? "700" : "500", color: active ? opt.activeColor : colors.muted }}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
});
