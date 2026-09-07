import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GOOGLE_WORKSPACE_SCOPES } from "@/theme/constants";
import { loadConnectedAccounts, saveConnectedAccount } from "@/data/connectedAccounts";

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
