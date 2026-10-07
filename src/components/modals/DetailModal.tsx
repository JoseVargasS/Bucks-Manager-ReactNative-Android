import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from "react";
import { Animated, BackHandler, ScrollView, StyleSheet, Pressable, View } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { base } from "@/styles/baseStyles";
import { detailStyles } from "@/components/modals/DetailModal.styles";

const styles = { ...base, ...detailStyles };
import { type Palette } from "@/theme/colors";
import { RADIUS } from "@/theme/radii";
import { Z_INDEX_DETAIL } from "@/theme/constants";
import { type MaterialIconName, type Tag, type Transaction } from "@/types";
import { formatMoney } from "@/domain/bucksLogic";
import { formatCreatedTime, typeColor, typeFill, typeLabelFull } from "@/utils/formats";
import { tagTextColor, findTagById } from "@/utils/tags";
import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { Text } from "@/components/ui/AppText";

export type DetailModalHandle = { open: (tx: Transaction) => void; close: () => void };

export const DetailModal = forwardRef<DetailModalHandle, { colors: Palette; currencySymbol: string; copy: UiCopy; tags: Tag[]; onEdit: (tx: Transaction) => void; onDelete: (tx: Transaction) => void }>(function DetailModal({ colors, currencySymbol, copy, tags, onEdit, onDelete }, ref) {
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState<Transaction | null>(null);
  const pendingAction = useRef<(() => void) | null>(null);
  const transition = useModalTransition(visible, 12, 0.985, () => {
    const action = pendingAction.current;
    pendingAction.current = null;
    action?.();
  });
  const close = useCallback(() => setVisible(false), []);
  const amount = current?.amount ?? 0;
  const isIncome = amount >= 0;
  const currentType = current?.type || "GASTO NO FRECUENTE";
  const typeTone = typeColor(currentType, colors);
  const typeBackground = typeFill(currentType, colors);

  useImperativeHandle(ref, () => ({
    open(tx) {
      setCurrent(tx);
      setVisible(true);
    },
    close,
  }), [close]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, visible]);

  if (!transition.modalVisible) return null;

  const isSingleLine = current?.lineItems?.length === 1;
  const singleLineItem = isSingleLine ? current?.lineItems?.[0] : null;
  const firstSectionValue = current?.lineItems
    ? (current.detail.split(":")[0] || "")
    : (current?.detail || "");
  const firstSectionTags = isSingleLine
    ? (singleLineItem?.tags || [])
    : !current?.lineItems?.length
      ? (current?.tags || [])
      : [];
  const showFirstSection = !!firstSectionValue || firstSectionTags.length > 0;
  const showLineItemsSection = !isSingleLine && !!current?.lineItems?.length;

   return (
      <Animated.View
        pointerEvents={transition.modalVisible ? "auto" : "none"}
        accessibilityViewIsModal={visible}
        importantForAccessibility={transition.modalVisible ? "yes" : "no-hide-descendants"}
        style={[StyleSheet.absoluteFill, styles.modalOverlay, { backgroundColor: colors.overlay, zIndex: Z_INDEX_DETAIL, elevation: Z_INDEX_DETAIL }, transition.containerStyle]}
      >
        <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <Pressable style={styles.optionBackdrop} onPress={close} />
        <Animated.View style={[styles.detailModal, { backgroundColor: colors.card }, transition.panelStyle]}>
          <Animated.View style={[transition.contentStyle, { flexShrink: 1 }]}>
          <View style={[styles.recordHeader, { borderBottomWidth: 0 }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="receipt-text" size={20} color={colors.warn} /> {copy.detailTitle}
            </Text>
            <Pressable style={[styles.closeBtn, { backgroundColor: colors.input }]} onPress={close}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </Pressable>
          </View>
          <ScrollView style={styles.detailScroll} contentContainerStyle={styles.detailBody} showsVerticalScrollIndicator={false}>
              <View style={[styles.detailHero, { backgroundColor: colors.input }]}>
                <View style={[styles.detailHeroIcon, { backgroundColor: isIncome ? colors.incomeSoft : colors.expenseSoft }]}>
                  <MaterialCommunityIcons name={isIncome ? "bank-transfer-in" : "receipt-text-outline"} size={24} color={isIncome ? colors.income : colors.expense} />
                </View>
                <View style={styles.detailHeroText}>
                  <View style={{ alignSelf: "flex-start", borderRadius: RADIUS.pill, paddingHorizontal: 9, paddingVertical: 4, backgroundColor: typeBackground }}>
                    <Text style={[styles.detailHeroLabel, { color: typeTone, fontWeight: "700" }]}>{current ? typeLabelFull(current.type, copy) : ""}</Text>
                  </View>
                  <Text numberOfLines={1} style={[styles.detailHeroAmount, { color: isIncome ? colors.income : colors.expense, fontVariant: ["tabular-nums"] }]}>{current ? formatMoney(amount, currencySymbol) : ""}</Text>
                </View>
              </View>
              {showFirstSection && (
                <View style={[styles.detailDescription, { backgroundColor: colors.input }]}>
                  <Text style={[styles.detailSectionLabel, { color: colors.muted }]}>
                    {isSingleLine
                      ? (copy.detail || "Detalle")
                      : current?.lineItems
                        ? (copy.concepto || "Concepto")
                        : copy.detail}
                  </Text>
                  <Text selectable style={[styles.detailDescriptionText, { color: colors.text }]}>
                    {firstSectionValue}
                  </Text>
                  {firstSectionTags.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
                      {firstSectionTags.flatMap((id) => {
                        const tag = findTagById(id, tags);
                        if (!tag) return [];
                        const tagColor = tag.color || colors.muted;
                        const tagLabel = tag.label || id;
                        return (
                          <View key={id} style={{ maxWidth: "100%", borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: tagColor }}>
                            <Text numberOfLines={1} style={{ color: tagTextColor(tagColor, colors), fontSize: 11, fontWeight: "700" }}>{tagLabel}</Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              )}
              {showLineItemsSection && (
                <View style={[styles.detailDescription, { backgroundColor: colors.input }]}>
                  <Text style={[styles.detailSectionLabel, { color: colors.muted }]}>{copy.detail}</Text>
                  {current!.lineItems!.map((li) => (
                    <View key={li.id} style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6, gap: 8 }}>
                      <View style={{ flex: 1 }}>
                        <Text selectable style={[styles.detailDescriptionText, { color: colors.text }]}>{li.description || "—"}</Text>
                        {li.tags.length > 0 && (
                          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                            {li.tags.flatMap((id) => {
                              const tag = findTagById(id, tags);
                              if (!tag) return [];
                              const tagColor = tag.color || colors.muted;
                              const tagLabel = tag.label || id;
                              return (
                                <View key={id} style={{ maxWidth: "100%", borderRadius: RADIUS.sm, paddingHorizontal: 7, paddingVertical: 3, backgroundColor: tagColor }}>
                                  <Text numberOfLines={1} style={{ color: tagTextColor(tagColor, colors), fontSize: 11, fontWeight: "700" }}>{tagLabel}</Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                      <Text style={[styles.detailDescriptionText, { color: li.amount >= 0 ? colors.income : colors.expense, fontVariant: ["tabular-nums"] as never, fontWeight: "600" }]}>
                        {formatMoney(li.amount, currencySymbol)}
                      </Text>
                    </View>
                  ))}
                </View>
              )}
              <View style={styles.detailMetaGrid}>
                <DetailMetaRow icon="calendar" label={copy.date} value={current?.date || ""} tone={colors.info} colors={colors} />
                <DetailMetaRow icon="clock-outline" label={copy.time} value={current ? formatCreatedTime(current.createdAt) : ""} tone={colors.muted} colors={colors} />
              </View>
              <View style={styles.detailActions}>
                <Pressable disabled={!current} style={[styles.detailActionBtn, { backgroundColor: colors.input }]} onPress={() => { if (!current) return; pendingAction.current = () => onEdit(current); close(); }}>
                  <MaterialCommunityIcons name="pencil" size={18} color={colors.info} />
                  <Text style={[styles.detailActionText, { color: colors.info }]}>{copy.edit}</Text>
                </Pressable>
                <Pressable disabled={!current} style={[styles.detailActionBtn, { backgroundColor: colors.input }]} onPress={() => { if (!current) return; pendingAction.current = () => onDelete(current); close(); }}>
                  <MaterialCommunityIcons name="trash-can" size={18} color={colors.expense} />
                  <Text style={[styles.detailActionText, { color: colors.expense }]}>{copy.delete}</Text>
                </Pressable>
              </View>
          </ScrollView>
          </Animated.View>
        </Animated.View>
      </Animated.View>
  );
});

function DetailMetaRow({ icon, label, value, tone, colors }: { icon: MaterialIconName; label: string; value: string; tone: string; colors: Palette }) {
  return (
    <View style={styles.detailMetaItem}>
      <MaterialCommunityIcons name={icon} size={18} color={tone} />
      <View style={styles.detailMetaText}>
        <Text style={[styles.detailMetaLabel, { color: colors.muted }]}>{label}</Text>
        <Text numberOfLines={1} selectable style={[styles.detailMetaValue, { color: colors.text }]}>{value}</Text>
      </View>
    </View>
  );
}
