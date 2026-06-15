import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";
import { MaterialIconName } from "../../types";

export function Kpi({ title, value, icon, color, colors }: { title: string; value: string; icon: MaterialIconName; color: string; colors: Palette }) {
  return (
    <View style={[styles.kpi, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <MaterialCommunityIcons name={icon} size={24} color={color} />
      <Text style={[styles.statLabel, { color: colors.muted }]}>{title}</Text>
      <Text style={[styles.kpiValue, { color }]}>{value}</Text>
    </View>
  );
}
