import { memo } from "react";
import { Animated, View } from "react-native";
import { BlurView } from "expo-blur";
import { type Palette } from "@/theme/colors";
import { type UiCopy } from "@/i18n";
import { Select } from "@/components/ui/Select";
import { Text } from "@/components/ui/AppText";
import { T } from "@/theme/typography";
import { HEADER_ACTIONS_WIDTH, SELECT_HEIGHT, BLUR_INTENSITY, NAV_GROUP_RADIUS } from "@/theme/constants";

export const SummaryHeader = memo(function SummaryHeader({
  colors, copy, subLabel, filterYear, yearOptions, setFilterYear, scrollY, theme,
}: {
  colors: Palette; copy: UiCopy; subLabel: string; filterYear: number;
  yearOptions: { label: string; value: string }[];
  setFilterYear: (v: number) => void; scrollY: Animated.Value; theme: "dark" | "light";
}) {
  return (
    <Animated.View style={{ opacity: scrollY.interpolate({ inputRange: [0, 5], outputRange: [1, 0], extrapolate: "clamp" }) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={[{ color: colors.text }, T.section]}>{copy.annualOverview}</Text>
          <Text style={[{ color: colors.muted, marginTop: 2 }, T.pageSub]}>{subLabel}</Text>
        </View>
        <BlurView intensity={BLUR_INTENSITY} tint={theme} style={{ borderRadius: NAV_GROUP_RADIUS, overflow: "hidden" }}>
          <Select
            value={String(filterYear)} options={yearOptions}
            onSelect={(value) => setFilterYear(Number(value))}
            colors={colors} title={copy.selectYear} style={{ width: HEADER_ACTIONS_WIDTH }} hideArrow
            buttonStyle={{ borderRadius: NAV_GROUP_RADIUS, borderColor: "transparent", minHeight: SELECT_HEIGHT, backgroundColor: "transparent" }}
          />
        </BlurView>
      </View>
    </Animated.View>
  );
});

export const SummaryStickyHeader = memo(function SummaryStickyHeader({
  colors, copy, subLabel, filterYear, yearOptions, setFilterYear, scrollY, scrolled, topInset, theme,
}: {
  colors: Palette; copy: UiCopy; subLabel: string; filterYear: number;
  yearOptions: { label: string; value: string }[];
  setFilterYear: (v: number) => void; scrollY: Animated.Value;
  scrolled: boolean; topInset: number; theme: "dark" | "light";
}) {
  return (
    <Animated.View
      pointerEvents={scrolled ? "box-none" : "none"}
      style={{
        position: "absolute", top: 0, left: 0, right: 0, paddingTop: topInset,
        paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 12, paddingBottom: 4,
        opacity: scrollY.interpolate({ inputRange: [0, 5], outputRange: [0, 1], extrapolate: "clamp" }),
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[{ color: colors.text }, T.section]}>{copy.annualOverview}</Text>
        <Text style={[{ color: colors.muted, marginTop: 2 }, T.pageSub]}>{subLabel}</Text>
      </View>
      <BlurView intensity={BLUR_INTENSITY} tint={theme} style={{ borderRadius: NAV_GROUP_RADIUS, overflow: "hidden" }}>
        <Select
          value={String(filterYear)} options={yearOptions}
          onSelect={(value) => setFilterYear(Number(value))}
          colors={colors} title={copy.selectYear} style={{ width: HEADER_ACTIONS_WIDTH }} hideArrow
          buttonStyle={{ borderRadius: NAV_GROUP_RADIUS, borderColor: "transparent", minHeight: SELECT_HEIGHT, backgroundColor: "transparent" }}
        />
      </BlurView>
    </Animated.View>
  );
});
