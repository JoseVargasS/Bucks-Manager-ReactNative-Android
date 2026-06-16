import { useEffect, useRef } from "react";
import { Animated, Modal, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { styles } from "../../styles/globalStyles";
import { DetailMeta } from "../ui/DetailMeta";
import { Palette } from "../../theme/colors";
import { Transaction } from "../../types";
import { formatMoney, formatCreatedTime, titleCaseType } from "../../utils/formats";

export function DetailModal({ tx, colors, onClose, onEdit, onDelete }: { tx: Transaction | null; colors: Palette; onClose: () => void; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void }) {
  const enterProgress = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!tx) return;
    enterProgress.setValue(0);
    Animated.timing(enterProgress, {
      toValue: 1,
      duration: 90,
      useNativeDriver: true,
    }).start();
  }, [enterProgress, tx]);

  return (
    <Modal visible={!!tx} transparent animationType="fade" onRequestClose={onClose}>
      <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
        <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={onClose} />
        <Animated.View
          style={[
            styles.detailModal,
            {
              backgroundColor: colors.card,
              transform: [
                { translateY: enterProgress.interpolate({ inputRange: [0, 1], outputRange: [6, 0] }) },
                { scale: enterProgress.interpolate({ inputRange: [0, 1], outputRange: [0.985, 1] }) },
              ],
            },
          ]}
        >
          <View style={[styles.recordHeader, { borderBottomWidth: 0 }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="receipt-text" size={20} color={colors.yellow} /> Detalle del gasto
            </Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.input }]} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {tx && (
            <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.detailHero, { backgroundColor: colors.input }]}>
                <View style={[styles.detailHeroIcon, { backgroundColor: tx.amount >= 0 ? colors.incomeSoft : colors.expenseSoft }]}>
                  <MaterialCommunityIcons name={tx.amount >= 0 ? "bank-transfer-in" : "receipt-text-outline"} size={24} color={tx.amount >= 0 ? colors.green : colors.red} />
                </View>
                <View style={styles.detailHeroText}>
                  <Text style={[styles.detailHeroLabel, { color: colors.muted }]}>{titleCaseType(tx.type)}</Text>
                  <Text numberOfLines={1} style={[styles.detailHeroAmount, { color: tx.amount >= 0 ? colors.green : colors.red, fontVariant: ["tabular-nums"] }]}>{formatMoney(tx.amount)}</Text>
                </View>
              </View>
              <View style={[styles.detailDescription, { backgroundColor: colors.input }]}>
                <Text style={[styles.detailSectionLabel, { color: colors.muted }]}>Detalle</Text>
                <Text selectable style={[styles.detailDescriptionText, { color: colors.text }]}>{tx.detail}</Text>
              </View>
              <View style={styles.detailMetaGrid}>
                <DetailMeta icon="calendar" label="Fecha" value={tx.date} tone={colors.blue} colors={colors} />
                <DetailMeta icon="clock-outline" label="Hora" value={formatCreatedTime(tx.createdAt)} tone={colors.muted} colors={colors} />
              </View>
              <View style={styles.detailActions}>
                <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: colors.input }]} onPress={() => onEdit(tx)}>
                  <MaterialCommunityIcons name="pencil" size={18} color={colors.blue} />
                  <Text style={[styles.detailActionText, { color: colors.blue }]}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.detailActionBtn, { backgroundColor: colors.input }]} onPress={() => onDelete(tx)}>
                  <MaterialCommunityIcons name="trash-can" size={18} color={colors.red} />
                  <Text style={[styles.detailActionText, { color: colors.red }]}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
}
