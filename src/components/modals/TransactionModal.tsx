import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react";
import { Alert, Animated, BackHandler, Keyboard, Pressable, ScrollView, StyleSheet, View } from "react-native";
import type { TextInput as NativeTextInput } from "react-native";
import { BlurView } from "expo-blur";
import MaterialCommunityIcons from "@expo/vector-icons/MaterialCommunityIcons";
import { isValidTransactionDraft } from "@/domain/bucksLogic";
import { computeLineItemsTotal, getBlankDraft } from "@/utils/transactions";
import { base } from "@/styles/baseStyles";
import { recordModalStyles } from "@/components/modals/TransactionModal.styles";

const styles = { ...base, ...recordModalStyles };
import { RADIUS } from "@/theme/radii";
import { Z_INDEX_MODAL } from "@/theme/constants";
import { TypeSelector } from "@/components/ui/TypeSelector";
import { CalendarPicker } from "@/components/ui/CalendarPicker";
import { type Palette } from "@/theme/colors";
import { type Transaction, type TransactionDraft, type TransactionType, type Tag } from "@/types";

import { type UiCopy } from "@/i18n";
import { useModalTransition } from "@/components/ui/useModalTransition";
import { useKeyboardOffset } from "@/components/ui/useKeyboardOffset";
import { findTagById, tagTextColor } from "@/utils/tags";
import { NumericKeypad } from "@/components/ui/NumericKeypad";
import { AmountInput } from "@/components/ui/AmountInput";
import { Text, TextInput } from "@/components/ui/AppText";
import { TagOverlay } from "@/components/modals/TagOverlay";
import { CreateTagForm } from "@/components/modals/CreateTagForm";
import { useLineItemsState } from "@/hooks/useLineItemsState";
import { useTagOverlay } from "@/hooks/useTagOverlay";

export type TransactionModalHandle = {
  open: (draft: TransactionDraft, editingTx?: Transaction | null) => void;
};

