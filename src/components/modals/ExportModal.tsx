import { useRef, useState } from "react";
import { Animated, Modal, ScrollView, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { exportModalStyles } from "@/components/modals/ExportModal.styles";
import { ModalHeader } from "@/components/ui/ModalHeader";

const styles = { ...base, ...exportModalStyles };
import { ActionRow } from "@/components/ui/ActionRow";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { type Palette } from "@/theme/colors";
import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { DEFAULT_LOCALE } from "@/utils/formats";
import { Text } from "@/components/ui/AppText";
import { type ExportConfig } from "@/components/modals/ExportConfig";

export type { ExportConfig } from "@/components/modals/ExportConfig";

export function ExportModal({ visible, colors, copy, config, setConfig, minDate, onClose, onExport }: {
  visible: boolean; colors: Palette; config: ExportConfig; setConfig: (c: ExportConfig) => void;
  copy: UiCopy;
  minDate: string; onClose: () => void; onExport: (cfg: ExportConfig) => void;
}) {
  const [calFrom, setCalFrom] = useState(false);
  const [calTo, setCalTo] = useState(false);
  const pendingExport = useRef<ExportConfig | null>(null);
  const transition = useModalTransition(visible, 12, 0.985, () => {
    const pending = pendingExport.current;
    pendingExport.current = null;
    if (pending) onExport(pending);
  });
  const locale = copy.languageCode === "en" ? "en-US" : DEFAULT_LOCALE;
  const rangeLabel = (val: string, isMonth?: boolean) => {
    if (!val) return copy.select;
    if (isMonth) {
      const [y, m] = val.split("-");
      const d = new Date(Number(y), Number(m) - 1, 15);
      return d.toLocaleDateString(locale, { month: "long", year: "numeric" });
    }
    const d = new Date(val + "T12:00:00");
    return d.toLocaleDateString(locale, { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  };
  if (!transition.modalVisible) return null;
  const mode = config.rangeMode === "months" ? "month" : "date";
  const minForMode = mode === "month" && minDate ? minDate.slice(0, 7) : minDate;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View style={[styles.modalOverlay, { backgroundColor: colors.overlay }, transition.containerStyle]}>
        <Pressable style={styles.optionBackdrop} onPress={onClose} />
        <Animated.View style={[styles.modal, { backgroundColor: colors.card }, transition.panelStyle]}>
          <ModalHeader title={copy.exportMovements} icon="file-export" colors={colors} onClose={onClose} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: colors.text }]}>{copy.format}</Text>
            <View style={styles.twoCols}>
              <Pressable
                style={[styles.exportChip, { backgroundColor: config.format === "xlsx" ? colors.primarySoft : colors.input, borderColor: config.format === "xlsx" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, format: "xlsx" })}
              >
                <MaterialCommunityIcons name="file-delimited" size={20} color={config.format === "xlsx" ? colors.primary : colors.muted} />
                <Text style={{ color: config.format === "xlsx" ? colors.primary : colors.text, fontWeight: "700" }}>CSV</Text>
              </Pressable>
              <Pressable
                style={[styles.exportChip, { backgroundColor: config.format === "pdf" ? colors.primarySoft : colors.input, borderColor: config.format === "pdf" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, format: "pdf" })}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={20} color={config.format === "pdf" ? colors.primary : colors.muted} />
                <Text style={{ color: config.format === "pdf" ? colors.primary : colors.text, fontWeight: "700" }}>PDF</Text>
              </Pressable>
            </View>
            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>{copy.range}</Text>
            <View style={styles.twoCols}>
              <Pressable
                style={[styles.exportChip, { backgroundColor: config.rangeMode === "dates" ? colors.primarySoft : colors.input, borderColor: config.rangeMode === "dates" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, rangeMode: "dates" })}
              >
                <MaterialCommunityIcons name="calendar-range" size={20} color={config.rangeMode === "dates" ? colors.primary : colors.muted} />
                <Text style={{ color: config.rangeMode === "dates" ? colors.primary : colors.text, fontWeight: "700" }}>{copy.byDates}</Text>
              </Pressable>
              <Pressable
                style={[styles.exportChip, { backgroundColor: config.rangeMode === "months" ? colors.primarySoft : colors.input, borderColor: config.rangeMode === "months" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, rangeMode: "months" })}
              >
                <MaterialCommunityIcons name="calendar-month" size={20} color={config.rangeMode === "months" ? colors.primary : colors.muted} />
                <Text style={{ color: config.rangeMode === "months" ? colors.primary : colors.text, fontWeight: "700" }}>{copy.byMonths}</Text>
              </Pressable>
            </View>
            <RangeField
              label={mode === "month" ? copy.startMonth : copy.from}
              value={config.startDate}
              onChange={(v) => setConfig({ ...config, startDate: v })}
              pickerMode={mode}
              pickerMin={minForMode}
              colors={colors}
              copy={copy}
              onOpen={() => setCalFrom(true)}
              onClose={() => setCalFrom(false)}
              isOpen={calFrom}
              displayValue={rangeLabel(config.startDate, mode === "month")}
            />
            <RangeField
              label={mode === "month" ? copy.endMonth : copy.to}
              value={config.endDate}
              onChange={(v) => setConfig({ ...config, endDate: v })}
              pickerMode={mode}
              pickerMin={minForMode}
              colors={colors}
              copy={copy}
              onOpen={() => setCalTo(true)}
              onClose={() => setCalTo(false)}
              isOpen={calTo}
              displayValue={rangeLabel(config.endDate, mode === "month")}
            />
            <ActionRow colors={colors} onCancel={onClose} onSubmit={() => { pendingExport.current = config; onClose(); }} submitLabel={copy.exportAction} cancelLabel={copy.cancel} />
          </ScrollView>
        </Animated.View>
      </Animated.View>
</Modal>
  );
}

function RangeField({ label, value, onChange, pickerMode, pickerMin, colors, copy, onOpen, onClose, isOpen, displayValue }: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  pickerMode: "date" | "month";
  pickerMin?: string;
  colors: Palette;
  copy: UiCopy;
  onOpen: () => void;
  onClose: () => void;
  isOpen: boolean;
  displayValue: string;
}) {
  return (
    <>
      <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>{label}</Text>
      <Pressable style={{ borderRadius: 10, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, backgroundColor: colors.input, borderColor: colors.border }} onPress={onOpen}>
        <MaterialCommunityIcons name="calendar" size={20} color={colors.info} />
        <Text style={{ color: value ? colors.text : colors.muted, fontWeight: "600", flex: 1 }}>{displayValue}</Text>
      </Pressable>
      <CalendarPicker visible={isOpen} value={value} mode={pickerMode} minDate={pickerMin} onSelect={onChange} onClose={onClose} colors={colors} copy={copy} />
    </>
  );
}


