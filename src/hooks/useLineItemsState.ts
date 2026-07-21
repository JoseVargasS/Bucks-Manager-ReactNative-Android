import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Keyboard } from "react-native";
import type { TextInput as RNTextInput } from "react-native";
import type { LineItemDraft, TransactionDraft } from "@/types";

function makeLineItemId(index: number): string {
  return `li-${index + 1}`;
}

export function useLineItemsState(
  formDraft: TransactionDraft,
  setFormDraft: (updater: TransactionDraft | ((prev: TransactionDraft) => TransactionDraft)) => void,
  amountInputRefs: React.MutableRefObject<Record<string, RNTextInput | null>>,
) {
  const [cursors, setCursors] = useState<Record<string, number>>({});
  const [activeAmountId, setActiveAmountId] = useState<string | null>(null);
  const activeAmountIdRef = useRef<string | null>(null);
  useEffect(() => { activeAmountIdRef.current = activeAmountId; }, [activeAmountId]);
  const [validationError, setValidationError] = useState("");

  const lineItems = useMemo(() => formDraft.lineItems || [], [formDraft.lineItems]);
  const singleLine = lineItems.length === 1;

  useEffect(() => {
    if (activeAmountId && !lineItems.some((li) => li.id === activeAmountId)) {
      setActiveAmountId(null);
    }
  }, [lineItems, activeAmountId]);

  useEffect(() => {
    if (activeAmountId !== null) Keyboard.dismiss();
  }, [activeAmountId]);

  const setLineItem = useCallback((id: string, patch: Partial<LineItemDraft>) => {
    setValidationError("");
    setFormDraft((current) => ({
      ...current,
      lineItems: (current.lineItems || []).map((li) => (li.id === id ? { ...li, ...patch } : li)),
    }));
  }, [setFormDraft]);

  const addLineItem = useCallback(() => {
    setValidationError("");
    const newId = makeLineItemId((formDraft.lineItems || []).length);
    setFormDraft((current) => {
      const existing = current.lineItems || [];
      let nextLineItems = existing;
      let nextConcepto = current.concepto;
      if (existing.length === 1 && existing[0].description) {
        if (!nextConcepto) nextConcepto = existing[0].description;
        nextLineItems = [{ ...existing[0], description: "" }];
      }
      return {
        ...current,
        concepto: nextConcepto,
        lineItems: [...nextLineItems, { id: newId, amount: "", description: "", tags: [] }],
      };
    });
    setActiveAmountId(newId);
    requestAnimationFrame(() => {
      amountInputRefs.current[newId]?.focus();
      Keyboard.dismiss();
    });
  }, [setFormDraft, formDraft.lineItems, amountInputRefs]);

  const removeLineItem = useCallback((id: string) => {
    setFormDraft((current) => {
      if ((current.lineItems || []).length <= 1) return current;
      const next = (current.lineItems || []).filter((li) => li.id !== id).map((li, i) => ({ ...li, id: makeLineItemId(i) }));
      if (next.length === 1 && next[0].description) {
        return { ...current, concepto: next[0].description, lineItems: [{ ...next[0], description: "" }] };
      }
      return { ...current, lineItems: next };
    });
    setActiveAmountId((current) => (current === id ? null : current));
    setCursors((prev) => {
      if (!(id in prev)) return prev;
      const { [id]: _drop, ...rest } = prev;
      return rest;
    });
  }, [setFormDraft]);

  const toggleTag = useCallback((lineItemId: string, tagId: string) => {
    setFormDraft((current) => {
      const items = current.lineItems || [];
      return {
        ...current,
        lineItems: items.map((li) => {
          if (li.id !== lineItemId) return li;
          const ts = li.tags || [];
          return { ...li, tags: ts.includes(tagId) ? ts.filter((t) => t !== tagId) : [tagId] };
        }),
      };
    });
  }, [setFormDraft]);

  return {
    cursors, setCursors,
    activeAmountId, setActiveAmountId,
    activeAmountIdRef,
    validationError, setValidationError,
    lineItems, singleLine,
    setLineItem, addLineItem, removeLineItem, toggleTag,
  };
}
