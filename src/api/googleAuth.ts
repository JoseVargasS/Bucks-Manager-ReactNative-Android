import { GoogleSignin } from "@react-native-google-signin/google-signin";
import Constants from "expo-constants";
import { GOOGLE_WORKSPACE_SCOPES } from "@/theme/constants";
import { loadConnectedAccounts, saveConnectedAccount } from "@/data/connectedAccounts";

// Base config for every GoogleSignin.configure() call: anchors the Cloud
// project explicitly via webClientId so Google need not resolve it from
// package+cert alone. Never carries scopes (those stay incremental via
// addScopes) and stays empty when the ID is missing (dev/tests).
export function googleSigninBaseConfig(): { webClientId?: string } {
  const id = Constants.expoConfig?.extra?.googleWebClientId as string | undefined;
  return id ? { webClientId: id } : {};
}

export async function getWorkspaceAccessToken(interactive: boolean, targetEmail?: string) {
  let current = GoogleSignin.getCurrentUser();
  if (!current) {
    const silent = await GoogleSignin.signInSilently();
    current = silent.type === "success" ? silent.data : null;
  }
  let grantedScopes = new Set(current?.scopes || []);
  let hasWorkspaceScopes = GOOGLE_WORKSPACE_SCOPES.every((scope) =>
    grantedScopes.has(scope),
  );
  // Si el SDK dice que no tiene scopes pero la cuenta ya había concedido, verifica con tokeninfo sin popup
  if (!hasWorkspaceScopes && targetEmail) {
    try {
      const accounts = await loadConnectedAccounts();
      const acc = accounts.find((a) => a.email.toLowerCase() === targetEmail.toLowerCase());
      if (acc?.scopesGranted) {
        const tok = await GoogleSignin.getTokens().catch(() => null) as unknown as { accessToken?: string } | null;
        const accessToken = tok?.accessToken;
        if (accessToken) {
          try {
            const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
            if (res.ok) {
              const data = await res.json() as { scope?: string };
              const tokenScopes = new Set((data.scope || "").split(" ").filter(Boolean));
              if (GOOGLE_WORKSPACE_SCOPES.every((s) => tokenScopes.has(s))) {
                hasWorkspaceScopes = true;
                grantedScopes = tokenScopes;
              }
            }
          } catch (_e) { void _e; }
        }
        // Si el flag dice que ya concedió y el SDK mintió, confía y no pidas popup
        if (hasWorkspaceScopes) {
          return GoogleSignin.getTokens();
        }
      }
    } catch (_e) { void _e; }
  }
  if (!hasWorkspaceScopes) {
    if (!interactive) throw new Error("Faltan permisos de Google Workspace.");
    const response = await GoogleSignin.addScopes({
      scopes: GOOGLE_WORKSPACE_SCOPES,
    });
    if (!response || response.type !== "success")
      throw new Error("No se autorizaron los permisos de Drive y Sheets.");
    if (targetEmail) {
      void saveConnectedAccount({ email: targetEmail, lastUsedAt: new Date().toISOString(), scopesGranted: true });
    } else {
      const info = current as unknown as { user?: { email?: string }; email?: string };
      const email = info?.user?.email || info?.email;
      if (email) void saveConnectedAccount({ email, lastUsedAt: new Date().toISOString(), scopesGranted: true });
    }
  }
  return GoogleSignin.getTokens();
}

// Info del token sin lanzar: null si vencido/sin red. Nunca expone el token,
// solo email + scopes (para diagnóstico redactado y pre-validación).
export async function getTokenInfo(accessToken: string): Promise<{ email?: string; scope?: string } | null> {
  if (!accessToken) return null;
  try {
    const res = await fetch(`https://www.googleapis.com/oauth2/v3/tokeninfo?access_token=${encodeURIComponent(accessToken)}`);
    if (!res.ok) return null;
    return (await res.json()) as { email?: string; scope?: string };
  } catch {
    return null;
  }
}

// true si el token sigue vigente y trae los scopes de Workspace.
// No lanza: cualquier fallo (red, token vencido) es false. Sirve para validar
// el token cacheado antes del fast-path sin tocar la sesión actual.
export async function isTokenAlive(accessToken: string): Promise<boolean> {
  const info = await getTokenInfo(accessToken);
  if (!info) return false;
  const tokenScopes = new Set((info.scope || "").split(" ").filter(Boolean));
  return GOOGLE_WORKSPACE_SCOPES.every((s) => tokenScopes.has(s));
}

// Recovery silencioso sin UI para arranque/foreground: Android cachea el
// access token (~1h de vida) y no lo refresca solo, así que un token muerto
// se limpia con clearCachedAccessToken y se reintenta signInSilently.
// Nunca lanza: null si no se pudo recuperar (sin red, permiso revocado u
// otra cuenta). No toca estado ni persiste nada; el llamador decide.
export async function refreshWorkspaceTokenSilently(
  targetEmail?: string,
  staleToken?: string | null,
): Promise<string | null> {
  try {
    if (staleToken) {
      try {
        await GoogleSignin.clearCachedAccessToken(staleToken);
      } catch (_e) { void _e; }
    }
    const silent = await GoogleSignin.signInSilently();
    if (silent.type !== "success") return null;
    if (targetEmail) {
      const data = silent.data as unknown as { user?: { email?: string }; email?: string };
      const email = (data?.user?.email || data?.email || "").toLowerCase();
      if (email && email !== targetEmail.toLowerCase()) return null;
    }
    const tokens = await GoogleSignin.getTokens().catch(() => null) as unknown as { accessToken?: string } | null;
    const accessToken = tokens?.accessToken || null;
    if (accessToken && (await isTokenAlive(accessToken))) return accessToken;
    return null;
  } catch {
    return null;
  }
}

// Silent dirigido a la cuenta dueña para la rama mismatch del arranque: si
// el SDK quedó parado en otra cuenta, se le indica cuál traer con accountName
// y se reintenta sin UI. Nunca lanza: null si no se pudo. Restaura siempre
// configure() pelado para no contaminar otros flujos. No persiste nada.
export async function refreshOwnerTokenSilently(ownerEmail: string): Promise<string | null> {
  try {
    try {
      GoogleSignin.configure({ ...googleSigninBaseConfig(), accountName: ownerEmail });
    } catch (_e) { void _e; }
    const silent = await GoogleSignin.signInSilently();
    if (silent.type !== "success") return null;
    const data = silent.data as unknown as { user?: { email?: string }; email?: string };
    const email = (data?.user?.email || data?.email || "").toLowerCase();
    if (!email || email !== ownerEmail.toLowerCase()) return null;
    const tokens = await GoogleSignin.getTokens().catch(() => null) as unknown as { accessToken?: string } | null;
    const accessToken = tokens?.accessToken || null;
    if (accessToken && (await isTokenAlive(accessToken))) return accessToken;
    return null;
  } catch {
    return null;
  } finally {
    try {
      GoogleSignin.configure({ ...googleSigninBaseConfig() });
    } catch (_e) { void _e; }
  }
}

export function syncAccountInfo(): {
  name?: string;
  email?: string;
} | null {
  const current = GoogleSignin.getCurrentUser();
  const data = ((
    current as { data?: { user: { name?: string; email?: string } } }
  )?.data || current) as {
    user?: { name?: string; email?: string };
    name?: string;
    email?: string;
  };
  if (!data) return null;
  return {
    name: data.user?.name || data.name,
    email: data.user?.email || data.email,
  };
}
