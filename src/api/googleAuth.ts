import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { GOOGLE_WORKSPACE_SCOPES } from "@/theme/constants";

export async function getWorkspaceAccessToken(interactive: boolean) {
  let current = GoogleSignin.getCurrentUser();
  if (!current) {
    const silent = await GoogleSignin.signInSilently();
    current = silent.type === "success" ? silent.data : null;
  }
  const grantedScopes = new Set(current?.scopes || []);
  const hasWorkspaceScopes = GOOGLE_WORKSPACE_SCOPES.every((scope) =>
    grantedScopes.has(scope),
  );
  if (!hasWorkspaceScopes) {
    if (!interactive) throw new Error("Faltan permisos de Google Workspace.");
    const response = await GoogleSignin.addScopes({
      scopes: GOOGLE_WORKSPACE_SCOPES,
    });
    if (!response || response.type !== "success")
      throw new Error("No se autorizaron los permisos de Drive y Sheets.");
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
