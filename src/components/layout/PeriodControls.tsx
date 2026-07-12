import { memo } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Select } from "@/components/ui/Select";
import { type Palette } from "@/theme/colors";
import { type UiCopy, UI_MONTH_NAMES } from "@/i18n";

export const PeriodControls = memo(function PeriodControls({
  colors,
  theme,
  copy,
  year,
  month,
  availableYears,
  availableMonths,
  onSelectPeriod,
  goToday,
  goPrevMonth,
  goNextMonth,
}: {
  colors: Palette;
  theme: "dark" | "light";
  copy: UiCopy;
  year: number;
  month: number;
  availableYears: number[];
  availableMonths: number[];
  onSelectPeriod: (month: number, year: number) => void;
  goToday: () => void;
  goPrevMonth: () => void;
  goNextMonth: () => void;
}) {
  const monthNames =
    copy.languageCode === "en" ? UI_MONTH_NAMES.en : UI_MONTH_NAMES.es;

  const blurTint = theme === "dark" ? "dark" : "light";

  return (
    <View style={styles.periodControls}>
      <View style={styles.periodActions}>
        <BlurView
          intensity={110}
          tint={blurTint}
          style={[styles.periodDropdownGroup, styles.blurContainer]}
        >
          <Select
            value={String(year)}
            options={availableYears.map((item) => ({
              label: String(item),
              value: String(item),
            }))}
            onSelect={(v: string) => onSelectPeriod(month, Number(v))}
            colors={colors}
            title={copy.selectYear}
            style={styles.periodDropdown}
            hideArrow
            buttonStyle={{
              backgroundColor: "transparent",
              borderColor: "transparent",
            }}
          />
          <Select
            value={String(month)}
            options={availableMonths.map((index) => ({
              label: monthNames[index],
              value: String(index),
            }))}
            onSelect={(v: string) => onSelectPeriod(Number(v), year)}
            colors={colors}
            title={copy.selectMonth}
            style={styles.periodDropdown}
            hideArrow
            buttonStyle={{
              backgroundColor: "transparent",
              borderColor: "transparent",
            }}
          />
        </BlurView>
        <BlurView
          intensity={110}
          tint={blurTint}
          style={[styles.periodNavGroup, styles.blurContainer]}
        >
          <TouchableOpacity onPress={goPrevMonth} style={styles.periodNavBtn}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={colors.info}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={goToday} style={styles.periodNavBtn}>
            <MaterialCommunityIcons
              name="calendar-today"
              size={18}
              color={colors.info}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={goNextMonth} style={styles.periodNavBtn}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.info}
            />
          </TouchableOpacity>
        </BlurView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  periodControls: {
    paddingHorizontal: 14,
    paddingTop: 2,
    paddingBottom: 0,
    gap: 8,
  },
  periodActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  blurContainer: { overflow: "hidden" },
  periodDropdownGroup: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    height: 46,
  },
  periodDropdown: { flex: 1, minWidth: 0 },
  periodNavGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 50,
    padding: 4,
    gap: 4,
  },
  periodNavBtn: {
    width: 40,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
  },
});
