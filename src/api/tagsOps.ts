import type { Tag } from "@/types";
import { SHEET_NAMES } from "@/domain/bucksLogic";
import { googleFetch, readValuesUrl, SHEETS } from "./googleFetch";
import { parseTags } from "./sheetFormats";
import { TAG_SEPARATOR } from "./sheetRows";

export async function removeTagFromAllRows(
  token: string,
  spreadsheetId: string,
  tagId: string,
) {
  const range = `${SHEET_NAMES.transactions}!F2:F`;
  const data = await googleFetch<{ values?: unknown[][] }>(
    token,
    readValuesUrl(spreadsheetId, range),
  );
  const rows = data.values || [];
  const updates: { range: string; values: string[][] }[] = [];
  rows.forEach((row, index) => {
    const raw = String(row[0] || "").trim();
    if (!raw) return;
    const tags = parseTags(raw);
    if (!tags.includes(tagId)) return;
    const cleaned = tags.filter((t) => t !== tagId);
    updates.push({
      range: `${SHEET_NAMES.transactions}!F${index + 2}`,
      values: [[cleaned.join(TAG_SEPARATOR)]],
    });
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
