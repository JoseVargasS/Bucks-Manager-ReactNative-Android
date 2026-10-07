import { useCallback, useMemo } from "react";
import { Animated, FlatList, Modal, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
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

  const renderHistoryItem = useCallback(({ item }: { item: HistoryEntry }) => (
    <View style={[s.listItem, { borderColor: colors.border }]}>
      <View style={[s.historyIcon, { backgroundColor: colors.expenseSoft }]}>
        <MaterialCommunityIcons name="trash-can" size={18} color={colors.expense} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <View style={s.labelRow}>
          <Text style={[s.deleteLabel, { color: colors.expense }]}>
            {copy.delete}
          </Text>
          <Text style={[s.timestamp, { color: colors.muted }]}>
            {formatCreatedTime(item.timestamp)}
          </Text>
        </View>
        <Text numberOfLines={1} style={[s.detail, { color: colors.text }]}>
          {item.transaction.detail || copy.detailPlaceholder}
        </Text>
        <Text style={[s.amount, { color: item.transaction.amount >= 0 ? colors.income : colors.expense }]}>
          {formatMoney(item.transaction.amount, currencySymbol)}
        </Text>
      </View>
      <Pressable
        style={[s.undoBtn, { backgroundColor: colors.input }]}
        onPress={() => onUndo(item)}
      >
        <MaterialCommunityIcons name="undo" size={18} color={colors.primary} />
      </Pressable>
    </View>
  ), [colors, copy, currencySymbol, onUndo]);

  if (!transition.modalVisible) return null;
  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose}>
      <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
      <Animated.View style={[styles.modalOverlay, { backgroundColor: colors.overlay }, transition.containerStyle]}>
        <Pressable style={styles.optionBackdrop} onPress={onClose} />
          <Animated.View style={[styles.recordModal, { backgroundColor: colors.card }, transition.panelStyle]}>
            <Animated.View style={transition.contentStyle}>
            <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="delete-restore" size={19} color={colors.expense} /> {copy.history}
            </Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.input }]} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
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
                renderItem={renderHistoryItem}
              />
            )}
            </View>
            </Animated.View>
          </Animated.View>
      </Animated.View>
    </Modal>
  );
}
