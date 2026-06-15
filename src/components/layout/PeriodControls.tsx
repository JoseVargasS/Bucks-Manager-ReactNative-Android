import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MONTH_NAMES } from "../../domain/bucksLogic";
import { styles } from "../../styles/globalStyles";
import { Select } from "../ui/Select";
import { Palette } from "../../theme/colors";

export function PeriodControls({ colors, year, month, availableYears, onSelectPeriod, goToday }: { colors: Palette; year: number; month: number; availableYears: number[]; onSelectPeriod: (month: number, year: number) => void; goToday: () => void }) {
  return (
    <View style={styles.periodControls}>
      <View style={styles.periodTitleBlock}>
        <Text style={[styles.periodEyebrow, { color: colors.muted }]}>PERIODO</Text>
        <Text numberOfLines={1} style={[styles.periodTitle, { color: colors.text }]}>{`${MONTH_NAMES[month]} ${year}`}</Text>
      </View>
      <View style={styles.periodActions}>
        <Select
          value={String(year)}
          options={availableYears.map((item) => ({ label: String(item), value: String(item) }))}
          onSelect={(v: string) => onSelectPeriod(month, Number(v))}
          colors={colors}
          style={{ flex: 0, minWidth: 100 }}
        />
        <Select
          value={String(month)}
          options={MONTH_NAMES.map((name, index) => ({ label: name, value: String(index) }))}
          onSelect={(v: string) => onSelectPeriod(Number(v), year)}
          colors={colors}
          style={{ flex: 1 }}
        />
        <TouchableOpacity onPress={goToday} style={[styles.periodToday, { backgroundColor: colors.infoSoft, borderColor: colors.blue }]}>
          <MaterialCommunityIcons name="calendar-today" size={18} color={colors.blue} />
        </TouchableOpacity>
      </View>
    </View>
  );
}
