import * as SecureStore from "expo-secure-store";
import { logError } from "@/utils/errorHandler";

export type ConnectedAccount = {
  email: string;
  name?: string;
  lastUsedAt: string;
  spreadsheetId?: string;
  scopesGranted?: boolean;
  accessToken?: string;
};

const CONNECTED_ACCOUNTS_KEY = "bucks_connected_accounts";

function isConnectedAccount(v: unknown): v is ConnectedAccount {
  if (!v || typeof v !== "object") return false;
  const c = v as Partial<ConnectedAccount>;
  return typeof c.email === "string" && c.email.length > 0 && typeof c.lastUsedAt === "string";
}

export async function loadConnectedAccounts(): Promise<ConnectedAccount[]> {
  try {
    const raw = await SecureStore.getItemAsync(CONNECTED_ACCOUNTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isConnectedAccount);
  } catch (e) {
    logError(e, "connectedAccounts:load");
    return [];
  }
}

export async function saveConnectedAccount(account: ConnectedAccount): Promise<void> {
  try {
    const list = await loadConnectedAccounts();
    const idx = list.findIndex((a) => a.email.toLowerCase() === account.email.toLowerCase());
    if (idx >= 0) {
      list[idx] = { ...list[idx], ...account, lastUsedAt: new Date().toISOString() };
    } else {
      list.push({ ...account, lastUsedAt: new Date().toISOString() });
    }
    // Ordena por último uso descendente
    list.sort((a, b) => new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime());
    await SecureStore.setItemAsync(CONNECTED_ACCOUNTS_KEY, JSON.stringify(list));
  } catch (e) {
    logError(e, "connectedAccounts:save");
  }
}

export async function removeConnectedAccount(email: string): Promise<void> {
  try {
    const list = await loadConnectedAccounts();
    const filtered = list.filter((a) => a.email.toLowerCase() !== email.toLowerCase());
    await SecureStore.setItemAsync(CONNECTED_ACCOUNTS_KEY, JSON.stringify(filtered));
  } catch (e) {
    logError(e, "connectedAccounts:remove");
  }
}

export async function clearConnectedAccounts(): Promise<void> {
  try {
    await SecureStore.deleteItemAsync(CONNECTED_ACCOUNTS_KEY);
  } catch (e) {
    logError(e, "connectedAccounts:clear");
  }
}
