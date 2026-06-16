import { Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import Svg, { Defs, LinearGradient, Mask, Rect, Stop } from "react-native-svg";
import { MONTH_NAMES } from "../../domain/bucksLogic";
import { styles } from "../../styles/globalStyles";
import { Select } from "../ui/Select";
import { Palette } from "../../theme/colors";

export function PeriodControls({ colors, year, month, availableYears, availableMonths, onSelectPeriod, goToday }: {
  colors: Palette; year: number; month: number; availableYears: number[]; availableMonths: number[];
  onSelectPeriod: (month: number, year: number) => void; goToday: () => void;
}) {
  return (
    <View style={styles.periodControls}>
      <View style={styles.periodTitleBlock}>
        <PeriodTitleFade color={colors.bg} />
        <Text style={[styles.periodEyebrow, styles.headerReadableText, { color: colors.muted, textShadowColor: colors.shadow }]}>PERIODO</Text>
        <Text numberOfLines={1} style={[styles.periodTitle, styles.headerReadableText, { color: colors.text, textShadowColor: colors.shadow }]}>{`${MONTH_NAMES[month]} ${year}`}</Text>
      </View>
      <View style={styles.periodActions}>
        <Select
          value={String(year)}
          options={availableYears.map((item) => ({ label: String(item), value: String(item) }))}
          onSelect={(v: string) => onSelectPeriod(month, Number(v))}
          colors={colors}
          title="Seleccionar año"
          style={{ flex: 0, minWidth: 100 }}
        />
        <Select
          value={String(month)}
          options={availableMonths.map((index) => ({ label: MONTH_NAMES[index], value: String(index) }))}
          onSelect={(v: string) => onSelectPeriod(Number(v), year)}
          colors={colors}
          title="Seleccionar mes"
          style={{ flex: 1 }}
        />
        <TouchableOpacity onPress={goToday} style={[styles.periodToday, { backgroundColor: colors.infoSoft }]}>
          <MaterialCommunityIcons name="calendar-today" size={18} color={colors.blue} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

function PeriodTitleFade({ color }: { color: string }) {
  return (
    <Svg pointerEvents="none" width={154} height={66} style={styles.periodTitleFade}>
      <Defs>
        <LinearGradient id="periodFadeHorizontal" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={color} stopOpacity="0.78" />
          <Stop offset="0.58" stopColor={color} stopOpacity="0.68" />
          <Stop offset="1" stopColor={color} stopOpacity="0" />
        </LinearGradient>
        <LinearGradient id="periodFadeVertical" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <Stop offset="0.22" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="0.74" stopColor="#ffffff" stopOpacity="1" />
          <Stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </LinearGradient>
        <Mask id="periodFadeMask">
          <Rect x="0" y="0" width="100%" height="100%" fill="url(#periodFadeVertical)" />
        </Mask>
      </Defs>
      <Rect x="0" y="0" width="100%" height="100%" fill="url(#periodFadeHorizontal)" mask="url(#periodFadeMask)" />
    </Svg>
  );
}
