import { SHEET_NAMES } from "@/domain/bucksLogic";
import { googleFetch, readValuesUrl, SHEETS } from "./googleFetch";
import { TRANSACTION_TYPES } from "@/domain/bucksLogic";
import type { HistoryEntry, Transaction } from "@/types";

export const HISTORY_HEADER = "HISTORY";
const HISTORY_RANGE = `${SHEET_NAMES.summary}!M1:M2`;

function isHistoryEntry(value: unknown): value is HistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<HistoryEntry>;
  const tx = entry.transaction as Partial<Transaction> | undefined;
  return typeof entry.id === "string"
    && typeof entry.timestamp === "string"
    && entry.action === "delete"
    && !!tx
    && Number.isFinite(tx.rowId)
    && typeof tx.rawDate === "string"
    && !Number.isNaN(Date.parse(tx.rawDate))
    && Number.isFinite(tx.amount)
    && typeof tx.detail === "string"
    && TRANSACTION_TYPES.includes(tx.type as Transaction["type"]);
}

export async function readHistory(
  token: string,
  spreadsheetId: string,
): Promise<HistoryEntry[]> {
  try {
    const data = await googleFetch<{ values?: string[][] }>(
      token,
      readValuesUrl(spreadsheetId, HISTORY_RANGE),
    );
    const header = String(data.values?.[0]?.[0] || "").trim();
    if (header !== HISTORY_HEADER) return [];
    const raw = String(data.values?.[1]?.[0] || "").trim();
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isHistoryEntry);
  } catch {
    return [];
  }
}

export async function writeHistory(
  token: string,
  spreadsheetId: string,
  entries: HistoryEntry[],
): Promise<void> {
  const url = `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(HISTORY_RANGE)}?valueInputOption=USER_ENTERED`;
  await googleFetch(token, url, {
    method: "PUT",
    body: JSON.stringify({
      values: [[HISTORY_HEADER], [JSON.stringify(entries)]],
    }),
  });
}

export const HISTORY_INIT_JSON = "[]";
