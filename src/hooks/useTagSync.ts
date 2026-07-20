import { useCallback, useEffect, useRef, useState } from "react";
import { removeTagsFromAllRows } from "@/api/googleWorkspace";
import { loadTags, migrateTransactionTags } from "@/utils/tags";
import type { LanguageMode, Tag, Transaction } from "@/types";

/**
 * Manages tag-loading and tag-cleanup side effects.
 * `tagsList` and `setTagsList` are owned by the caller so they remain
 * available for useFinancialState and useGoogleSync.
 */
export function useTagSyncEffects(
  language: LanguageMode,
  replaceTransactions: React.Dispatch<React.SetStateAction<Transaction[]>>,
  accessToken: string | null,
  spreadsheetId: string | null,
  tagsList: Tag[],
  setTagsList: React.Dispatch<React.SetStateAction<Tag[]>>,
) {
  const [tagEditorVisible, setTagEditorVisible] = useState(false);

  useEffect(() => {
    loadTags(language)
      .then((loaded) => {
        setTagsList(loaded);
        const validIds = new Set(loaded.map((t) => t.id));
        replaceTransactions((current) => {
          const migrated = migrateTransactionTags([...current], loaded);
          return migrated.map((tx) => {
            if (!tx.tags?.length) return tx;
            const cleaned = tx.tags.filter((t) => validIds.has(t));
            return cleaned.length === tx.tags.length
              ? tx
              : { ...tx, tags: cleaned };
          });
        });
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [language, replaceTransactions]);

  const prevTagsListRef = useRef<Tag[]>([]);
  useEffect(() => {
    if (!tagsList.length) return;
    const validIds = new Set(tagsList.map((t) => t.id));
    const prevIds = new Set(prevTagsListRef.current.map((t) => t.id));
    const removedIds = [...prevIds].filter((id) => !validIds.has(id));
    prevTagsListRef.current = tagsList;
    replaceTransactions((current) => {
      let changed = false;
      const next = current.map((tx) => {
        if (!tx.tags?.length) return tx;
        const cleaned = tx.tags.filter((t) => validIds.has(t));
        if (cleaned.length === tx.tags.length) return tx;
        changed = true;
        return { ...tx, tags: cleaned };
      });
      return changed ? next : current;
    });
    if (removedIds.length && accessToken && spreadsheetId) {
      removeTagsFromAllRows(accessToken, spreadsheetId, removedIds).catch(
        () => undefined,
      );
    }
  }, [tagsList, accessToken, spreadsheetId, replaceTransactions]);

  const openTagEditor = useCallback(() => setTagEditorVisible(true), []);
  const closeTagEditor = useCallback(() => setTagEditorVisible(false), []);

  return { tagEditorVisible, openTagEditor, closeTagEditor };
}
