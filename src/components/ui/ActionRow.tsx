import { memo } from "react";
import { TouchableOpacity, View } from "react-native";
import { Text } from "./AppText";
import { styles } from "../../styles/globalStyles";
import { type Palette } from "../../theme/colors";

export const ActionRow = memo(function ActionRow({ colors, onCancel, onSubmit, submitLabel, cancelLabel }: { colors: Palette; onCancel: () => void; onSubmit: () => void; submitLabel: string; cancelLabel: string }) {
  return (
    <View style={styles.modalActions}>
      <TouchableOpacity testID="cancel-button" accessibilityLabel={cancelLabel} accessibilityRole="button" style={[styles.cancelBtn, { backgroundColor: colors.input }]} onPress={onCancel}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>{cancelLabel}</Text>
      </TouchableOpacity>
      <TouchableOpacity testID="submit-button" accessibilityLabel={submitLabel} accessibilityRole="button" style={[styles.saveBtn, { backgroundColor: colors.primary }]} onPress={onSubmit}>
        <Text style={[styles.saveText, { color: colors.onPrimary }]}>{submitLabel}</Text>
      </TouchableOpacity>
    </View>
  );
});

