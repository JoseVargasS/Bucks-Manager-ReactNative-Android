import * as SecureStore from "expo-secure-store";
import type { LanguageMode, Tag, Transaction } from "@/types";
import { dark, type Palette } from "@/theme/colors";
import { logError } from "./errorHandler";

const TAGS_KEY = "bucks_tags";
export const DEFAULT_TAG_COLOR = "#e05070";

export const DEFAULT_TAGS = [
  { id: "default-salud", es: "Salud", en: "Health", color: "#f43f5e" },
  { id: "default-comida", es: "Comida", en: "Food", color: "#f59e0b" },
  { id: "default-viaje", es: "Viaje", en: "Travel", color: "#0ea5e9" },
  { id: "default-transporte", es: "Transporte", en: "Transport", color: "#10b981" },
  { id: "default-ocio", es: "Ocio", en: "Leisure", color: "#8b5cf6" },
  { id: "default-educacion", es: "Educación", en: "Education", color: "#84cc16" },
];

export function slugifyTagLabel(label: string): string {
  const slug = label
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return `custom-${slug}`;
}

function normalizeTags(tags: Tag[]): Tag[] {
  const byLabel = new Map<string, Tag>();
  tags.forEach((tag) => {
    const label = tag.label.trim();
    if (!label) return;
    byLabel.set(label.toLowerCase(), { ...tag, label });
  });
  return Array.from(byLabel.values());
}

/**
 * Translates default tag labels to match the given language.
 * Returns the same array reference when no tags changed.
 */
export function translateDefaultTagLabels(tags: Tag[], language: LanguageMode): Tag[] {
  const lookup = new Map(DEFAULT_TAGS.map((d) => [d.id, d[language]]));
  let changed = false;
  const result = tags.map((tag) => {
    const localized = lookup.get(tag.id);
    if (localized && tag.label !== localized) {
      changed = true;
      return { ...tag, label: localized };
    }
    return tag;
  });
  return changed ? result : tags;
}

function translateDefaults(tags: Tag[], language: LanguageMode): Tag[] {
  return translateDefaultTagLabels(tags, language);
}

export async function loadTags(language: LanguageMode = "es"): Promise<Tag[]> {
  try {
    const raw = await SecureStore.getItemAsync(TAGS_KEY);
    let tags: Tag[];
    if (raw) {
      tags = normalizeTags(JSON.parse(raw));
      const translated = translateDefaults(tags, language);
      if (translated !== tags) await saveTags(translated);
      return translated;
    }
    tags = DEFAULT_TAGS.map((d) => ({ id: d.id, label: d[language], color: d.color }));
    await saveTags(tags);
    return tags;
  } catch (e) {
    logError(e, "tags:loadTags");
    return DEFAULT_TAGS.map((d) => ({ id: d.id, label: d[language], color: d.color }));
  }
}

export async function saveTags(tags: Tag[]): Promise<void> {
  await SecureStore.setItemAsync(TAGS_KEY, JSON.stringify(tags));
}

const DELETED_TAGS_KEY = "bucks_deleted_tags";

// ponytail: ids de tags borrados por el usuario cuyo borrado aún no converge
// al sheet (p. ej. se borró sin internet). El reload filtra estos ids para
// que el catálogo viejo del sheet no los resucite. Se auto-limpian cuando el
// sheet ya no los trae. Solo customs: los defaults los gobierna el sheet.
let deletedTagIdsCache: Set<string> | null = null;

export function getDeletedTagIdsSync(): Set<string> {
  return deletedTagIdsCache ?? new Set();
}

export async function loadDeletedTagIds(): Promise<Set<string>> {
  try {
    const raw = await SecureStore.getItemAsync(DELETED_TAGS_KEY);
    deletedTagIdsCache = new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    if (!deletedTagIdsCache) deletedTagIdsCache = new Set();
  }
  return new Set(deletedTagIdsCache);
}

