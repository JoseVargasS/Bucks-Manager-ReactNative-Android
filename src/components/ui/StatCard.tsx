import { memo } from "react";
import { Pressable, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { statCardStyles as styles } from "@/components/ui/StatCard.styles";
import { type Palette } from "@/theme/colors";
import { type MaterialIconName } from "@/types";
import { Text } from "./AppText";

export const StatCard = memo(function StatCard({ title, value, icon, tone, colors, action, onPress }: { title: string; value: string; icon: MaterialIconName; tone: "income" | "expense" | "warn" | "balance"; colors: Palette; action?: () => void; onPress?: () => void }) {
  const color = tone === "income" ? colors.income : tone === "warn" ? colors.warn : tone === "balance" ? colors.info : colors.expense;
  const softBg = tone === "income" ? colors.incomeSoft : tone === "warn" ? colors.warnSoft : tone === "balance" ? colors.infoSoft : colors.expenseSoft;
  return (
    <Pressable onPress={onPress} style={[styles.statCard, { backgroundColor: colors.card }]}>
      <View style={[styles.statIcon, { backgroundColor: softBg }]}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
      </View>
      <View style={styles.statContent}>
        <Text numberOfLines={1} style={[styles.statLabel, { color: colors.muted }]}>{title}</Text>
        <Text numberOfLines={1} style={[styles.statValue, { color, fontVariant: ["tabular-nums"] }]}>{value}</Text>
      </View>
      {action && (
        <Pressable style={styles.editStat} onPress={action}>
          <MaterialCommunityIcons name="pencil" size={15} color={colors.muted} />
        </Pressable>
      )}
    </Pressable>
  );
});
