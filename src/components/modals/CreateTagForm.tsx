import { Pressable, View } from "react-native";
import { type Palette } from "@/theme/colors";
import { ColorPicker } from "@/components/ui/ColorPicker";
import { Text, TextInput } from "@/components/ui/AppText";

export function CreateTagForm({
  createTagLabel,
  setCreateTagLabel,
  createTagColor,
  setCreateTagColor,
  onCreate,
  onCancel,
  colors,
  copy,
}: {
  createTagLabel: string;
  setCreateTagLabel: (v: string) => void;
  createTagColor: string;
  setCreateTagColor: (v: string) => void;
  onCreate: () => void;
  onCancel: () => void;
  colors: Palette;
  copy: Record<string, string>;
}) {
  return (
    <View style={{ backgroundColor: colors.input, borderRadius: 12, padding: 12, gap: 10, marginTop: 4 }}>
      <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary, textTransform: "uppercase" }}>
        {copy.createTag}
      </Text>
      <TextInput
        value={createTagLabel}
        onChangeText={setCreateTagLabel}
        placeholder={copy.tagsNewPlaceholder || "Nombre de etiqueta"}
        placeholderTextColor={colors.muted}
        keyboardType="default"
        style={{
          borderRadius: 8,
          paddingHorizontal: 10,
          minHeight: 38,
          fontWeight: "600",
          backgroundColor: colors.card,
          color: colors.text,
        }}
        onSubmitEditing={onCreate}
        autoFocus
      />
      <ColorPicker color={createTagColor} onChange={setCreateTagColor} compact />
      <View style={{ flexDirection: "row", gap: 8 }}>
        <Pressable
          style={{
            flex: 1,
            borderRadius: 8,
            paddingVertical: 9,
            alignItems: "center",
            backgroundColor: colors.border,
          }}
          onPress={onCancel}
        >
          <Text style={{ fontSize: 13, fontWeight: "600", color: colors.muted }}>{copy.cancel}</Text>
        </Pressable>
        <Pressable
          style={{
            flex: 1,
            borderRadius: 8,
            paddingVertical: 9,
            alignItems: "center",
            backgroundColor: colors.primary,
          }}
          onPress={onCreate}
        >
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.onPrimary }}>{copy.add}</Text>
        </Pressable>
      </View>
    </View>
  );
}
