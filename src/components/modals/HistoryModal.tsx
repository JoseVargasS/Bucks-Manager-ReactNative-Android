import { FlatList, Modal, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { HistoryEntry } from "../../types";
import { styles } from "../../styles/globalStyles";
import { Palette } from "../../theme/colors";
import { formatMoney, formatCreatedTime } from "../../utils/formats";
import { UiCopy } from "../../i18n";

export function HistoryModal({ visible, entries, colors, currencySymbol, copy, onClose, onUndo }: {
  visible: boolean;
  entries: HistoryEntry[];
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  onClose: () => void;
  onUndo: (entry: HistoryEntry) => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={onClose} />
        <View style={[styles.recordModal, { backgroundColor: colors.card }]}>
          <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="history" size={19} color={colors.primary} /> {copy.history}
            </Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.input }]} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={{ paddingHorizontal: 16, paddingBottom: 20 }}>
            <Text style={{ fontSize: 12, fontWeight: "500", color: colors.muted, marginBottom: 12, marginTop: 4 }}>
              {copy.historySubtitle}
            </Text>
            {entries.length === 0 ? (
              <View style={{ paddingVertical: 32, alignItems: "center", gap: 10 }}>
                <MaterialCommunityIcons name="history" size={36} color={colors.muted} />
                <Text style={{ color: colors.muted, fontSize: 14, fontWeight: "500" }}>{copy.historyEmpty}</Text>
              </View>
            ) : (
              <FlatList
                data={entries}
                keyExtractor={(item) => item.id}
                style={{ maxHeight: 420 }}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderColor: colors.border }}>
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: actionBg(item.action, colors), alignItems: "center", justifyContent: "center" }}>
                      <MaterialCommunityIcons name={actionIcon(item.action)} size={18} color={actionColor(item.action, colors)} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: actionColor(item.action, colors), textTransform: "uppercase" }}>
                          {actionLabel(item.action, copy)}
                        </Text>
                        <Text style={{ fontSize: 11, fontWeight: "500", color: colors.muted }}>
                          {formatCreatedTime(item.timestamp)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={{ fontSize: 14, fontWeight: "600", color: colors.text, marginTop: 1 }}>
                        {item.transaction.detail || copy.detailPlaceholder}
                      </Text>
                      <Text style={{ fontSize: 13, fontWeight: "600", color: item.transaction.amount >= 0 ? colors.green : colors.red, fontVariant: ["tabular-nums"], marginTop: 1 }}>
                        {formatMoney(item.transaction.amount, currencySymbol)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={{ width: 38, height: 38, borderRadius: 12, backgroundColor: colors.input, alignItems: "center", justifyContent: "center" }}
                      onPress={() => onUndo(item)}
                    >
                      <MaterialCommunityIcons name="undo" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function actionIcon(action: HistoryEntry["action"]) {
  if (action === "create") return "plus-circle";
  if (action === "edit") return "pencil";
  return "trash-can";
}

function actionLabel(action: HistoryEntry["action"], copy: UiCopy) {
  if (action === "create") return copy.add;
  if (action === "edit") return copy.edit;
  return copy.delete;
}

function actionColor(action: HistoryEntry["action"], colors: Palette) {
  if (action === "create") return colors.green;
  if (action === "edit") return colors.blue;
  return colors.red;
}

function actionBg(action: HistoryEntry["action"], colors: Palette) {
  if (action === "create") return colors.incomeSoft;
  if (action === "edit") return colors.infoSoft;
  return colors.expenseSoft;
}
