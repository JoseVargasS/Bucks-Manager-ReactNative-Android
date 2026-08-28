import { memo } from "react";
import { Pressable, View } from "react-native";
import { Text } from "./AppText";
import { base as styles } from "@/styles/baseStyles";
import { type Palette } from "@/theme/colors";

export const ActionRow = memo(function ActionRow({ colors, onCancel, onSubmit, submitLabel, cancelLabel }: { colors: Palette; onCancel: () => void; onSubmit: () => void; submitLabel: string; cancelLabel: string }) {
  return (
    <View style={styles.modalActions}>
      <Pressable testID="cancel-button" accessibilityLabel={cancelLabel} accessibilityRole="button" style={({ pressed }) => [styles.cancelBtn, { backgroundColor: pressed ? colors.surfacePressed : colors.input, borderColor: pressed ? colors.focusRing : "transparent", borderWidth: 1 }]} onPress={onCancel}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>{cancelLabel}</Text>
      </Pressable>
      <Pressable testID="submit-button" accessibilityLabel={submitLabel} accessibilityRole="button" style={({ pressed }) => [styles.saveBtn, { backgroundColor: pressed ? colors.primaryPressed : colors.primary }]} onPress={onSubmit}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>{submitLabel}</Text>
      </Pressable>
    </View>
  );
});