export const TransactionModal = forwardRef<TransactionModalHandle, {
  colors: Palette; copy: UiCopy; currencySymbol: string; tags: Tag[];
  onSubmit: (draft: TransactionDraft, editingTx: Transaction | null) => boolean;
  onAddTag?: (tag: Tag) => void;
}>(function TransactionModal({ colors, copy, currencySymbol, tags, onSubmit, onAddTag }, ref) {
  const [visible, setVisible] = useState(false);
  const [formDraft, setFormDraft] = useState(getBlankDraft);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [calVisible, setCalVisible] = useState(false);
  const kbHeight = useKeyboardOffset(visible);
  const modalRef = useRef<View>(null);
  const scrollRef = useRef<ScrollView>(null);
  const scrollHostRef = useRef<View>(null);
  const inputRefs = useRef<Record<string, NativeTextInput | null>>({});
  const amountInputRefs = useRef<Record<string, NativeTextInput | null>>({});
  const tagAddRefs = useRef<Record<string, View | null>>({});
  const focusedKey = useRef<string | null>(null);
  const focusHandledRef = useRef(false);
  const submittingRef = useRef(false);
  const pendingSubmit = useRef<{ draft: TransactionDraft; editingTx: Transaction | null } | null>(null);

  const {
    cursors, setCursors,
    activeAmountId, setActiveAmountId,
    activeAmountIdRef,
    validationError, setValidationError,
    lineItems, singleLine,
    setLineItem, addLineItem, removeLineItem, toggleTag,
  } = useLineItemsState(formDraft, setFormDraft, amountInputRefs);
  const {
    tagsOpenFor, setTagsOpenFor,
    tagsReady,
    tagsFrame,
    showCreateTag, setShowCreateTag,
    createTagLabel, setCreateTagLabel,
    createTagColor, setCreateTagColor,
    setCreatingTagFor,
    dismissTags, openTagsOverlay, handleCreateTag,
    startCreateTagFlow, closeTagOverlay,
  } = useTagOverlay({ tags, onAddTag, setFormDraft, modalRef, tagAddRefs });

  const scrollInputIntoView = useCallback((key: string) => {
    requestAnimationFrame(() => {
      const target = inputRefs.current[key];
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
  }, []);

  useEffect(() => {
    if (kbHeight === 0) { focusHandledRef.current = false; return; }
    if (focusHandledRef.current) return;
    const key = focusedKey.current;
    if (!key) return;
    focusHandledRef.current = true;
    scrollInputIntoView(key);
  }, [kbHeight, scrollInputIntoView]);

  const transition = useModalTransition(visible, 14, 0.99, () => {
    const pending = pendingSubmit.current;
    pendingSubmit.current = null;
    if (pending) onSubmit(pending.draft, pending.editingTx);
  });

  const totalState = useMemo(() => {
    const { total, error } = computeLineItemsTotal(lineItems, formDraft.type);
    const sign = total > 0 ? "+ " : total < 0 ? "- " : "";
    const formatted = `${sign}${currencySymbol} ${Math.abs(total).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    return { total, error, formatted };
  }, [currencySymbol, lineItems, formDraft.type]);

  const isExpense = formDraft.type.startsWith("GASTO");
  const totalColor = totalState.error
    ? colors.expense
    : totalState.total > 0 ? colors.income : totalState.total < 0 ? colors.expense : colors.text;

  const handleRemoveLineItem = useCallback((id: string) => {
    removeLineItem(id);
    if (tagsOpenFor === id) closeTagOverlay();
  }, [removeLineItem, tagsOpenFor, closeTagOverlay]);

  const handleToggleTag = useCallback((lineItemId: string, tagId: string) => {
    toggleTag(lineItemId, tagId);
    closeTagOverlay();
    requestAnimationFrame(() => {
      const target = inputRefs.current[`desc-${lineItemId}`];
      if (target && typeof (target as unknown as { focus?: () => void }).focus === "function") {
        (target as unknown as { focus: () => void }).focus();
      }
    });
  }, [toggleTag, closeTagOverlay]);

  const closeTagFlow = useCallback(() => {
    closeTagOverlay();
    setShowCreateTag(false);
    setCreatingTagFor(null);
  }, [closeTagOverlay, setShowCreateTag, setCreatingTagFor]);

  const close = useCallback(() => {
    Keyboard.dismiss();
    setVisible(false);
    setCalVisible(false);
    closeTagOverlay();
    setShowCreateTag(false);
    setCreateTagLabel("");
    setActiveAmountId(null);
    setCursors({});
  }, [closeTagOverlay, setShowCreateTag, setCreateTagLabel, setActiveAmountId, setCursors]);

  useImperativeHandle(ref, () => ({
    open(nextDraft: TransactionDraft, nextEditingTx: Transaction | null = null) {
      setFormDraft(nextDraft);
      setEditingTx(nextEditingTx);
      setCalVisible(false);
      closeTagOverlay();
      setShowCreateTag(false);
      setCreateTagLabel("");
      setActiveAmountId(null);
      setValidationError("");
      submittingRef.current = false;
      setVisible(true);
    },
  }), [closeTagOverlay, setShowCreateTag, setCreateTagLabel, setActiveAmountId, setValidationError]);

  useEffect(() => {
    if (!visible) return;
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (tagsOpenFor || showCreateTag) {
        closeTagFlow();
        return true;
      }
      if (activeAmountIdRef.current !== null) {
        setActiveAmountId(null);
        return true;
      }
      close();
      return true;
    });
    return () => subscription.remove();
  }, [close, visible, activeAmountIdRef, setActiveAmountId, tagsOpenFor, showCreateTag, closeTagFlow]);

  const handleCreateTagWrapper = useCallback(() => {
    handleCreateTag();
  }, [handleCreateTag]);

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
  const availableTags = overlayItem ? tags : [];
  const attachedTagIds = overlayItem ? overlayItem.tags || [] : [];

   return (
      <Animated.View
        pointerEvents={transition.modalVisible ? "auto" : "none"}
        accessibilityViewIsModal={visible}
        importantForAccessibility={transition.modalVisible ? "yes" : "no-hide-descendants"}
        style={[StyleSheet.absoluteFill, styles.modalOverlay, { backgroundColor: colors.overlay, zIndex: Z_INDEX_MODAL, elevation: Z_INDEX_MODAL }, transition.containerStyle]}
      >
        <BlurView intensity={30} tint="dark" style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }} />
        <Pressable
          style={styles.optionBackdrop}
          onPress={() => {
            if (tagsOpenFor || showCreateTag) closeTagFlow();
            else close();
          }}
        />

        <Animated.View ref={modalRef} collapsable={false} style={[styles.recordModal, { backgroundColor: colors.card }, transition.panelStyle]}>
          <Animated.View style={transition.contentStyle}>
          <View style={[styles.recordHeader, { borderColor: colors.border }]}>
            <Text style={[styles.recordTitle, { color: colors.text }]}>
              <MaterialCommunityIcons name="calculator-variant" size={19} color={colors.info} /> {editingTx ? copy.editRecord : copy.newRecord}
            </Text>
            <Pressable style={styles.closeBtn} onPress={close}>
              <MaterialCommunityIcons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>
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
            <Pressable
              style={{ backgroundColor: colors.input, borderColor: colors.border, borderRadius: RADIUS.md, paddingHorizontal: 12, minHeight: 42, flexDirection: "row", alignItems: "center", gap: 10, borderWidth: 1, marginBottom: 12 }}
              onPress={() => { Keyboard.dismiss(); closeTagOverlay(); setCalVisible(true); }}
            >
              <Text style={{ color: colors.text, fontWeight: "600", flex: 1 }}>{formDraft.date || copy.selectDate}</Text>
              <MaterialCommunityIcons name="calendar" size={20} color={colors.info} />
            </Pressable>
            <CalendarPicker visible={calVisible} value={formDraft.date} onSelect={(date: string) => setFormDraft((current) => ({ ...current, date }))} onClose={() => setCalVisible(false)} colors={colors} copy={copy} />
            <Text style={[styles.label, { color: colors.text }]}>{copy.type}</Text>
            <TypeSelector
              value={formDraft.type}
              onSelect={(type: TransactionType) => {
                setTagsOpenFor(null);
                setValidationError("");
                setFormDraft((current) => ({
                  ...current,
                  type,
                  lineItems: type.startsWith("GASTO")
                    ? (current.lineItems || [])
                    : (current.lineItems || []).map((li) => ({ ...li, tags: [] })),
                }));
              }}
              colors={colors}
              copy={copy}
            />
            <Text style={[styles.label, { color: colors.text }]}>{singleLine ? (copy.detail || "Detalle") : (copy.concepto || "Concepto")}</Text>
            <TextInput
              ref={(r) => { inputRefs.current["concepto"] = r; }}
              value={formDraft.concepto}
              onChangeText={(concepto: string) => setFormDraft((current) => ({ ...current, concepto }))}
              onFocus={() => { dismissTags(); focusedKey.current = "concepto"; setActiveAmountId(null); }}
              placeholder={copy.conceptoPlaceholder || "Ej: Supermercado, Almuerzo, Taxi"}
              placeholderTextColor={colors.muted}
              keyboardType="default"
              style={[styles.conceptoInput, { backgroundColor: colors.input, color: colors.text, borderColor: colors.border }]}
            />

            <View style={{ marginTop: 20, marginBottom: 8, flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
              <Text style={[styles.label, { color: colors.text, marginBottom: 0 }]}>
                {copy.amount}
              </Text>
              <Pressable style={{ width: 28, height: 28, borderRadius: RADIUS.xl, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" }} onPress={addLineItem}>
                <MaterialCommunityIcons name="plus" size={16} color={colors.onPrimary} />
              </Pressable>
            </View>

            {lineItems.map((item) => {
              const itemTags = (item.tags || []).flatMap((id) => findTagById(id, tags) ?? []);
              const unusedTags = tags.filter((t) => !itemTags.some((it) => it.id === t.id));
              const cardBorder = item.amount.trim() ? colors.primarySoft : colors.border;
              return (
                <View key={item.id} style={[styles.lineItemCard, { backgroundColor: colors.input, borderColor: cardBorder }]}>
                  <View style={styles.lineItemAmountRow}>
                    <Text style={[styles.lineItemPrefix, { color: colors.text }]}>{currencySymbol}</Text>
                    <AmountInput
                      ref={(r) => { amountInputRefs.current[item.id] = r; }}
                      value={item.amount}
                      placeholder="0.00"
                      colors={colors}
                      cursor={cursors[item.id] ?? item.amount.length}
                      onValueChange={(v) => setLineItem(item.id, { amount: v })}
                      onCursorChange={(pos) => setCursors((prev) => ({ ...prev, [item.id]: pos }))}
                      onFocus={() => { dismissTags(); setActiveAmountId(item.id); }}
                      style={styles.lineItemAmountInput}
                    />
                    {isExpense && tags.length > 0 && (
                      itemTags.length > 0 ? (
                        <Pressable
                          ref={(ref) => { tagAddRefs.current[item.id] = ref; }}
                          style={[styles.selectedTagInlineChip, { backgroundColor: itemTags[0].color }]}
                          onPress={() => openTagsOverlay(item.id)}
                        >
                          <Text style={[styles.selectedTagLabel, { color: tagTextColor(itemTags[0].color, colors) }]} numberOfLines={1}>
                            {itemTags[0].label}
                          </Text>
                          <MaterialCommunityIcons name="chevron-down" size={12} color={tagTextColor(itemTags[0].color, colors)} style={{ opacity: 0.85 }} />
                        </Pressable>
                      ) : unusedTags.length > 0 ? (
                        <Pressable
                          ref={(ref) => { tagAddRefs.current[item.id] = ref; }}
                          style={[styles.addTagInlineBtn, { backgroundColor: colors.input }]}
                          onPress={() => openTagsOverlay(item.id)}
                        >
                          <MaterialCommunityIcons name="tag-plus-outline" size={14} color={colors.muted} />
                          <Text style={[styles.addTagInlineText, { color: colors.muted }]}>Etiqueta</Text>
                        </Pressable>
                      ) : null
                    )}
                    {lineItems.length > 1 && (
                      <Pressable style={[styles.removeLineItemBtn, { backgroundColor: colors.expenseSoft }]} onPress={() => handleRemoveLineItem(item.id)}>
                        <MaterialCommunityIcons name="close" size={18} color={colors.expense} />
                      </Pressable>
                    )}
                  </View>

                  {!singleLine && (
                    <>
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
                    setActiveAmountId(null);
                    focusHandledRef.current = false;
                    scrollInputIntoView(`desc-${item.id}`);
                  }}
                          placeholder="Descripción"
                          placeholderTextColor={colors.muted}
                          keyboardType="default"
                          style={[styles.lineItemDescInput, { color: colors.text }]}
                        />
                      </View>
                    </>
                  )}
                </View>
              );
            })}

            {showCreateTag && (
              <CreateTagForm
                createTagLabel={createTagLabel}
                setCreateTagLabel={setCreateTagLabel}
                createTagColor={createTagColor}
                setCreateTagColor={setCreateTagColor}
                onCreate={handleCreateTagWrapper}
                onCancel={() => { setShowCreateTag(false); setCreatingTagFor(null); }}
                colors={colors}
                copy={copy}
              />
            )}

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
              <Pressable style={[styles.recordCancel, { backgroundColor: colors.input, borderColor: colors.border }]} onPress={close}>
                <MaterialCommunityIcons name="close" size={18} color={colors.text} />
                <Text style={[styles.recordCancelText, { color: colors.text }]}>{copy.cancel}</Text>
              </Pressable>
              <Pressable style={[styles.recordSubmit, { backgroundColor: colors.primary }]} onPress={submit}>
                <MaterialCommunityIcons name="plus" size={20} color={colors.onPrimary} />
                <Text style={[styles.recordSubmitText, { color: colors.onPrimary }]}>{editingTx ? copy.save : copy.add}</Text>
              </Pressable>
            </View>
          </ScrollView>
          </View>
          </Animated.View>

          {tagsOpenFor && tagsReady && !showCreateTag && (
            <View
              style={StyleSheet.absoluteFill}
              onStartShouldSetResponderCapture={() => { closeTagFlow(); return false; }}
            />
          )}

          <NumericKeypad
            visible={activeAmountId !== null}
            value={activeAmountId ? (lineItems.find((li) => li.id === activeAmountId)?.amount ?? "") : ""}
            cursor={activeAmountId ? (cursors[activeAmountId] ?? 0) : 0}
            onChange={(v, c) => {
              if (activeAmountId) {
                setLineItem(activeAmountId, { amount: v });
                setCursors((prev) => ({ ...prev, [activeAmountId!]: c }));
              }
            }}
            onDone={() => setActiveAmountId(null)}
            colors={colors}
          />

          {tagsOpenFor && tagsReady && isExpense && (
            <TagOverlay
              availableTags={availableTags}
              selectedIds={attachedTagIds}
              onToggleTag={(tagId) => handleToggleTag(tagsOpenFor!, tagId)}
              onCreateTagClick={() => {
                startCreateTagFlow();
                requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
              }}
              colors={colors}
              copy={copy}
              frame={tagsFrame}
            />
          )}

        </Animated.View>
      </Animated.View>
  );
});
