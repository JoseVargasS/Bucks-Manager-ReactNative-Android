import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { SettingsRow } from "../ui/SettingsRow";
import { Palette } from "../../theme/colors";

export function SettingsView({ colors, theme, setTheme, accountInfo, onRescan, onSwitch, onDisconnect, onOpenExport }: {
  colors: Palette; theme: "dark" | "light"; setTheme: (t: "dark" | "light") => void;
  accountInfo: { name?: string; email?: string } | null;
  onRescan: () => void; onSwitch: () => void; onDisconnect: () => void; onOpenExport: () => void;
}) {
  const initial = (accountInfo?.email || accountInfo?.name || "B").slice(0, 1).toUpperCase();
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.pageScroll, styles.pageScrollMobile]}>
      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>CUENTA</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.settingsRow, { borderColor: colors.border }]} onPress={onSwitch}>
            <View style={[styles.settingsAvatar, { backgroundColor: colors.primarySoft, borderColor: colors.primary }]}>
              <Text style={[styles.accountInitial, { color: colors.primary }]}>{initial}</Text>
            </View>
            <View style={styles.settingsRowText}>
              <Text numberOfLines={1} style={[styles.accountHeroName, { color: colors.text }]}>{accountInfo?.name || "Cuenta conectada"}</Text>
              <Text numberOfLines={1} style={[styles.accountHeroEmail, { color: colors.muted }]}>{accountInfo?.email || "Google"}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={colors.muted} />
          </TouchableOpacity>
          <SettingsRow colors={colors} icon="google-drive" label="Buscar hoja en Drive" onPress={onRescan} />
          <SettingsRow colors={colors} icon="account-switch" label="Cambiar o agregar cuenta" onPress={onSwitch} last />
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>TEMA</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <TouchableOpacity style={[styles.settingsRow, { borderColor: colors.border }]} onPress={() => setTheme(theme === "dark" ? "light" : "dark")}>
            <MaterialCommunityIcons name={theme === "dark" ? "weather-night" : "white-balance-sunny"} size={22} color={colors.yellow} />
            <Text style={[styles.settingsRowLabel, { color: colors.text }]}>Modo oscuro</Text>
            <View style={[styles.themeToggle, { backgroundColor: theme === "dark" ? colors.primary : colors.switchTrack }]}>
              <View style={[styles.themeThumb, theme === "dark" ? { marginLeft: 23 } : { marginLeft: 0 }]} />
            </View>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.settingsSection}>
        <Text style={[styles.settingsLabel, { color: colors.muted }]}>EXPORTAR</Text>
        <View style={[styles.settingsGroup, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <SettingsRow colors={colors} icon="file-export" label="Exportar movimientos" onPress={onOpenExport} last />
        </View>
      </View>

      <TouchableOpacity style={styles.signOutBtn} onPress={onDisconnect}>
        <Text style={[styles.signOutText, { color: colors.red }]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
