import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, Animated, BackHandler, Keyboard, ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { isValidTransactionDraft, TRANSACTION_TYPES } from "@/domain/bucksLogic";
import { computeLineItemsTotal, getBlankDraft } from "@/utils/transactions";
import { base } from "@/styles/baseStyles";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";

const styles = { ...base, ...recordModalStyles };
import { Z_INDEX_MODAL } from "@/theme/constants";
import { Select } from "@/components/ui/Select";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { type Palette } from "@/theme/colors";
import { type LineItemDraft, type Transaction, type TransactionDraft, type TransactionType, type Tag } from "@/types";
import { typeColor, typeFill, typeLabelFull } from "@/utils/formats";
import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { useKeyboardOffset } from "@/components/ui/useKeyboardOffset";
import { findTagById } from "@/utils/tags";
import { Text, TextInput } from "@/components/ui/AppText";

export type TransactionModalHandle = {
  open: (draft: TransactionDraft, editingTx?: Transaction | null) => void;
};

function makeLineItemId(index: number): string {
  return `li-${index + 1}`;
}

function tagTextTone(tagColor: string): string {
  const hex = tagColor.replace("#", "");
  if (hex.length !== 6) return "#FFFFFF";
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? "#1A1A2E" : "#FFFFFF";
}

