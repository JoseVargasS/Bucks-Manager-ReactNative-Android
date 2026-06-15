import { useState } from "react";
import { Text, TouchableOpacity, View, ScrollView, StyleSheet, ViewStyle } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { Palette } from "../../theme/colors";

type SelectOption = { label: string; value: string };

export function Select({ value, options, onSelect, colors, placeholder, style }: { value: string; options: SelectOption[]; onSelect: (v: string) => void; colors: Palette; placeholder?: string; style?: ViewStyle }) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View style={[{ position: "relative" }, style]}>
      <TouchableOpacity
        style={[{ backgroundColor: colors.input, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, borderWidth: 1 }]}
        onPress={() => setOpen(!open)}
      >
        <Text numberOfLines={1} style={[{ color: selected ? colors.text : colors.muted, fontWeight: "900", flex: 1 }]}>{selected ? selected.label : placeholder}</Text>
        <MaterialCommunityIcons name={open ? "chevron-up" : "chevron-down"} size={18} color={colors.muted} />
      </TouchableOpacity>
      {open && (
        <>
          <TouchableOpacity style={[StyleSheet.absoluteFill, { zIndex: 998 }]} activeOpacity={1} onPress={() => setOpen(false)} />
          <View style={[{ position: "absolute", top: 46, left: 0, right: 0, maxHeight: 200, backgroundColor: colors.card, borderColor: colors.border, borderRadius: 10, borderWidth: 1, zIndex: 999, overflow: "hidden", elevation: 999 }]}>
            <ScrollView nestedScrollEnabled style={{ maxHeight: 200 }} showsVerticalScrollIndicator={false}>
              {options.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[{ paddingHorizontal: 12, paddingVertical: 11, borderBottomWidth: 1, borderColor: colors.border, backgroundColor: isSelected ? colors.primarySoft : "transparent" }]}
                    onPress={() => { onSelect(opt.value); setOpen(false); }}
                  >
                    <Text style={[{ color: isSelected ? colors.primary : colors.text, fontWeight: "900" }]}>{opt.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </>
      )}
    </View>
  );
}
