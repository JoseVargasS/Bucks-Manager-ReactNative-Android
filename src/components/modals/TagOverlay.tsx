import { ScrollView, Pressable, StyleSheet, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type Palette } from "@/theme/colors";
import { type Tag } from "@/types";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";
import { base } from "@/styles/baseStyles";
import { Text } from "@/components/ui/AppText";
import { RADIUS } from "@/theme/radii";

const styles = { ...base, ...recordModalStyles };
const tagOptionStyles = StyleSheet.create({
  selectOptionRow: {
    minHeight: 36,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  selectOptionLabel: { flex: 1, minWidth: 0, fontSize: 14, fontWeight: "600" },
});

export function TagOverlay({
  availableTags,
  onToggleTag,
  onCreateTagClick,
  colors,
  copy,
  frame,
}: {
  availableTags: Tag[];
  onToggleTag: (tagId: string) => void;
  onCreateTagClick: () => void;
  colors: Palette;
  copy: Record<string, string>;
  frame: { left: number; top: number; width: number; maxHeight: number };
}) {
  return (
    <View
      style={[
        styles.tagsOverlay,
        {
          left: frame.left,
          top: frame.top,
          width: frame.width,
          maxHeight: frame.maxHeight,
          backgroundColor: colors.card,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: RADIUS.md,
          overflow: "hidden",
        },
      ]}
    >
      <ScrollView
        contentContainerStyle={{ padding: 8 }}
        keyboardShouldPersistTaps="always"
        showsVerticalScrollIndicator={false}
      >
        {availableTags.length > 0 && (
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
            {availableTags.map((tag) => (
              <Pressable
                key={tag.id}
                style={[tagOptionStyles.selectOptionRow, { width: "48%", backgroundColor: colors.input }]}
                onPress={() => onToggleTag(tag.id)}
              >
                <View style={{ width: 10, height: 10, borderRadius: RADIUS.pill, backgroundColor: tag.color }} />
                <Text numberOfLines={1} style={[tagOptionStyles.selectOptionLabel, { color: colors.text }]}>
                  {tag.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
        <View style={{ borderTopWidth: availableTags.length > 0 ? 0.5 : 0, borderColor: colors.border, paddingTop: 8 }}>
          <Pressable
            style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}
            onPress={onCreateTagClick}
          >
            <MaterialCommunityIcons name="tag-plus-outline" size={16} color={colors.primary} />
            <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
              {copy.createTag || "Crear etiqueta"}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}
