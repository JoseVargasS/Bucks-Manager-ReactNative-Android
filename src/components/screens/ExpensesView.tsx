import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { formatMoney, formatCreatedTime, abbrev, typeColor, typeFill } from "../../utils/formats";
import { groupTransactionsByDate } from "../../utils/transactions";
import { styles } from "../../styles/globalStyles";
import { StatCard } from "../ui/StatCard";
import { HighlightedText } from "../ui/HighlightedText";
import { Palette } from "../../theme/colors";
import { SummaryRow, Transaction, MaterialIconName } from "../../types";

export function ExpensesView({
  colors, summary, transactions, searchActive, searchText, selectedRows,
  onEditFreq, onExitSearch, onOpenDetail, onEdit, onDeleteSelected, onMove, onToggleSelection, onLoadOlder,
}: {
  colors: Palette; summary: SummaryRow; transactions: Transaction[]; searchActive: boolean; searchText: string;
  selectedRows: number[]; onEditFreq: () => void; onExitSearch: () => void; onOpenDetail: (tx: Transaction) => void;
  onEdit: (tx: Transaction) => void; onDeleteSelected: () => void; onMove: (tx: Transaction) => void;
  onToggleSelection: (tx: Transaction) => void; onLoadOlder: () => void;
}) {
  const groups = groupTransactionsByDate(transactions);
  const selectedCount = selectedRows.length;
  const selectedTx = transactions.find((tx) => tx.rowId === selectedRows[0]);
  return (
    <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.pageScroll}>
      <View style={[styles.statsGrid, styles.statsGridMobile]}>
        <StatCard title="Ing. Frec." value={formatMoney(summary.freqIncome)} tone="income" icon="cash" colors={colors} action={onEditFreq} />
        <StatCard title="Ing. No Frec." value={formatMoney(summary.nonFreqIncome)} tone="income" icon="trending-up" colors={colors} />
        <StatCard title="Gasto Frec." value={formatMoney(summary.freqExpense)} tone="expense" icon="credit-card" colors={colors} />
        <StatCard title="Gasto No Frec." value={formatMoney(summary.nonFreqExpense)} tone="expense" icon="trending-down" colors={colors} />
        <StatCard title="Gasto Total" value={formatMoney(summary.totalExpense)} tone="warn" icon="basket" colors={colors} />
        <StatCard title="Balance" value={formatMoney(summary.netMonthly)} tone="balance" icon="wallet" colors={colors} />
      </View>

      {searchActive && (
        <View style={[styles.searchBanner, styles.searchBannerMobile, { backgroundColor: colors.infoSoft, borderColor: colors.blue }]}>
          <Text style={{ color: colors.blue, fontWeight: "800" }}>Mostrando resultados de busqueda avanzada</Text>
          <TouchableOpacity onPress={onExitSearch}>
            <Text style={{ color: colors.blue, fontWeight: "900" }}>Salir</Text>
          </TouchableOpacity>
        </View>
      )}

      {selectedCount > 0 && (
        <View style={[styles.selectionBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.selectionText, { color: colors.text }]}>{selectedCount === 1 ? "1 seleccionado" : `${selectedCount} seleccionados`}</Text>
          <View style={styles.selectionActions}>
            {selectedCount === 1 && selectedTx && (
              <TouchableOpacity style={[styles.selectionBtn, { backgroundColor: colors.editBg, borderColor: colors.editBorder }]} onPress={() => onEdit(selectedTx)}>
                <MaterialCommunityIcons name="pencil" size={18} color={colors.blue} />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={[styles.selectionBtn, { backgroundColor: colors.expenseSoft, borderColor: colors.red }]} onPress={onDeleteSelected}>
              <MaterialCommunityIcons name="trash-can" size={18} color={colors.red} />
            </TouchableOpacity>
          </View>
        </View>
      )}

      <View style={styles.groupedList}>
        {groups.map((group) => (
          <View key={group.key} style={styles.dateGroup}>
            <Text style={[styles.dateGroupLabel, { color: colors.muted }]}>{group.label}</Text>
            <View style={[styles.txGroupCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              {group.items.map((tx, index) => {
                const selected = selectedRows.includes(tx.rowId);
                const icon = tx.amount >= 0 ? "bank-transfer-in" : tx.type === "GASTO FRECUENTE" ? "credit-card-outline" : "basket-outline";
                return (
                  <TouchableOpacity
                    key={`${tx.rowId}-${tx.createdAt}`}
                    onPress={() => onOpenDetail(tx)}
                    onLongPress={() => (selected ? onMove(tx) : onToggleSelection(tx))}
                    style={[
                      styles.groupedTxRow,
                      index > 0 && { borderTopWidth: 1, borderColor: colors.border },
                      tx.type === "GASTO FRECUENTE" && { backgroundColor: colors.freqExpenseRow },
                      selected && { backgroundColor: colors.primarySoft },
                    ]}
                  >
                    <View style={[styles.txIcon, { backgroundColor: selected ? colors.infoSoft : typeFill(tx.type, colors), borderColor: selected ? colors.blue : typeColor(tx.type, colors) }]}>
                      <MaterialCommunityIcons name={selected ? "check" : (icon as MaterialIconName)} size={18} color={selected ? colors.blue : typeColor(tx.type, colors)} />
                    </View>
                    <View style={styles.groupedTxMain}>
                      <HighlightedText
                        text={tx.detail}
                        query={searchActive ? searchText : ""}
                        style={[styles.groupedTxTitle, { color: colors.text }]}
                        highlightStyle={{ color: colors.onPrimary, backgroundColor: colors.primary, borderRadius: 4 }}
                      />
                      <Text numberOfLines={1} style={[styles.groupedTxMeta, { color: colors.muted }]}>
                        {`${abbrev(tx.type)} · ${formatCreatedTime(tx.createdAt).slice(0, 5)}`}
                      </Text>
                    </View>
                    <Text numberOfLines={1} style={[styles.groupedTxAmount, { color: tx.amount >= 0 ? colors.green : colors.red }]}>{formatMoney(tx.amount)}</Text>
                    {selected && <MaterialCommunityIcons name="drag-vertical" size={18} color={colors.muted} />}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}
        {!transactions.length && (
          <View style={[styles.mobileEmptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.empty, { color: colors.muted }]}>No hay movimientos para mostrar.</Text>
          </View>
        )}
        {!searchActive && (
          <TouchableOpacity style={[styles.loadOlderBtn, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={onLoadOlder}>
            <Text style={[styles.loadOlderText, { color: colors.text }]}>CARGAR MOVIMIENTOS ANTERIORES</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
}
