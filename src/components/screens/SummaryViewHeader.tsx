import { memo } from "react";
import { Animated, View } from "react-native";
import { type Palette } from "@/theme/colors";
import { type UiCopy } from "@/i18n";
import { Select } from "@/components/ui/Select";
import { Text } from "@/components/ui/AppText";

export const SummaryHeader = memo(function SummaryHeader({
  colors, copy, subLabel, filterYear, yearOptions, setFilterYear, scrollY,
}: {
  colors: Palette; copy: UiCopy; subLabel: string; filterYear: number;
  yearOptions: { label: string; value: string }[];
  setFilterYear: (v: number) => void; scrollY: Animated.Value;
}) {
  return (
    <Animated.View style={{ opacity: scrollY.interpolate({ inputRange: [0, 5], outputRange: [1, 0], extrapolate: "clamp" }) }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{copy.annualOverview}</Text>
          <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500", marginTop: 2 }}>{subLabel}</Text>
        </View>
        <Select
          value={String(filterYear)} options={yearOptions}
          onSelect={(value) => setFilterYear(Number(value))}
          colors={colors} title={copy.selectYear} style={{ width: 124 }} hideArrow
          buttonStyle={{ borderRadius: 50, borderColor: "transparent", minHeight: 46 }}
        />
      </View>
    </Animated.View>
  );
});

export const SummaryStickyHeader = memo(function SummaryStickyHeader({
  colors, copy, subLabel, filterYear, yearOptions, setFilterYear, scrollY, scrolled, topInset,
}: {
  colors: Palette; copy: UiCopy; subLabel: string; filterYear: number;
  yearOptions: { label: string; value: string }[];
  setFilterYear: (v: number) => void; scrollY: Animated.Value;
  scrolled: boolean; topInset: number;
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
        <Text style={{ color: colors.text, fontSize: 18, fontWeight: "700" }}>{copy.annualOverview}</Text>
        <Text style={{ color: colors.muted, fontSize: 13, fontWeight: "500", marginTop: 2 }}>{subLabel}</Text>
      </View>
      <Select
        value={String(filterYear)} options={yearOptions}
        onSelect={(value) => setFilterYear(Number(value))}
        colors={colors} title={copy.selectYear} style={{ width: 124 }} hideArrow
        buttonStyle={{ borderRadius: 50, borderColor: "transparent", minHeight: 46 }}
      />
    </Animated.View>
  );
});
