import { Text, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";

export function DetailMeta({ icon, label, value, tone, colors }: { icon: string; label: string; value: string; tone: string; colors: Palette }) {
  return (
    <View style={styles.detailMetaItem}>
      <MaterialCommunityIcons name={icon as any} size={18} color={tone} />
      <View style={styles.detailMetaText}>
        <Text style={[styles.detailMetaLabel, { color: colors.muted }]}>{label}</Text>
        <Text numberOfLines={1} selectable style={[styles.detailMetaValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}
