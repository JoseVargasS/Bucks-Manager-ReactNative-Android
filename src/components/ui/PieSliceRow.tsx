import { memo, useCallback } from "react";
import { Pressable, View } from "react-native";
import type { Palette } from "@/theme/colors";
import { Text } from "./AppText";
import type { MergedSlice } from "./PieChart";

export const PieSliceRow = memo(function PieSliceRow({
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