async function persistDeletedTagIds(): Promise<void> {
  try {
    await SecureStore.setItemAsync(
      DELETED_TAGS_KEY,
      JSON.stringify([...(deletedTagIdsCache ?? [])]),
    );
  } catch {
    // best-effort: el borrado local ya quedó, el sheet converge después
  }
}

export async function addDeletedTagIds(ids: string[]): Promise<void> {
  const custom = ids.filter((id) => id && !id.startsWith("default-"));
  if (!custom.length) return;
  if (!deletedTagIdsCache) await loadDeletedTagIds();
  let changed = false;
  for (const id of custom) {
    if (!deletedTagIdsCache!.has(id)) {
      deletedTagIdsCache!.add(id);
      changed = true;
    }
  }
  if (changed) await persistDeletedTagIds();
}

export async function clearDeletedTagIds(ids: string[]): Promise<void> {
  if (!deletedTagIdsCache?.size) return;
  let changed = false;
  for (const id of ids) {
    if (deletedTagIdsCache.delete(id)) changed = true;
  }
  if (changed) await persistDeletedTagIds();
}

/** Saca del merge los ids con borrado pendiente (el sheet aún trae el viejo). */
export function applyTagTombstones(tags: Tag[], tombstoned: Set<string>): Tag[] {
  if (!tombstoned.size) return tags;
  return tags.filter((t) => !tombstoned.has(t.id));
}

/** true si otro tag ya usa ese label (bloquea renombres duplicados). */
export function isDuplicateTagLabel(tags: Tag[], editingId: string, label: string): boolean {
  const key = label.trim().toLocaleLowerCase();
  if (!key) return false;
  return tags.some(
    (t) => t.id !== editingId && t.label.trim().toLocaleLowerCase() === key,
  );
}

export function abbreviateTag(label: string): string {
  if (label.length <= 6) return label;
  return label.slice(0, 5) + ".";
}

export function tagTextColor(color: string, palette?: Palette): string {
  const darkText = palette?.tagTextDark ?? dark.tagTextDark;
  const lightText = palette?.tagTextLight ?? dark.tagTextLight;
  const hex = color.replace("#", "");
  if (hex.length !== 6) return lightText;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150 ? darkText : lightText;
}

export function findTagById(id: string, tagsList: Tag[]): Tag | undefined {
  return tagsList.find((tag) => tag.id === id);
}

