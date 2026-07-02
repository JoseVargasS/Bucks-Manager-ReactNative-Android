import type { SheetCandidate } from "@/types";
import { DRIVE, GOOGLE_SHEET_MIME, SHEETS, googleFetch } from "./googleFetch";
import { findHeaderIndex } from "./sheetFormats";
import { SHEET_NAMES } from "@/domain/bucksLogic";
import { SUMMARY_HEADERS, TRANSACTION_HEADERS } from "./sheetInit";

const HEADER_SCAN_ROWS = 12;
const SHEET_SCAN_BATCH_SIZE = 5;

export async function findCompatibleSheets(token: string) {
  const query = encodeURIComponent(
    `mimeType='${GOOGLE_SHEET_MIME}' and trashed=false`,
  );
  const compatible: SheetCandidate[] = [];
  let pageToken: string | undefined;

  do {
    const tokenParam = pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : "";
    const url = `${DRIVE}/files?q=${query}&pageSize=100&orderBy=modifiedTime desc&fields=nextPageToken,files(id,name,modifiedTime)${tokenParam}`;
    const list = await googleFetch<{ files?: SheetCandidate[]; nextPageToken?: string }>(token, url);
    pageToken = list.nextPageToken;
    const files = list.files || [];

    for (let index = 0; index < files.length; index += SHEET_SCAN_BATCH_SIZE) {
      const batch = await Promise.all(
        files.slice(index, index + SHEET_SCAN_BATCH_SIZE).map(async (file) => {
          try {
            return (await validateSpreadsheetStructure(token, file.id))
              ? file
              : null;
          } catch {
            return null;
          }
        }),
      );
      compatible.push(
        ...batch.filter((file): file is SheetCandidate => file !== null),
      );
    }
  } while (pageToken);
  return compatible;
}

async function validateSpreadsheetStructure(
  token: string,
  spreadsheetId: string,
) {
  const meta = await googleFetch<{
    sheets?: { properties?: { title?: string } }[];
  }>(token, `${SHEETS}/${spreadsheetId}?fields=sheets.properties.title`);
  const titles = new Set(
    (meta.sheets || []).map((sheet) => sheet.properties?.title || ""),
  );
  if (!titles.has(SHEET_NAMES.transactions) || !titles.has(SHEET_NAMES.summary))
    return false;

  const ranges = [
    `${SHEET_NAMES.transactions}!A1:F${HEADER_SCAN_ROWS}`,
    `${SHEET_NAMES.summary}!A1:I${HEADER_SCAN_ROWS}`,
  ];
  const url = `${SHEETS}/${spreadsheetId}/values:batchGet?ranges=${ranges.map(encodeURIComponent).join("&ranges=")}`;
  const data = await googleFetch<{ valueRanges: { values?: string[][] }[] }>(
    token,
    url,
  );
  const txHeaderRow = findHeaderIndex(
    data.valueRanges?.[0]?.values || [],
    TRANSACTION_HEADERS.slice(0, 4),
  );
  const summaryHeaderRow = findHeaderIndex(
    data.valueRanges?.[1]?.values || [],
    SUMMARY_HEADERS,
  );
  return txHeaderRow >= 0 && summaryHeaderRow >= 0;
}

export async function isSheetTrashed(
  token: string,
  spreadsheetId: string,
): Promise<boolean> {
  try {
    const data = await googleFetch<{ trashed?: boolean }>(
      token,
      `${DRIVE}/files/${spreadsheetId}?fields=trashed`,
    );
    return data.trashed === true;
  } catch {
    return false;
  }
}
