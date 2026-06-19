import * as FileSystem from "expo-file-system/legacy";

import { SummaryRow, Transaction } from "../types";

const CACHE_VERSION = 1;
const CACHE_FILE = `${FileSystem.documentDirectory || FileSystem.cacheDirectory}bucks-finance-cache.json`;

export type FinancialCache = {
  schemaVersion: typeof CACHE_VERSION;
  spreadsheetId: string;
  lastSyncedAt: string | null;
  transactions: Transaction[];
  summaries: SummaryRow[];
  freqIncome: Record<string, number>;
};

export async function loadFinancialCache(spreadsheetId: string) {
  try {
    const info = await FileSystem.getInfoAsync(CACHE_FILE);
    if (!info.exists) return null;
    const parsed = JSON.parse(await FileSystem.readAsStringAsync(CACHE_FILE)) as unknown;
    if (!isCache(parsed) || parsed.spreadsheetId !== spreadsheetId) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function saveFinancialCache(cache: Omit<FinancialCache, "schemaVersion">) {
  await FileSystem.writeAsStringAsync(CACHE_FILE, JSON.stringify({ ...cache, schemaVersion: CACHE_VERSION }));
}

export async function deleteFinancialCache() {
  await FileSystem.deleteAsync(CACHE_FILE, { idempotent: true });
}

function isCache(value: unknown): value is FinancialCache {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<FinancialCache>;
  return candidate.schemaVersion === CACHE_VERSION
    && typeof candidate.spreadsheetId === "string"
    && Array.isArray(candidate.transactions)
    && Array.isArray(candidate.summaries)
    && isNumberMap(candidate.freqIncome);
}

function isNumberMap(value: unknown): value is Record<string, number> {
  return !!value
    && typeof value === "object"
    && Object.values(value).every((item) => typeof item === "number" && Number.isFinite(item));
}
