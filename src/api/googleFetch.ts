const DRIVE = "https://www.googleapis.com/drive/v3";
const SHEETS = "https://sheets.googleapis.com/v4/spreadsheets";
const GOOGLE_SHEET_MIME = "application/vnd.google-apps.spreadsheet";
const MAX_RETRIES = 2;
const RETRY_BASE_MS = 400;

function isTransientError(status: number): boolean {
  return status === 429 || status >= 500;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function googleFetch<T>(
  token: string,
  url: string,
  init: RequestInit = {},
): Promise<T> {
  const method = (init.method || "GET").toUpperCase();
  const isMutation = method !== "GET" && method !== "HEAD";
  const maxAttempts = isMutation ? MAX_RETRIES + 1 : 2;

  let lastError: Error | undefined;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    if (attempt > 0) {
      await sleep(RETRY_BASE_MS * Math.pow(2, attempt - 1));
    }
    try {
      const res = await fetch(url, {
        ...init,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
          ...(init.headers || {}),
        },
      });
      if (!res.ok) {
        const body = await res.text();
        const message = body.trim().startsWith("<")
          ? "Google devolvio una pagina HTML en vez de JSON. Revisa que la URL de la API sea valida."
          : body;
        const err = new Error(`Google API ${res.status}: ${message}`);
        if (!isTransientError(res.status) || attempt === maxAttempts - 1) throw err;
        lastError = err;
        continue;
      }
      return (await res.json()) as T;
    } catch (error) {
      if (error instanceof Error && error.message.startsWith("Google API")) {
        throw error;
      }
      if (attempt === maxAttempts - 1) throw error;
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }
  throw lastError!;
}

function valuesUrl(spreadsheetId: string, range: string) {
  return `${SHEETS}/${spreadsheetId}/values/${encodeURIComponent(range)}`;
}

function readValuesUrl(spreadsheetId: string, range: string) {
  return `${valuesUrl(spreadsheetId, range)}?valueRenderOption=FORMATTED_VALUE&dateTimeRenderOption=FORMATTED_STRING`;
}

function formulaValuesUrl(spreadsheetId: string, range: string) {
  return `${valuesUrl(spreadsheetId, range)}?valueRenderOption=FORMULA&dateTimeRenderOption=FORMATTED_STRING`;
}

export {
  DRIVE,
  SHEETS,
  GOOGLE_SHEET_MIME,
  MAX_RETRIES,
  RETRY_BASE_MS,
  isTransientError,
  sleep,
  googleFetch,
  valuesUrl,
  readValuesUrl,
  formulaValuesUrl,
};