export const TransactionModal = forwardRef<TransactionModalHandle, {
  colors: Palette;
  copy: UiCopy; currencySymbol: string; tags: Tag[];
  onSubmit: (draft: TransactionDraft, editingTx: Transaction | null) => boolean;
}>(function TransactionModal({ colors, copy, currencySymbol, tags, onSubmit }, ref) {
  const [visible, setVisible] = useState(false);
  const [formDraft, setFormDraft] = useState(getBlankDraft);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [calVisible, setCalVisible] = useState(false);
  const [tagsOpenFor, setTagsOpenFor] = useState<string | null>(null);
  const [tagsFrame, setTagsFrame] = useState({ left: 0, top: 0, width: 0, maxHeight: 0 });
  const [tagsReady, setTagsReady] = useState(false);
  const kbHeight = useKeyboardOffset(visible);
  const [validationError, setValidationError] = useState("");
  const modalRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollHostRef = useRef<View>(null);
  const tagAddRefs = useRef<Record<string, View | null>>({});
  const inputRefs = useRef<Record<string, View | null>>({});
  const focusedKey = useRef<string | null>(null);
  const focusHandledRef = useRef(false);

  useEffect(() => {
    if (kbHeight === 0) { focusHandledRef.current = false; return; }
    if (focusHandledRef.current) return;
    const key = focusedKey.current;
    if (!key) return;
    const target = inputRefs.current[key];
    const host = scrollHostRef.current;
    if (!target || !host) return;
    focusHandledRef.current = true;
    requestAnimationFrame(() => {
      try {
        target.measureLayout(
          host,
          (_x: number, y: number) => {
            scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
          },
          () => {
            target.measure((_x, y) => {
              scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
            });
          },
        );
      } catch {
        target.measure((_x, y) => {
          scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
        });
      }
    });
  }, [kbHeight]);
  const submittingRef = useRef(false);
  const pendingSubmit = useRef<{ draft: TransactionDraft; editingTx: Transaction | null } | null>(null);
  const transition = useModalTransition(visible, 14, 0.99, () => {
    const pending = pendingSubmit.current;
    pendingSubmit.current = null;
    if (pending) onSubmit(pending.draft, pending.editingTx);
  });

  const lineItems = useMemo(() => formDraft.lineItems || [], [formDraft.lineItems]);
  const totalState = useMemo(() => {
    const { total, error } = computeLineItemsTotal(lineItems);
    const sign = total > 0 ? "+ " : total < 0 ? "- " : "";
    const formatted = `${sign}${currencySymbol} ${Math.abs(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return { total, error, formatted };
  }, [currencySymbol, lineItems]);

  const typeOptions = useMemo(() => TRANSACTION_TYPES.map((type) => ({
    label: typeLabelFull(type, copy), value: type, color: typeColor(type, colors), softBg: typeFill(type, colors),
  })), [colors, copy]);

  const isExpense = formDraft.type.startsWith("GASTO");
  const totalColor = totalState.error
    ? colors.expense
    : totalState.total > 0 ? colors.income : totalState.total < 0 ? colors.expense : colors.text;

  const close = useCallback(() => {
    Keyboard.dismiss();
    setVisible(false);
    setCalVisible(false);
    setTagsOpenFor(null);
    setTagsReady(false);
  }, []);

  useImperativeHandle(ref, () => ({
    open(nextDraft, nextEditingTx = null) {
      setFormDraft(nextDraft);
      setEditingTx(nextEditingTx);
      setCalVisible(false);
      setTagsOpenFor(null);
      setTagsReady(false);
      setValidationError("");
      submittingRef.current = false;
      setVisible(true);
    },
  }), []);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, visible]);

  const dismissTags = useCallback(() => {
    if (tagsOpenFor) {
      setTagsOpenFor(null);
      setTagsReady(false);
    }
  }, [tagsOpenFor]);

  function openTagsOverlay(lineItemId: string) {
    Keyboard.dismiss();
    if (tagsOpenFor === lineItemId) {
      setTagsOpenFor(null);
      setTagsReady(false);
      return;
    }
    setTagsReady(false);
    setTagsOpenFor(lineItemId);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        const ref = tagAddRefs.current[lineItemId];
        if (!ref) return;
        ref.measureInWindow((_x, y, _w, height) => {
          if (!modalRef.current) return;
          modalRef.current.measureInWindow((_mx, _my, modalWidth, modalHeight) => {
            const maxH = Math.min(200, Math.max(100, modalHeight - 100));
            const below = y - _my + height + 4;
            const top = below + maxH <= modalHeight - 10 ? below : Math.max(70, y - _my - maxH - 4);
            setTagsFrame({
              left: 14,
              top,
              width: Math.min(modalWidth - 28, 310),
              maxHeight: Math.min(maxH, modalHeight - top - 8),
            });
            setTagsReady(true);
          });
        });
      });
    });
  }

  function setLineItem(id: string, patch: Partial<LineItemDraft>) {
    setValidationError("");
    setFormDraft((current) => ({
      ...current,
      lineItems: (current.lineItems || []).map((li) => (li.id === id ? { ...li, ...patch } : li)),
    }));
  }

  function addLineItem() {
    setValidationError("");
    setFormDraft((current) => ({
      ...current,
      lineItems: [...(current.lineItems || []), { id: makeLineItemId((current.lineItems || []).length), amount: "", description: "", tags: [] }],
    }));
  }

  function removeLineItem(id: string) {
    setFormDraft((current) => {
      if ((current.lineItems || []).length <= 1) return current;
      const next = (current.lineItems || []).filter((li) => li.id !== id).map((li, i) => ({ ...li, id: makeLineItemId(i) }));
      return { ...current, lineItems: next };
    });
    if (tagsOpenFor === id) { setTagsOpenFor(null); setTagsReady(false); }
  }

  function toggleTag(lineItemId: string, tagId: string) {
    setFormDraft((current) => {
      const currentItems = current.lineItems || [];
      return {
        ...current,
        lineItems: currentItems.map((li) => {
          if (li.id !== lineItemId) return li;
          const ts = li.tags || [];
          return { ...li, tags: ts.includes(tagId) ? ts.filter((t) => t !== tagId) : [tagId] };
        }),
      };
    });
    setTagsOpenFor(null);
    setTagsReady(false);
  }

  function submit() {
    if (submittingRef.current) return;
    if (!formDraft.date) {
      Alert.alert(copy.incompleteData, copy.completeRequired);
      return;
    }
    const items = formDraft.lineItems || [];
    const hasAmount = items.some((li) => li.amount.trim());
    if (!hasAmount) {
      Alert.alert(copy.incompleteData, copy.completeRequired);
      return;
    }
    if (!isValidTransactionDraft(formDraft)) {
      setValidationError(copy.invalidAmount);
      return;
    }
    setValidationError("");
    submittingRef.current = true;
    pendingSubmit.current = { draft: { ...formDraft }, editingTx };
    close();
  }

  if (!transition.modalVisible) return null;

  const overlayItem = tagsOpenFor ? lineItems.find((li) => li.id === tagsOpenFor) : null;
  const availableTags = overlayItem
    ? tags.filter((t) => !(overlayItem.tags || []).includes(t.id))
    : [];

  return (
      <Animated.View
        pointerEvents={transition.modalVisible ? "auto" : "none"}
        accessibilityViewIsModal={visible}
        importantForAccessibility={transition.modalVisible ? "yes" : "no-hide-descendants"}
        style={[StyleSheet.absoluteFill, styles.modalOverlay, { backgroundColor: colors.overlay, zIndex: Z_INDEX_MODAL, elevation: Z_INDEX_MODAL }, transition.containerStyle]}
      >
        <TouchableOpacity style={styles.optionBackdrop} activeOpacity={1} onPress={close} />

        <Animated.View ref={modalRef} collapsable={false} style={[styles.recordModal, { backgroundColor: colors.card }, transition.panelStyle]}>
          <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="calculator-variant" size={19} color={colors.info} /> {editingTx ? copy.editRecord : copy.newRecord}
            </Text>
            <TouchableOpacity style={[styles.closeBtn, { backgroundColor: colors.input }]} onPress={close}>
              <MaterialCommunityIcons name="close" size={22} color={colors.text} />
            </TouchableOpacity>
          </View>
          {tagsOpenFor && tagsReady && (
            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponderCapture={() => { dismissTags(); return false; }}
            />
          )}
          <View ref={scrollHostRef} collapsable={false} style={styles.recordScroll}>
          <ScrollView
            ref={scrollRef}
            style={styles.recordScroll}
            contentContainerStyle={[styles.recordBody, { paddingBottom: kbHeight + 20 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="none"
            onScrollBeginDrag={dismissTags}
          >
            <Text style={[styles.label, { color: colors.text }]}>{copy.date}</Text>
            <TouchableOpacity
              style={[{ backgroundColor: colors.input, borderColor: colors.border, borderRadius: 10, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, marginBottom: 12 }]}
              onPress={() => { Keyboard.dismiss(); setTagsOpenFor(null); setCalVisible(true); }}
            >
              <Text style={[{ color: colors.text, fontWeight: "600", flex: 1 }]}>{formDraft.date || copy.selectDate}</Text>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.info} />
            </TouchableOpacity>
            <CalendarPicker visible={calVisible} value={formDraft.date} onSelect={(date: string) => setFormDraft((current) => ({ ...current, date }))} onClose={() => setCalVisible(false)} colors={colors} copy={copy} />
            <Text style={[styles.label, { color: colors.text }]}>{copy.type}</Text>
            <Select
              value={formDraft.type}
              options={typeOptions}
              onSelect={(type: string) => {
                setTagsOpenFor(null);
                setValidationError("");
                setFormDraft((current) => ({
                  ...current,
                  type: type as TransactionType,
                  lineItems: type.startsWith("GASTO")
                    ? (current.lineItems || [])
                    : (current.lineItems || []).map((li) => ({ ...li, tags: [] })),
                }));
              }}
              colors={colors}
              placeholder={copy.selectType}
              style={{ marginBottom: 18 }}
            />
            <Text style={[styles.label, { color: colors.text }]}>{copy.concepto || "Concepto"}</Text>
            <TextInput
              ref={(r) => { inputRefs.current["concepto"] = r; }}
              value={formDraft.concepto}
              onChangeText={(concepto: string) => setFormDraft((current) => ({ ...current, concepto }))}
              onFocus={() => { dismissTags(); focusedKey.current = "concepto"; }}
              placeholder={copy.conceptoPlaceholder || "Ej: Supermercado, Almuerzo, Taxi"}
              placeholderTextColor={colors.muted}
              style={[styles.conceptoInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            />

            <View style={{ marginTop: 20, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
                {copy.amount} <Text style={{ color: colors.muted, fontSize: 13 }}>({copy.amountHelp})</Text>
              </Text>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.muted }}>Líneas</Text>
                <View style={{ paddingHorizontal: 7, paddingVertical: 2, borderRadius: 8, backgroundColor: colors.primarySoft }}>
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>{lineItems.length}</Text>
                </View>
              </View>
            </View>

            {lineItems.map((item) => {
              const itemTags = (item.tags || []).map((id) => findTagById(id, tags)).filter(Boolean) as Tag[];
              const unusedTags = tags.filter((t) => !itemTags.some((it) => it.id === t.id));
              const cardBorder = itemTags.length > 0
                ? (itemTags[0]?.color ?? colors.border)
                : (item.amount.trim() ? colors.primarySoft : colors.border);
              return (
                <View key={item.id} style={[styles.lineItemCard, { backgroundColor: colors.input, borderColor: cardBorder }]}>
                  <View style={styles.lineItemAmountRow}>
                    <Text style={[styles.lineItemPrefix, { color: colors.text }]}>{currencySymbol}</Text>
                    <TextInput
                      ref={(r) => { inputRefs.current[`amount-${item.id}`] = r; }}
                      value={item.amount}
                      onChangeText={(amount: string) => setLineItem(item.id, { amount })}
                      onFocus={() => { dismissTags(); focusedKey.current = `amount-${item.id}`; }}
                      placeholder={isExpense ? "-0.00" : "0.00"}
                      placeholderTextColor={colors.muted}
                      keyboardType="decimal-pad"
                      inputMode="decimal"
                      style={[styles.lineItemAmountInput, { color: colors.text }]}
                    />
                    {isExpense && tags.length > 0 && (
                      itemTags.length > 0 ? (
                        <TouchableOpacity
                          ref={(ref) => { tagAddRefs.current[item.id] = ref; }}
                          style={[styles.selectedTagInlineChip, { backgroundColor: itemTags[0].color }]}
                          onPress={() => openTagsOverlay(item.id)}
                        >
                          <Text style={[styles.selectedTagLabel, { color: tagTextTone(itemTags[0].color) }]} numberOfLines={1}>
                            {itemTags[0].label}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={12} color={tagTextTone(itemTags[0].color)} style={{ opacity: 0.85 }} />
                        </TouchableOpacity>
                      ) : unusedTags.length > 0 ? (
                        <TouchableOpacity
                          ref={(ref) => { tagAddRefs.current[item.id] = ref; }}
                          style={[styles.addTagInlineBtn, { borderColor: colors.muted }]}
                          onPress={() => openTagsOverlay(item.id)}
                        >
                          <MaterialCommunityIcons name="tag-plus-outline" size={14} color={colors.muted} />
                          <Text style={[styles.addTagInlineText, { color: colors.muted }]}>Etiqueta</Text>
                        </TouchableOpacity>
                      ) : null
                    )}
                    {lineItems.length > 1 && (
                      <TouchableOpacity style={[styles.removeLineItemBtn, { backgroundColor: colors.expenseSoft }]} onPress={() => removeLineItem(item.id)}>
                        <MaterialCommunityIcons name="close" size={18} color={colors.expense} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <View style={[styles.lineItemDivider, { backgroundColor: cardBorder }]} />
                  <View style={styles.lineItemDescRow}>
                    <MaterialCommunityIcons name="text-short" size={16} color={colors.muted} style={styles.lineItemDescIcon} />
                    <TextInput
                      ref={(r) => { inputRefs.current[`desc-${item.id}`] = r; }}
                      value={item.description}
                      onChangeText={(description: string) => setLineItem(item.id, { description })}
                      onFocus={() => {
                dismissTags();
                focusedKey.current = `desc-${item.id}`;
                focusHandledRef.current = false;
                requestAnimationFrame(() => {
                  const target = inputRefs.current[`desc-${item.id}`];
                  const host = scrollHostRef.current;
                  if (!target || !host) return;
                  try {
                    target.measureLayout(
                      host,
                      (_x: number, y: number) => {
                        scrollRef.current?.scrollTo({ y: Math.max(0, y - 24), animated: true });
                      },
                      () => undefined,
                    );
                  } catch {
                    // ignore
                  }
                });
              }}
                      placeholder="Descripción"
                      placeholderTextColor={colors.muted}
                      style={[styles.lineItemDescInput, { color: colors.text }]}
                    />
                  </View>
                </View>
              );
            })}

            <TouchableOpacity
              style={[styles.addLineItemBtn, { borderColor: colors.muted }]}
              onPress={addLineItem}
            >
              <MaterialCommunityIcons name="plus-circle-outline" size={20} color={colors.muted} />
              <Text style={[styles.addLineItemText, { color: colors.muted }]}>Agregar monto</Text>
            </TouchableOpacity>

            {!!validationError && (
              <Text style={{ color: colors.expense, fontSize: 12, fontWeight: "600", marginTop: 6, marginBottom: 4 }}>
                {validationError}
              </Text>
            )}

            <View style={[styles.lineItemsTotal, { borderColor: colors.border }]}>
              <Text style={[styles.lineItemsTotalLabel, { color: colors.text }]}>Total</Text>
              <Text style={[styles.lineItemsTotalValue, { color: totalColor, fontVariant: ["tabular-nums"] as never }]}>
                {totalState.error ? "—" : totalState.formatted}
              </Text>
            </View>

            <View style={styles.recordActions}>
              <TouchableOpacity style={[styles.recordCancel, { backgroundColor: colors.input, borderColor: colors.border }]} onPress={close}>
                <MaterialCommunityIcons name="close" size={18} color={colors.text} />
                <Text style={[styles.recordCancelText, { color: colors.text }]}>{copy.cancel}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.recordSubmit, { backgroundColor: colors.primary }]} onPress={submit}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
                <Text style={[styles.recordSubmitText, { color: colors.onPrimary }]}>{editingTx ? copy.save : copy.add}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
          </View>

          {tagsOpenFor && tagsReady && isExpense && availableTags.length > 0 && (
            <View style={[styles.tagsOverlay, { left: tagsFrame.left, top: tagsFrame.top, width: tagsFrame.width, maxHeight: tagsFrame.maxHeight, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, borderRadius: 10, overflow: "hidden" }]}>
              <ScrollView contentContainerStyle={{ padding: 8, flexDirection: "row", flexWrap: "wrap", gap: 8 }} keyboardShouldPersistTaps="always" showsVerticalScrollIndicator={false}>
                {availableTags.map((tag) => (
                  <TouchableOpacity
                    key={tag.id}
                    style={[styles.selectOptionRow, { width: "48%", backgroundColor: colors.input }]}
                    onPress={() => toggleTag(tagsOpenFor!, tag.id)}
                  >
                    <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: tag.color }} />
                    <Text numberOfLines={1} style={[styles.selectOptionLabel, { color: colors.text }]}>{tag.label}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

        </Animated.View>
      </Animated.View>
  );
});
