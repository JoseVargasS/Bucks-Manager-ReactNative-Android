import { memo } from "react";
import { StyleSheet, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { Select } from "@/components/ui/Select";
import { type Palette } from "@/theme/colors";
import { type UiCopy, UI_MONTH_NAMES } from "@/i18n";
import { NAV_BTN_SIZE, NAV_BTN_HEIGHT, NAV_BTN_RADIUS, NAV_GROUP_GAP, NAV_GROUP_PADDING, NAV_GROUP_RADIUS, SELECT_HEIGHT, BLUR_INTENSITY } from "@/theme/constants";
import { RADIUS } from "@/theme/radii";

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

  return (
    <View style={styles.periodControls}>
      <View style={styles.periodActions}>
        <View style={styles.selectsWrapper}>
          <BlurView
            intensity={BLUR_INTENSITY}
            tint={theme}
            style={styles.selectsBlurBg}
          />
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
              borderRadius: RADIUS.pill,
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
              borderRadius: RADIUS.pill,
            }}
          />
        </View>
        <BlurView
          intensity={BLUR_INTENSITY}
          tint={theme}
          style={[styles.periodNavGroup, styles.blurContainer]}
        >
          <Pressable onPress={goPrevMonth} style={styles.periodNavBtn}>
            <MaterialCommunityIcons
              name="chevron-left"
              size={20}
              color={colors.info}
            />
          </Pressable>
          <Pressable onPress={goToday} style={styles.periodNavBtn}>
            <MaterialCommunityIcons
              name="calendar-today"
              size={18}
              color={colors.info}
            />
          </Pressable>
          <Pressable onPress={goNextMonth} style={styles.periodNavBtn}>
            <MaterialCommunityIcons
              name="chevron-right"
              size={20}
              color={colors.info}
            />
          </Pressable>
        </BlurView>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  periodControls: {
    paddingTop: 2,
    paddingBottom: 0,
    gap: 8,
  },
  periodActions: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 16 },
  blurContainer: { overflow: "hidden" },
  selectsWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: NAV_GROUP_RADIUS,
    height: SELECT_HEIGHT,
    overflow: "hidden",
  },
  selectsBlurBg: {
    ...StyleSheet.absoluteFill,
    borderRadius: NAV_GROUP_RADIUS,
  },
  periodDropdown: { flex: 1, minWidth: 0 },
  periodNavGroup: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: NAV_GROUP_RADIUS,
    padding: NAV_GROUP_PADDING,
    gap: NAV_GROUP_GAP,
  },
  periodNavBtn: {
    width: NAV_BTN_SIZE,
    height: NAV_BTN_HEIGHT,
    borderRadius: NAV_BTN_RADIUS,
    alignItems: "center",
    justifyContent: "center",
  },
});
