import { Text, TouchableOpacity } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";
import { MaterialIconName } from "../../types";

export function SettingsRow({ colors, icon, label, onPress, last = false }: { colors: Palette; icon: MaterialIconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <TouchableOpacity style={[styles.settingsRow, !last && { borderBottomWidth: 0.5, borderColor: colors.border }]} onPress={onPress}>
      <MaterialCommunityIcons name={icon} size={22} color={colors.blue} />
      <Text style={[styles.settingsRowLabel, { color: colors.text }]}>{label}</Text>
      <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
    </TouchableOpacity>
  );
}
