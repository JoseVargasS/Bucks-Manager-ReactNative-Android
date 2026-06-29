import { useMemo } from "react";
import { Animated, FlatList, Modal, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { type HistoryEntry } from "@/types";
import { base } from "@/styles/baseStyles";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";
import { s } from "./HistoryModal.styles";
const styles = { ...base, ...recordModalStyles };
import { type Palette } from "@/theme/colors";
import { formatMoney } from "@/domain/bucksLogic";
import { formatCreatedTime } from "@/utils/formats";
import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { Text } from "@/components/ui/AppText";

export function HistoryModal({ visible, entries, colors, currencySymbol, copy, onClose, onUndo }: {
  visible: boolean;
  entries: HistoryEntry[];
  colors: Palette;
  currencySymbol: string;
  copy: UiCopy;
  onClose: () => void;
  onUndo: (entry: HistoryEntry) => void;
}) {
  const deletedOnly = useMemo(() => entries.filter((entry) => entry.action === "delete"), [entries]);
  const transition = useModalTransition(visible, 12, 0.985);

  if (!transition.modalVisible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <Animated.View style={[styles.modalOverlay, { backgroundColor: colors.overlay }, transition.containerStyle]}>
        <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View style={[styles.recordModal, { backgroundColor: colors.card }, transition.panelStyle]}>
          <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="delete-restore" size={19} color={colors.red} /> {copy.history}
            </Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.input }]} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          <View style={s.body}>
            <Text style={[s.subtitle, { color: colors.muted }]}>
              {copy.historySubtitle}
            </Text>
            {deletedOnly.length === 0 ? (
              <View style={s.emptyState}>
                <MaterialCommunityIcons name="delete-restore" size={36} color={colors.muted} />
                <Text style={[s.emptyText, { color: colors.muted }]}>{copy.historyEmpty}</Text>
              </View>
            ) : (
              <FlatList
                data={deletedOnly}
                keyExtractor={(item) => item.id}
                style={s.list}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <View style={[s.listItem, { borderColor: colors.border }]}>
                    <View style={[s.historyIcon, { backgroundColor: colors.expenseSoft }]}>
                      <MaterialCommunityIcons name="trash-can" size={18} color={colors.red} />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <View style={s.labelRow}>
                        <Text style={[s.deleteLabel, { color: colors.red }]}>
                          {copy.delete}
                        </Text>
                        <Text style={[s.timestamp, { color: colors.muted }]}>
                          {formatCreatedTime(item.timestamp)}
                        </Text>
                      </View>
                      <Text numberOfLines={1} style={[s.detail, { color: colors.text }]}>
                        {item.transaction.detail || copy.detailPlaceholder}
                      </Text>
                      <Text style={[s.amount, { color: item.transaction.amount >= 0 ? colors.green : colors.red }]}>
                        {formatMoney(item.transaction.amount, currencySymbol)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[s.undoBtn, { backgroundColor: colors.input }]}
                      onPress={() => onUndo(item)}
                    >
                      <MaterialCommunityIcons name="undo" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                )}
              />
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