export function labelForTagId(id: string, tagsList: Tag[]): string {
  const byId = findTagById(id, tagsList);
  if (byId) return byId.label;
  if (id.startsWith("custom-")) {
    return id.slice(7).replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
  return id;
}

export function migrateTagReferences(
  refs: string[],
  tagsList: Tag[],
): string[] {
  if (!refs?.length) return refs ?? [];
  if (!tagsList.length) return [...refs];
  const byId = new Map(tagsList.map((tag) => [tag.id, tag]));
  const byLabel = new Map<string, Tag>();
  tagsList.forEach((tag) => byLabel.set(tag.label.trim().toLowerCase(), tag));
  DEFAULT_TAGS.forEach((defaultTag) => {
    const existing = byId.get(defaultTag.id);
    const fallbackLabel = existing?.label ?? defaultTag.es;
    const fallbackColor = existing?.color ?? defaultTag.color;
    byLabel.set(defaultTag.es.toLowerCase(), { id: defaultTag.id, label: fallbackLabel, color: fallbackColor });
    byLabel.set(defaultTag.en.toLowerCase(), { id: defaultTag.id, label: fallbackLabel, color: fallbackColor });
  });
  const seen = new Set<string>();
  const migrated: string[] = [];
  refs.forEach((ref) => {
    if (!ref) return;
    const exactById = byId.get(ref);
    if (exactById) {
      if (!seen.has(exactById.id)) {
        seen.add(exactById.id);
        migrated.push(exactById.id);
      }
      return;
    }
    const byLowerLabel = byLabel.get(ref.trim().toLowerCase());
    if (byLowerLabel) {
      if (!seen.has(byLowerLabel.id)) {
        seen.add(byLowerLabel.id);
        migrated.push(byLowerLabel.id);
      }
      return;
    }
    const orphanId = slugifyTagLabel(ref);
    if (!seen.has(orphanId)) {
      seen.add(orphanId);
      migrated.push(orphanId);
    }
  });
  return migrated;
}

export function mergeTagsFromSheet(
  currentTags: Tag[],
  sheetTags: Tag[],
  transactions: Transaction[],
  tagColors: string[],
  language: LanguageMode = "es",
): Tag[] {
  // When the sheet has tags, it is the source of truth for which tags exist.
  // Start from sheetTags instead of currentTags so deleted tags stay deleted.
  if (!sheetTags.length && !transactions.some((t) => t.tags?.length)) {
    return currentTags;
  }
  const byId = new Map<string, Tag>();
  if (sheetTags.length) {
    for (const st of sheetTags) byId.set(st.id, st);
  }
  // Add local tags not in sheet — only custom tags, never defaults.
  // Default tags are always sourced from the sheet; if the user deleted one
  // it stays deleted. Custom tags may exist locally before the next sync.
  for (const ct of currentTags) {
    if (!byId.has(ct.id) && !ct.id.startsWith("default-")) byId.set(ct.id, ct);
  }
  const existingIds = new Set(Array.from(byId.keys()));
  let colorIdx = 0;
  const added: Tag[] = [];
  for (const t of transactions) {
    if (!t.tags) continue;
    for (const tagId of t.tags) {
      if (tagId && !existingIds.has(tagId)) {
        existingIds.add(tagId);
        if (tagId.startsWith("custom-")) {
          added.push({
            id: tagId,
            label: labelForTagId(tagId, currentTags),
            color: tagColors[colorIdx % tagColors.length],
          });
          colorIdx++;
        } else {
          // Default tag referenced by a transaction but missing from sheet
          // catalogue — restore it from DEFAULT_TAGS.
          const dt = DEFAULT_TAGS.find((d) => d.id === tagId);
          if (dt) {
            byId.set(dt.id, { id: dt.id, label: dt[language], color: dt.color });
          }
        }
      }
    }
  }
  let result = added.length ? [...Array.from(byId.values()), ...added] : Array.from(byId.values());
  // Translate default tag labels to the current language.
  result = translateDefaultTagLabels(result, language);
  // Preserve referential stability when nothing changed.
  if (result.length === currentTags.length && result.every((t, i) => t === currentTags[i])) {
    return currentTags;
  }
  return result;
}

export function migrateTransactionTags(transactions: Transaction[], tagsList: Tag[]): Transaction[] {
  if (!transactions.length || !tagsList.length) return transactions;
  let changed = false;
  const next = transactions.map((tx) => {
    let txChanged = false;
    let migratedTags: string[] | undefined;
    if (tx.tags?.length) {
      migratedTags = migrateTagReferences(tx.tags, tagsList);
      const isSameTags =
        migratedTags.length === tx.tags.length
        && migratedTags.every((id, index) => id === tx.tags![index]);
      if (!isSameTags) txChanged = true;
    }

    let migratedLineItems = tx.lineItems;
    if (tx.lineItems?.length) {
      let liChanged = false;
      migratedLineItems = tx.lineItems.map((li) => {
        if (!li.tags?.length) return li;
        const migrated = migrateTagReferences(li.tags, tagsList);
        const isSame =
          migrated.length === li.tags.length
          && migrated.every((id, index) => id === li.tags[index]);
        if (isSame) return li;
        liChanged = true;
        return { ...li, tags: migrated };
      });
      if (liChanged) txChanged = true;
    }

    if (txChanged) {
      changed = true;
      return { ...tx, ...(migratedTags && { tags: migratedTags }), ...(migratedLineItems && { lineItems: migratedLineItems }) };
    }
    return tx;
  });
  return changed ? next : transactions;
}
