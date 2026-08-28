import {
  memo,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Modal,
  ScrollView,
  Pressable,
  View,
  StyleSheet,
} from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { MONTH_NAMES } from "@/domain/bucksLogic";
import { formatDateToISO } from "@/utils/dateUtils";
import { type Palette } from "@/theme/colors";
import { UI_COPY, type UiCopy } from "@/i18n";
import { useModalTransition } from "./useModalTransition";
import { Text } from "./AppText";
import {
  DAY_LABELS,
  DAY_LABELS_EN,
  MONTH_ABBR,
  MONTH_ABBR_EN,
  MONTH_NAMES_EN,
} from "./calendarData";
import { PickerSheet, PickerRow, PickerChip } from "./calendarComponents";
import { RADIUS } from "@/theme/radii";

const s = StyleSheet.create({
  overlay: { alignItems: "center", justifyContent: "center" },
  backdrop: {},
  panel: {
    width: 300,
    borderRadius: RADIUS["2xl"],
    borderWidth: 1,
    overflow: "hidden",
    elevation: 20,
  },
  header: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  monthNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  body: { padding: 12 },
  monthGrid: { flexDirection: "row", flexWrap: "wrap" },
  monthCell: { width: "25%", paddingVertical: 10, alignItems: "center" },
  monthPill: {
    width: 52,
    height: 36,
    borderRadius: RADIUS["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  dayLabels: { flexDirection: "row", marginBottom: 4 },
  dayLabel: { flex: 1, textAlign: "center", fontSize: 11, fontWeight: "700" },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", minHeight: 288 },
  dayCell: { width: `${100 / 7}%`, paddingVertical: 6, alignItems: "center" },
  dayPill: {
    width: 36,
    height: 36,
    borderRadius: RADIUS["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 6,
    borderTopWidth: 1,
  },
  footerBtn: { fontWeight: "700", fontSize: 14 },
  sheetScroll: { paddingVertical: 8 },
  yearLabel: {
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginBottom: 12,
  },
  yearMonthGrid: { flexDirection: "row", flexWrap: "wrap" },
});

export const CalendarPicker = memo(function CalendarPicker({
  visible,
  value,
  onSelect,
  onClose,
  colors,
  copy = UI_COPY.es,
  mode = "date",
  minDate,
  maxDate,
}: {
  visible: boolean;
  value: string;
  onSelect: (v: string) => void;
  onClose: () => void;
  colors: Palette;
  copy?: UiCopy;
  mode?: "date" | "month";
  minDate?: string;
  maxDate?: string;
}) {
  const parsed = useMemo(
    () =>
      value
        ? new Date(value + (value.length <= 7 ? "-15T12:00:00" : "T12:00:00"))
        : new Date(),
    [value],
  );
  const [viewYear, setViewYear] = useState(parsed.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsed.getMonth());
  const [selectedDay, setSelectedDay] = useState(parsed.getDate());
  const [showYearPicker, setShowYearPicker] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const pendingSelection = useRef<string | null>(null);
  const transition = useModalTransition(visible, 10, 0.985, () => {
    const next = pendingSelection.current;
    pendingSelection.current = null;
    if (next !== null) onSelect(next);
  });

  useLayoutEffect(() => {
    if (!visible) return;
    setViewYear(parsed.getFullYear());
    setViewMonth(parsed.getMonth());
    setSelectedDay(parsed.getDate());
    setShowYearPicker(false);
    setShowMonthPicker(false);
  }, [value, visible, parsed]);

  if (!transition.modalVisible) return null;

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const effectiveMax = maxDate || todayStr;
  const effectiveMin = minDate || "2020-01-01";
  const minParsed = new Date(
    effectiveMin + (effectiveMin.length <= 7 ? "-15T12:00:00" : "T12:00:00"),
  );
  const maxParsed = new Date(
    effectiveMax + (effectiveMax.length <= 7 ? "-15T12:00:00" : "T12:00:00"),
  );
  const minYear = Number.isNaN(minParsed.getFullYear())
    ? 2000
    : minParsed.getFullYear();
  const maxYear = Number.isNaN(maxParsed.getFullYear())
    ? now.getFullYear()
    : maxParsed.getFullYear();
  const canGoBackYear = viewYear > minYear;
  const canGoForwardYear = viewYear < maxYear;
  const canGoBackMonth =
    viewYear === minYear
      ? viewMonth > minParsed.getMonth()
      : viewYear > minYear;
  const canGoForwardMonth =
    viewYear === maxYear
      ? viewMonth < maxParsed.getMonth()
      : viewYear < maxYear;

  const english = copy.languageCode === "en";
  const monthName = english
    ? MONTH_NAMES_EN[viewMonth]
    : MONTH_NAMES[viewMonth];
  const monthAbbr = english ? MONTH_ABBR_EN : MONTH_ABBR;
  const dayLabels = english ? DAY_LABELS_EN : DAY_LABELS;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const firstDayOfWeek = (new Date(viewYear, viewMonth, 1).getDay() + 6) % 7;

  const yearOptions = Array.from(
    { length: maxYear - minYear + 1 },
    (_, i) => maxYear - i,
  );

  const isDayDisabled = (day: number) => {
    const ds = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return ds < effectiveMin || ds > effectiveMax;
  };
  const isMonthDisabled = (m: number) => {
    const padM = String(m + 1).padStart(2, "0");
    const padMinM = String(minParsed.getMonth() + 1).padStart(2, "0");
    const padMaxM = String(maxParsed.getMonth() + 1).padStart(2, "0");
    const minKey = `${minYear}-${padMinM}`;
    const maxKey = `${maxYear}-${padMaxM}`;
    const curKey = `${viewYear}-${padM}`;
    return curKey < minKey || curKey > maxKey;
  };

  const handleSelect = (y: number, m: number, d?: number) => {
    if (mode === "month") {
      pendingSelection.current = `${y}-${String(m + 1).padStart(2, "0")}`;
    } else {
      const day = d || 1;
      pendingSelection.current = `${y}-${String(m + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    }
    onClose();
  };

  return (
    <Modal
      visible={transition.modalVisible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View
        style={[StyleSheet.absoluteFill, s.overlay, transition.containerStyle]}
      >
        <Pressable
          style={[
            StyleSheet.absoluteFill,
            s.backdrop,
            { backgroundColor: colors.overlay },
          ]}
          onPress={onClose}
        />
        <Animated.View
          style={[
            s.panel,
            { backgroundColor: colors.card, borderColor: colors.border },
            transition.panelStyle,
          ]}
        >
          <View style={[s.header, { borderColor: colors.border }]}>
            <View
              style={[s.headerRow, { marginBottom: mode === "date" ? 14 : 0 }]}
            >
              <Pressable
                onPress={() => canGoBackYear && setViewYear(viewYear - 1)}
                disabled={!canGoBackYear}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={26}
                  color={canGoBackYear ? colors.text : colors.disabled}
                />
              </Pressable>
              <Pressable
                onPress={() => {
                  setShowYearPicker(true);
                  setShowMonthPicker(false);
                }}
              >
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 18,
                    fontWeight: "700",
                  }}
                >
                  {viewYear}
                </Text>
              </Pressable>
              <Pressable
                onPress={() => canGoForwardYear && setViewYear(viewYear + 1)}
                disabled={!canGoForwardYear}
              >
                <MaterialCommunityIcons
                  name="chevron-right"
                  size={26}
                  color={canGoForwardYear ? colors.text : colors.disabled}
                />
              </Pressable>
            </View>
            {mode === "date" && (
              <View style={s.monthNav}>
                <Pressable
                  onPress={() => canGoBackMonth && setViewMonth(viewMonth - 1)}
                  disabled={!canGoBackMonth}
                >
                  <MaterialCommunityIcons
                    name="chevron-left"
                    size={22}
                    color={canGoBackMonth ? colors.muted : colors.disabled}
                  />
                </Pressable>
                <Pressable
                  onPress={() => {
                    setShowMonthPicker(true);
                    setShowYearPicker(false);
                  }}
                >
                  <Text
                    style={{
                      color: colors.primary,
                      fontSize: 15,
                      fontWeight: "700",
                    }}
                  >
                    {monthName}
                  </Text>
                </Pressable>
                <Pressable
                  onPress={() =>
                    canGoForwardMonth && setViewMonth(viewMonth + 1)
                  }
                  disabled={!canGoForwardMonth}
                >
                  <MaterialCommunityIcons
                    name="chevron-right"
                    size={22}
                    color={canGoForwardMonth ? colors.muted : colors.disabled}
                  />
                </Pressable>
              </View>
            )}
          </View>
          <View style={s.body}>
            {mode === "month" ? (
              <View style={s.monthGrid}>
                {monthAbbr.map((abbr, i) => {
                  const isSelected = i === viewMonth;
                  const disabled = isMonthDisabled(i);
                  return (
                    <Pressable
                      key={i}
                      onPress={() => !disabled && handleSelect(viewYear, i)}
                      disabled={disabled}
                      style={s.monthCell}
                    >
                      <View
                        style={[
                          s.monthPill,
                          {
                            backgroundColor: isSelected
                              ? colors.primary
                              : "transparent",
                          },
                        ]}
                      >
                        <Text
                          style={{
                            color: disabled
                              ? colors.disabled
                              : isSelected
                                ? colors.onPrimary
                                : colors.text,
                            fontSize: 13,
                            fontWeight: "700",
                          }}
                        >
                          {abbr}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                <View style={s.dayLabels}>
                  {dayLabels.map((d, index) => (
                    <Text
                      key={`${d}-${index}`}
                      style={[s.dayLabel, { color: colors.muted }]}
                    >
                      {d}
                    </Text>
                  ))}
                </View>
                <View style={s.dayGrid}>
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <View key={`e-${i}`} style={{ width: `${100 / 7}%` }} />
                  ))}
                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const day = i + 1;
                    const isToday =
                      day === now.getDate() &&
                      viewMonth === now.getMonth() &&
                      viewYear === now.getFullYear();
                    const isSelected = day === selectedDay;
                    const disabled = isDayDisabled(day);
                    return (
                      <Pressable
                        key={day}
                        onPress={() => {
                          if (!disabled) {
                            setSelectedDay(day);
                            handleSelect(viewYear, viewMonth, day);
                          }
                        }}
                        disabled={disabled}
                        style={s.dayCell}
                      >
                        <View
                          style={[
                            s.dayPill,
                            {
                              backgroundColor: isSelected
                                ? colors.primary
                                : isToday
                                  ? colors.primarySoft
                                  : "transparent",
                              borderWidth: isToday && !isSelected ? 1 : 0,
                              borderColor: colors.primary,
                              opacity: disabled ? 0.3 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={{
                              color: isSelected
                                ? colors.onPrimary
                                : isToday
                                  ? colors.primary
                                  : colors.text,
                              fontSize: 13,
                              fontWeight: isSelected ? "700" : "600",
                            }}
                          >
                            {day}
                          </Text>
                        </View>
                      </Pressable>
                    );
                  })}
                </View>
              </>
            )}
          </View>
          <View style={[s.footer, { borderColor: colors.border }]}>
            <Pressable
              onPress={() => {
                const nowDate = new Date();
                pendingSelection.current =
                  mode === "month"
                    ? `${nowDate.getFullYear()}-${String(nowDate.getMonth() + 1).padStart(2, "0")}`
                    : formatDateToISO(nowDate);
                onClose();
              }}
            >
              <Text style={[s.footerBtn, { color: colors.primary }]}>
                {copy.thisMonth}
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                pendingSelection.current = "";
                onClose();
              }}
            >
              <Text style={[s.footerBtn, { color: colors.muted }]}>
                {copy.erase}
              </Text>
            </Pressable>
          </View>

          {showYearPicker && (
            <PickerSheet
              onClose={() => setShowYearPicker(false)}
              colors={colors}
              width="72%"
              maxHeight={250}
            >
              <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={s.sheetScroll}
              >
                {yearOptions.map((y) => (
                  <PickerRow
                    key={y}
                    label={String(y)}
                    selected={y === viewYear}
                    colors={colors}
                    fontSize={17}
                    onPress={() => {
                      setViewYear(y);
                      setShowYearPicker(false);
                    }}
                  />
                ))}
              </ScrollView>
            </PickerSheet>
          )}

          {showMonthPicker && (
            <PickerSheet
              onClose={() => setShowMonthPicker(false)}
              colors={colors}
              width="94%"
              contentStyle={{ paddingVertical: 20, paddingHorizontal: 6 }}
            >
              <Text style={[s.yearLabel, { color: colors.muted }]}>
                {viewYear}
              </Text>
              <View style={s.yearMonthGrid}>
                {(english ? MONTH_NAMES_EN : MONTH_NAMES).map((name, i) => (
                  <PickerChip
                    key={i}
                    label={name}
                    selected={i === viewMonth}
                    disabled={isMonthDisabled(i)}
                    colors={colors}
                    onPress={() => {
                      setViewMonth(i);
                      setShowMonthPicker(false);
                    }}
                  />
                ))}
              </View>
            </PickerSheet>
          )}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
});

