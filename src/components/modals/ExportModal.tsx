import { useState } from "react";
import { Modal, ScrollView, Text, TextInput, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { MONTH_NAMES } from "../../domain/bucksLogic";
import { styles } from "../../styles/globalStyles";
import { ModalHeader } from "../ui/ModalHeader";
import { ActionRow } from "../ui/ActionRow";
import { CalendarPicker } from "../ui/CalendarPicker";
import { Palette } from "../../theme/colors";
import { ExportFormat } from "../../types";

export type ExportConfig = {
  format: ExportFormat;
  rangeMode: "dates" | "months";
  startDate: string;
  endDate: string;
  startMonth: number;
  startYear: number;
  endMonth: number;
  endYear: number;
};

export function ExportModal({ visible, colors, config, setConfig, minDate, onClose, onExport }: {
  visible: boolean; colors: Palette; config: ExportConfig; setConfig: (c: ExportConfig) => void;
  minDate: string; onClose: () => void; onExport: (cfg: ExportConfig) => void;
}) {
  const [calFrom, setCalFrom] = useState(false);
  const [calTo, setCalTo] = useState(false);
  const rangeLabel = (val: string, isMonth?: boolean) => {
    if (!val) return "Seleccionar";
    if (isMonth) {
      const [y, m] = val.split("-");
      return `${MONTH_NAMES[Number(m) - 1]} ${y}`;
    }
    const d = new Date(val + "T12:00:00");
    return d.toLocaleDateString("es-PE", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  };
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.modal, { backgroundColor: colors.card }]}>
          <ModalHeader title="Exportar movimientos" icon="file-export" colors={colors} onClose={onClose} />
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
            <Text style={[styles.label, { color: colors.text }]}>Formato</Text>
            <View style={styles.twoCols}>
              <TouchableOpacity
                style={[styles.exportChip, { backgroundColor: config.format === "xlsx" ? colors.primarySoft : colors.input, borderColor: config.format === "xlsx" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, format: "xlsx" })}
              >
                <MaterialCommunityIcons name="file-delimited" size={20} color={config.format === "xlsx" ? colors.primary : colors.muted} />
                <Text style={[{ color: config.format === "xlsx" ? colors.primary : colors.text, fontWeight: "900" }]}>CSV</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportChip, { backgroundColor: config.format === "pdf" ? colors.primarySoft : colors.input, borderColor: config.format === "pdf" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, format: "pdf" })}
              >
                <MaterialCommunityIcons name="file-pdf-box" size={20} color={config.format === "pdf" ? colors.primary : colors.muted} />
                <Text style={[{ color: config.format === "pdf" ? colors.primary : colors.text, fontWeight: "900" }]}>PDF</Text>
              </TouchableOpacity>
            </View>
            <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Rango</Text>
            <View style={styles.twoCols}>
              <TouchableOpacity
                style={[styles.exportChip, { backgroundColor: config.rangeMode === "dates" ? colors.primarySoft : colors.input, borderColor: config.rangeMode === "dates" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, rangeMode: "dates" })}
              >
                <MaterialCommunityIcons name="calendar-range" size={20} color={config.rangeMode === "dates" ? colors.primary : colors.muted} />
                <Text style={[{ color: config.rangeMode === "dates" ? colors.primary : colors.text, fontWeight: "900" }]}>Por fechas</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.exportChip, { backgroundColor: config.rangeMode === "months" ? colors.primarySoft : colors.input, borderColor: config.rangeMode === "months" ? colors.primary : colors.border }]}
                onPress={() => setConfig({ ...config, rangeMode: "months" })}
              >
                <MaterialCommunityIcons name="calendar-month" size={20} color={config.rangeMode === "months" ? colors.primary : colors.muted} />
                <Text style={[{ color: config.rangeMode === "months" ? colors.primary : colors.text, fontWeight: "900" }]}>Por meses</Text>
              </TouchableOpacity>
            </View>
            {config.rangeMode === "months" ? (
              <>
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Mes inicial</Text>
                <TouchableOpacity
                  style={[{ backgroundColor: colors.input, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1 }]}
                  onPress={() => setCalFrom(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.blue} />
                  <Text style={{ color: config.startDate ? colors.text : colors.muted, fontWeight: "900", flex: 1 }}>{rangeLabel(config.startDate, true)}</Text>
                </TouchableOpacity>
                <CalendarPicker visible={calFrom} value={config.startDate} mode="month" minDate={minDate ? minDate.slice(0, 7) : undefined} onSelect={(v: string) => setConfig({ ...config, startDate: v })} onClose={() => setCalFrom(false)} colors={colors} />
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Mes final</Text>
                <TouchableOpacity
                  style={[{ backgroundColor: colors.input, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1 }]}
                  onPress={() => setCalTo(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.blue} />
                  <Text style={{ color: config.endDate ? colors.text : colors.muted, fontWeight: "900", flex: 1 }}>{rangeLabel(config.endDate, true)}</Text>
                </TouchableOpacity>
                <CalendarPicker visible={calTo} value={config.endDate} mode="month" minDate={minDate ? minDate.slice(0, 7) : undefined} onSelect={(v: string) => setConfig({ ...config, endDate: v })} onClose={() => setCalTo(false)} colors={colors} />
              </>
            ) : (
              <>
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Desde</Text>
                <TouchableOpacity
                  style={[{ backgroundColor: colors.input, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1 }]}
                  onPress={() => setCalFrom(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.blue} />
                  <Text style={{ color: config.startDate ? colors.text : colors.muted, fontWeight: "900", flex: 1 }}>{rangeLabel(config.startDate)}</Text>
                </TouchableOpacity>
                <CalendarPicker visible={calFrom} value={config.startDate} mode="date" minDate={minDate} onSelect={(v: string) => setConfig({ ...config, startDate: v })} onClose={() => setCalFrom(false)} colors={colors} />
                <Text style={[styles.label, { color: colors.text, marginTop: 12 }]}>Hasta</Text>
                <TouchableOpacity
                  style={[{ backgroundColor: colors.input, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1 }]}
                  onPress={() => setCalTo(true)}
                >
                  <MaterialCommunityIcons name="calendar" size={20} color={colors.blue} />
                  <Text style={{ color: config.endDate ? colors.text : colors.muted, fontWeight: "900", flex: 1 }}>{rangeLabel(config.endDate)}</Text>
                </TouchableOpacity>
                <CalendarPicker visible={calTo} value={config.endDate} mode="date" minDate={minDate} onSelect={(v: string) => setConfig({ ...config, endDate: v })} onClose={() => setCalTo(false)} colors={colors} />
              </>
            )}
            <ActionRow colors={colors} onCancel={onClose} onSubmit={() => onExport(config)} submitLabel="Exportar" />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
