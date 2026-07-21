import { type ReactNode } from "react";
import { Pressable, View, StyleSheet, type ViewStyle } from "react-native";
import { type Palette } from "@/theme/colors";
import { Text } from "./AppText";

const s = StyleSheet.create({
  sheetOverlay: { alignItems: "center", justifyContent: "center" },
  sheetCard: {
    borderRadius: 16,
    elevation: 12,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
  },
  pickerRow: {
    paddingVertical: 11,
    paddingHorizontal: 20,
    marginHorizontal: 12,
    marginVertical: 2,
    borderRadius: 10,
    alignItems: "center",
  },
  chipCell: { width: "33.33%", paddingVertical: 8, alignItems: "center" },
  chipInner: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 12 },
});

export function PickerSheet({
  children,
  onClose,
  colors,
  width,
  maxHeight,
  contentStyle,
}: {
  children: ReactNode;
  onClose: () => void;
  colors: Palette;
  width: ViewStyle["width"];
  maxHeight?: number;
  contentStyle?: ViewStyle;
}) {
  return (
    <View
      style={[
        StyleSheet.absoluteFill,
        s.sheetOverlay,
        { backgroundColor: colors.overlay },
      ]}
    >
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
      <View
        style={[
          s.sheetCard,
          { backgroundColor: colors.card, shadowColor: colors.shadow, width },
          maxHeight ? { maxHeight } : null,
          contentStyle,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

export function PickerRow({
  label,
  selected,
  colors,
  fontSize = 14,
  onPress,
}: {
  label: string;
  selected: boolean;
  colors: Palette;
  fontSize?: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        s.pickerRow,
        { backgroundColor: selected ? colors.primarySoft : "transparent" },
      ]}
    >
      <Text
        style={{
          color: selected ? colors.primary : colors.text,
          fontSize,
          fontWeight: selected ? "700" : "500",
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PickerChip({
  label,
  selected,
  disabled,
  colors,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled: boolean;
  colors: Palette;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={() => { if (!disabled) onPress(); }}
      disabled={disabled}
      style={s.chipCell}
    >
      <View
        style={[
          s.chipInner,
          {
            backgroundColor: selected ? colors.primary : "transparent",
            opacity: disabled ? 0.3 : 1,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={{
            color: disabled
              ? colors.disabled
              : selected
                ? colors.onPrimary
                : colors.text,
            fontSize: 13,
            fontWeight: selected ? "700" : "500",
          }}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}
