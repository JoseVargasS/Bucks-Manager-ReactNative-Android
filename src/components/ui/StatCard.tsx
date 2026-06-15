import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";

export function StatCard({ title, value, icon, tone, colors, action }: { title: string; value: string; icon: string; tone: "income" | "expense" | "warn" | "balance"; colors: Palette; action?: () => void }) {
  const color = tone === "income" ? colors.green : tone === "warn" ? colors.yellow : tone === "balance" ? colors.blue : colors.red;
  return (
    <View style={[styles.statCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={[styles.statIcon, { backgroundColor: `${color}22` }]}>
        <MaterialCommunityIcons name={icon as any} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text numberOfLines={1} style={[styles.statLabel, { color: colors.muted }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.statValue, { color }]}>{value}</Text>
      </View>
      {action && (
        <TouchableOpacity style={styles.editStat} onPress={action}>
          <MaterialCommunityIcons name="pencil" size={16} color={colors.blue} />
        </TouchableOpacity>
      )}
    </View>
  );
}
