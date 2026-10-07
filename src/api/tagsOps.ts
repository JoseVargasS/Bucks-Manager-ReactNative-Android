import type { Tag } from "@/types";
import { SHEET_NAMES } from "@/domain/bucksLogic";
import { googleFetch, readValuesUrl, SHEETS } from "./googleFetch";
import { parseTags } from "./sheetFormats";
import { TAG_SEPARATOR } from "./sheetRows";

/**
 * Batch version: removes multiple tagIds from all rows in a single GET+POST.
 * Processes all tagIds in one pass over the data, emitting one batchUpdate.
 */
export async function removeTagsFromAllRows(
  token: string,
  spreadsheetId: string,
  tagIds: string[],
) {
  if (!tagIds.length) return;
  const tagIdSet = new Set(tagIds);
  const range = `${SHEET_NAMES.transactions}!F2:G`;
  const data = await googleFetch<{ values?: unknown[][] }>(
    token,
    readValuesUrl(spreadsheetId, range),
  );
  const rows = data.values || [];
  const updates: { range: string; values: string[][] }[] = [];
  rows.forEach((row, index) => {
    const raw = String(row[0] || "").trim();
    const rawJson = String(row[1] || "").trim();
    let tagsChanged = false;
    let lineItemsChanged = false;

    let tags = raw ? parseTags(raw) : [];
    const originalTagsLength = tags.length;
    tags = tags.filter((t) => !tagIdSet.has(t));
    if (tags.length !== originalTagsLength) tagsChanged = true;

    let lineItemsJson = rawJson;
    if (rawJson) {
      try {
        const parsed = JSON.parse(rawJson);
        if (Array.isArray(parsed)) {
          let changed = false;
          const updated = parsed.map((li: Record<string, unknown>) => {
            const rawTags = li.tags;
            if (Array.isArray(rawTags)) {
              const filtered = (rawTags as string[]).filter((t) => !tagIdSet.has(t));
              if (filtered.length !== (rawTags as string[]).length) {
                changed = true;
                return { ...li, tags: filtered };
              }
            }
            return li;
          });
          if (changed) {
            lineItemsJson = JSON.stringify(updated);
            lineItemsChanged = true;
          }
        }
      } catch { /* ignore parse errors */ }
    }

    const values: string[] = [];
    if (tagsChanged) values.push(tags.join(TAG_SEPARATOR));
    if (lineItemsChanged && tagsChanged) {
      updates.push({
        range: `${SHEET_NAMES.transactions}!F${index + 2}:G${index + 2}`,
        values: [[tags.join(TAG_SEPARATOR), lineItemsJson]],
      });
    } else if (tagsChanged) {
      updates.push({
        range: `${SHEET_NAMES.transactions}!F${index + 2}`,
        values: [[tags.join(TAG_SEPARATOR)]],
      });
    } else if (lineItemsChanged) {
      updates.push({
        range: `${SHEET_NAMES.transactions}!G${index + 2}`,
        values: [[lineItemsJson]],
      });
    }
  });
  if (!updates.length) return;
  await googleFetch(
    token,
    `${SHEETS}/${spreadsheetId}/values:batchUpdate`,
    {
      method: "POST",
      body: JSON.stringify({
        valueInputOption: "USER_ENTERED",
        data: updates,
      }),
    },
  );
}

export async function readTagsCatalog(token: string, spreadsheetId: string): Promise<Tag[]> {
  try {
    const range = `${SHEET_NAMES.summary}!K2`;
    const data = await googleFetch<{ values?: string[][] }>(
      token,
      readValuesUrl(spreadsheetId, range),
    );
    const raw = data.values?.[0]?.[0];
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((t: unknown): t is Tag =>
      typeof t === "object" && t !== null && "id" in t && "label" in t && "color" in t,
    );
  } catch {
    return [];
  }
}

export async function writeTagsCatalog(token: string, spreadsheetId: string, tags: Tag[]): Promise<void> {
  const range = `${SHEET_NAMES.summary}!K1:K2`;
  const url = `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(range)}?valueInputOption=USER_ENTERED`;
  await googleFetch(token, url, {
    method: "PUT",
    body: JSON.stringify({ values: [["TAGS CATALOGUE"], [JSON.stringify(tags)]] }),
  });
}
