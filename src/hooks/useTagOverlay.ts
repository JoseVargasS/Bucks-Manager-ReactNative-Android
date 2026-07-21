import { useCallback, useState } from "react";
import { Keyboard, type View } from "react-native";
import type { Tag, TransactionDraft } from "@/types";
import { DEFAULT_TAG_COLOR, saveTags, slugifyTagLabel } from "@/utils/tags";

export function useTagOverlay({
  tags, onAddTag, setFormDraft, modalRef, tagAddRefs,
}: {
  tags: Tag[];
  onAddTag?: (tag: Tag) => void;
  setFormDraft: (updater: TransactionDraft | ((prev: TransactionDraft) => TransactionDraft)) => void;
  modalRef: React.RefObject<View | null>;
  tagAddRefs: React.MutableRefObject<Record<string, View | null>>;
}) {
  const [tagsOpenFor, setTagsOpenFor] = useState<string | null>(null);
  const [tagsReady, setTagsReady] = useState(false);
  const [showCreateTag, setShowCreateTag] = useState(false);
  const [createTagLabel, setCreateTagLabel] = useState("");
  const [createTagColor, setCreateTagColor] = useState(DEFAULT_TAG_COLOR);
  const [creatingTagFor, setCreatingTagFor] = useState<string | null>(null);

  const [tagsFrame, setTagsFrame] = useState({ left: 0, top: 0, width: 0, maxHeight: 0 });

  const dismissTags = useCallback(() => {
    if (tagsOpenFor) {
      setTagsOpenFor(null);
      setTagsReady(false);
    }
  }, [tagsOpenFor]);

  const openTagsOverlay = useCallback((lineItemId: string) => {
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
        ref.measureInWindow((_x: number, y: number, _w: number, height: number) => {
          if (!modalRef.current) return;
          modalRef.current.measureInWindow((_mx: number, _my: number, modalWidth: number, modalHeight: number) => {
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
  }, [tagsOpenFor, tagAddRefs, modalRef]);

  const handleCreateTag = useCallback(() => {
    const label = createTagLabel.trim();
    if (!label || !creatingTagFor) return;
    const newId = slugifyTagLabel(label);
    const newTag: Tag = { id: newId, label, color: createTagColor };
    saveTags([...tags, newTag]).catch(() => {});
    onAddTag?.(newTag);
    setFormDraft((current) => ({
      ...current,
      lineItems: (current.lineItems || []).map((li) =>
        li.id === creatingTagFor ? { ...li, tags: [...(li.tags || []), newId] } : li,
      ),
    }));
    setShowCreateTag(false);
    setCreatingTagFor(null);
    setCreateTagLabel("");
  }, [createTagLabel, createTagColor, creatingTagFor, tags, onAddTag, setFormDraft]);

  const startCreateTagFlow = useCallback(() => {
    setCreatingTagFor(tagsOpenFor);
    setTagsOpenFor(null);
    setTagsReady(false);
    setShowCreateTag(true);
    setCreateTagLabel("");
  }, [tagsOpenFor]);

  const closeTagOverlay = useCallback(() => {
    setTagsOpenFor(null);
    setTagsReady(false);
  }, []);

  return {
    tagsOpenFor, setTagsOpenFor,
    tagsReady, setTagsReady,
    tagsFrame,
    showCreateTag, setShowCreateTag,
    createTagLabel, setCreateTagLabel,
    createTagColor, setCreateTagColor,
    creatingTagFor, setCreatingTagFor,
    dismissTags, openTagsOverlay, handleCreateTag,
    startCreateTagFlow, closeTagOverlay,
  };
}
