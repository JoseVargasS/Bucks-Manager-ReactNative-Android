import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";
import { MaterialIconName } from "../../types";

type Tab = "expenses" | "search" | "summary" | "settings";

export function BottomNav({ colors, tab, setTab, onAdd }: { colors: Palette; tab: Tab; setTab: (tab: Tab) => void; onAdd: () => void }) {
  return (
    <View style={[styles.bottomNav, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <BottomNavItem colors={colors} active={tab === "expenses"} icon="view-dashboard-outline" label="Gastos" onPress={() => setTab("expenses")} />
      <BottomNavItem colors={colors} active={tab === "search"} icon="magnify" label="Buscar" onPress={() => setTab("search")} />
      <TouchableOpacity onPress={onAdd} style={[styles.bottomAddButton, { backgroundColor: colors.primary }]}>
        <MaterialCommunityIcons name="plus" size={31} color={colors.onPrimary} />
      </TouchableOpacity>
      <BottomNavItem colors={colors} active={tab === "summary"} icon="chart-line" label="Análisis" onPress={() => setTab("summary")} />
      <BottomNavItem colors={colors} active={tab === "settings"} icon="cog-outline" label="Ajustes" onPress={() => setTab("settings")} />
    </View>
  );
}

function BottomNavItem({ colors, active, icon, label, onPress }: { colors: Palette; active: boolean; icon: MaterialIconName; label: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.bottomNavItem, active && { backgroundColor: colors.primarySoft }]}>
      <MaterialCommunityIcons name={icon} size={21} color={active ? colors.primary : colors.muted} />
      <Text numberOfLines={1} style={[styles.bottomNavLabel, { color: active ? colors.primary : colors.muted }]}>{label}</Text>
    </TouchableOpacity>
  );
}
