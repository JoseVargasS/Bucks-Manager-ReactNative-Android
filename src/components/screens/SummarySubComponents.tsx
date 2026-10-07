import { memo } from "react";
import { Animated, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type Palette } from "@/theme/colors";
import { type MaterialIconName } from "@/types";
import { Text } from "@/components/ui/AppText";
import { useValueFade } from "@/components/ui/valueFade";
import { RADIUS } from "@/theme/radii";

export const Insight = memo(function Insight({ label, value, icon, color, colors }: { label: string; value: string; icon: MaterialIconName; color: string; colors: Palette }) {
  const valueStyle = useValueFade(value);
  return (
    <View style={{ flex: 1, minWidth: 0, backgroundColor: colors.input, borderRadius: RADIUS.lg, padding: 12 }}>
      <MaterialCommunityIcons name={icon} size={18} color={color} />
      <Text numberOfLines={1} style={{ color: colors.muted, fontSize: 11, fontWeight: "600", textTransform: "uppercase", marginTop: 8 }}>{label}</Text>
      <Animated.View style={valueStyle}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "700", marginTop: 3, fontVariant: ["tabular-nums"] }}>{value}</Text>
      </Animated.View>
    </View>
  );
});

export const Legend = memo(function Legend({ color, label, colors }: { color: string; label: string; colors: Palette }) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
      <View style={{ width: 8, height: 8, borderRadius: 3, backgroundColor: color }} />
      <Text style={{ color: colors.muted, fontSize: 11, fontWeight: "600" }}>{label}</Text>
    </View>
  );
});

export const CompositionContent = memo(function CompositionContent({ items, total, colors, format }: {
  items: { label: string; value: number; color: string }[];
  total: number;
  colors: Palette;
  format: (value: number) => string;
}) {
  const safeTotal = total || 1;
  return (
    <>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <Text numberOfLines={1} style={{ color: colors.text, fontSize: 15, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{format(total)}</Text>
      </View>
      <View style={{ height: 9, borderRadius: RADIUS.pill, overflow: "hidden", backgroundColor: colors.input, flexDirection: "row" }}>
        {items.map((item) => item.value > 0 && <View key={item.label} style={{ flex: item.value / safeTotal, backgroundColor: item.color }} />)}
      </View>
      <View style={{ gap: 8 }}>
        {items.map((item) => (
          <View key={item.label} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <View style={{ width: 9, height: 9, borderRadius: 3, backgroundColor: item.color }} />
            <Text numberOfLines={1} style={{ flex: 1, color: colors.muted, fontSize: 13, fontWeight: "500" }}>{item.label}</Text>
            <Text style={{ color: item.color, fontSize: 13, fontWeight: "700", fontVariant: ["tabular-nums"] }}>{format(item.value)}</Text>
          </View>
        ))}
      </View>
    </>
  );
});
