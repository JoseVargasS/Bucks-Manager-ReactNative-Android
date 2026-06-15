import { Text, TextInput, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";
import { MaterialIconName } from "../../types";

export function Field({ label, value, onChangeText, colors, placeholder = "", rightIcon }: { label: string; value: string; onChangeText: (v: string) => void; colors: Palette; placeholder?: string; rightIcon?: MaterialIconName }) {
  return (
    <View style={{ flex: 1, marginBottom: 12 }}>
      <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
      <View style={{ position: "relative" }}>
        <TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted} style={[styles.input, rightIcon && { paddingRight: 46 }, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]} />
        {rightIcon && <MaterialCommunityIcons name={rightIcon} size={22} color={colors.text} style={styles.inputIcon} />}
      </View>
    </View>
  );
}
