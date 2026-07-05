import { type LineItem, type SummaryRow, type Transaction, type TransactionDraft } from "@/types";
import {
  buildTransactionFromDraft,
  formatDateForSheet,
  formatDateToISO,
  getMonthYear,
  parseCreatedAtMs,
  SHEET_NAMES,
} from "@/domain/bucksLogic";
import {
  findHeaderIndex,
  isTagHeader,
  normalizeType,
  parseCreatedAt,
  parseNumber,
  parseSheetDate,
  parseTags,
} from "./sheetFormats";
import { googleFetch, readValuesUrl, formulaValuesUrl, valuesUrl, SHEETS } from "./googleFetch";

import {
  getTransactionSheetId,
  getSheetIdByName,
  insertBlankRow,
  deleteSheetRow,
  getSpreadsheetLocale,
  buildSummaryRowFormulas,
  summaryRowFormatRequests,
  TRANSACTION_HEADERS,
  SUMMARY_HEADERS,
} from "./sheetInit";

const TAG_SEPARATOR = ", ";
const TAG_HEADER = "Tags";
const tagsColumnReady = new Set<string>();

function parseLineItems(raw: string): LineItem[] | undefined {
  if (!raw || raw === "[]") return undefined;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) return undefined;
    const valid = parsed.every(
      (item: unknown) =>
        typeof item === "object" &&
        item !== null &&
        "id" in item &&
        "amount" in item &&
        "description" in item &&
        "tags" in item,
    );
    return valid ? (parsed as LineItem[]) : undefined;
  } catch {
    return undefined;
  }
}

function formatCreatedAtForSheet(value?: string) {
  const raw = String(value || "").trim();
  if (!raw || raw === "Invalid Date") return "";
  const timeMatch = raw.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (timeMatch)
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}:${timeMatch[3] || "00"}`;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}:${String(date.getSeconds()).padStart(2, "0")}`;
}

function formatAmountForSheet(tx: Transaction) {
  if (tx.lineItems && tx.lineItems.length > 0) {
    const parts: string[] = [];
    tx.lineItems.forEach((li) => {
      const expr = sanitizeAmountExpression(li.formula || "");
      if (expr) parts.push(expr);
      else if (Number.isFinite(li.amount) && li.amount !== 0) parts.push(String(li.amount));
    });
    if (parts.length === 0) return tx.amount;
    return `=${parts.join("+")}`;
  }
  const expression = sanitizeAmountExpression(tx.formula || "");
  if (!expression) return tx.amount;
  return `=${expression}`;
}

function sanitizeAmountExpression(value: string) {
  return String(value || "")
    .trim()
    .replace(/^=/, "")
    .replace(/[^0-9+\-*/().\s]/g, "")
    .trim();
}

function parseAmountFormula(value: unknown, type: Transaction["type"]) {
  const raw = String(value || "").trim();
  if (!raw.startsWith("=")) return "";
  let expression = raw.replace(/^=/, "").trim();
  expression = unwrapAmountFormula(expression, type);
  return sanitizeAmountExpression(expression);
}

function unwrapAmountFormula(expression: string, type: Transaction["type"]) {
  const trimmed = expression.trim();
  const absMatch = trimmed.match(/^ABS\((.*)\)$/i);
  if (absMatch) return absMatch[1];
  const negativeAbsMatch = trimmed.match(/^-ABS\((.*)\)$/i);
  if (negativeAbsMatch) return negativeAbsMatch[1];
  const negativeWrappedMatch = trimmed.match(/^-\((.*)\)$/);
  if (type.startsWith("GASTO") && negativeWrappedMatch)
    return negativeWrappedMatch[1];
  return trimmed;
}

async function ensureTransactionTagsColumn(
  token: string,
  spreadsheetId: string,
  knownHeader?: unknown,
) {
  if (tagsColumnReady.has(spreadsheetId)) return;
  let header = knownHeader;
  if (header === undefined) {
    const data = await googleFetch<{ values?: unknown[][] }>(
      token,
      readValuesUrl(spreadsheetId, `${SHEET_NAMES.transactions}!F1`),
    );
    header = data.values?.[0]?.[0];
  }
  if (isTagHeader(header)) {
    tagsColumnReady.add(spreadsheetId);
    return;
  }
  const sheetId = await getTransactionSheetId(token, spreadsheetId);
  await googleFetch(
    token,
    `${valuesUrl(spreadsheetId, `${SHEET_NAMES.transactions}!F1`)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ values: [[TAG_HEADER]] }),
    },
  );
  await googleFetch(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          copyPaste: {
            source: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 4,
              endColumnIndex: 5,
            },
            destination: {
              sheetId,
              startRowIndex: 0,
              endRowIndex: 1,
              startColumnIndex: 5,
              endColumnIndex: 6,
            },
            pasteType: "PASTE_FORMAT",
          },
        },
        {
          copyPaste: {
            source: {
              sheetId,
              startRowIndex: 1,
              startColumnIndex: 2,
              endColumnIndex: 3,
            },
            destination: {
              sheetId,
              startRowIndex: 1,
              startColumnIndex: 5,
              endColumnIndex: 6,
            },
            pasteType: "PASTE_FORMAT",
          },
        },
        {
          repeatCell: {
            range: { sheetId, startColumnIndex: 5, endColumnIndex: 6 },
            cell: {
              userEnteredFormat: {
                wrapStrategy: "CLIP",
                verticalAlignment: "MIDDLE",
              },
            },
            fields: "userEnteredFormat(wrapStrategy,verticalAlignment)",
          },
        },
        {
          updateDimensionProperties: {
            range: {
              sheetId,
              dimension: "COLUMNS",
              startIndex: 5,
              endIndex: 6,
            },
            properties: { pixelSize: 150 },
            fields: "pixelSize",
          },
        },
      ],
    }),
  });
  await normalizeExistingTagCells(token, spreadsheetId);
  tagsColumnReady.add(spreadsheetId);
}

async function normalizeExistingTagCells(token: string, spreadsheetId: string) {
  const range = `${SHEET_NAMES.transactions}!F2:F`;
  const data = await googleFetch<{ values?: unknown[][] }>(
    token,
    readValuesUrl(spreadsheetId, range),
  );
  const rows = data.values || [];
  if (
    !rows.some(
      (row) =>
        String(row[0] || "").includes(",") ||
        String(row[0] || "").includes("\n"),
    )
  )
    return;
  await googleFetch(
    token,
    `${valuesUrl(spreadsheetId, `${SHEET_NAMES.transactions}!F2:F${rows.length + 1}`)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({
        values: rows.map((row) => [parseTags(row[0]).join(TAG_SEPARATOR)]),
      }),
    },
  );
}

async function findChronologicalInsertionRow(
  token: string,
  spreadsheetId: string,
  dateObj: Date,
) {
  const range = `${SHEET_NAMES.transactions}!A2:A`;
  try {
    const data = await googleFetch<{ values?: unknown[][] }>(
      token,
      readValuesUrl(spreadsheetId, range),
    );
    const rows = data.values || [];
    const targetMs = new Date(
      dateObj.getFullYear(),
      dateObj.getMonth(),
      dateObj.getDate(),
    ).getTime();
    for (let i = 0; i < rows.length; i += 1) {
      const rowDate = parseSheetDate(rows[i]?.[0]);
      if (rowDate) {
        const rowMs = new Date(
          rowDate.getFullYear(),
          rowDate.getMonth(),
          rowDate.getDate(),
        ).getTime();
        if (rowMs > targetMs) return i + 2;
      }
    }
    return rows.length + 2;
  } catch {
    return 2;
  }
}

function buildTransactionRow(tx: Transaction) {
  return [
    formatDateToISO(tx.rawDate),
    formatAmountForSheet(tx),
    tx.detail,
    tx.type,
    formatCreatedAtForSheet(tx.createdAt),
    (tx.tags || []).join(TAG_SEPARATOR),
    JSON.stringify(tx.lineItems ?? []),
  ];
}

async function writeRow(
  token: string,
  spreadsheetId: string,
  rowNumber: number,
  values: unknown[],
) {
  await ensureTransactionTagsColumn(token, spreadsheetId);
  const range = `${SHEET_NAMES.transactions}!A${rowNumber}:G${rowNumber}`;
  await googleFetch(
    token,
    `${valuesUrl(spreadsheetId, range)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({ values: [values] }),
    },
  );
}

async function readSingleRow(
  token: string,
  spreadsheetId: string,
  rowNumber: number,
) {
  const range = `${SHEET_NAMES.transactions}!A${rowNumber}:G${rowNumber}`;
  const data = await googleFetch<{ values?: unknown[][] }>(
    token,
    readValuesUrl(spreadsheetId, range),
  );
  return data.values?.[0] || [];
}

export async function readTransactions(token: string, spreadsheetId: string) {
  const range = `${SHEET_NAMES.transactions}!A1:G`;
  const [data, formulaData] = await Promise.all([
    googleFetch<{ values?: unknown[][] }>(
      token,
      readValuesUrl(spreadsheetId, range),
    ),
    googleFetch<{ values?: unknown[][] }>(
      token,
      formulaValuesUrl(spreadsheetId, range),
    ),
  ]);
  const rows = data.values || [];
  await ensureTransactionTagsColumn(token, spreadsheetId, rows[0]?.[5] ?? "");
  const headerIndex = Math.max(
    0,
    findHeaderIndex(rows, TRANSACTION_HEADERS.slice(0, 4)),
  );
  return (data.values || [])
    .map((row, index): Transaction | null => {
      if (index <= headerIndex) return null;
      const date = parseSheetDate(row[0]);
      if (!date) return null;
      const type = normalizeType(String(row[3] || ""));
      if (!type) return null;
      const createdAt = parseCreatedAt(row[4]);
      const lineItems = parseLineItems(String(row[6] || ""));
      return {
        rowId: index + 1,
        date: formatDateForSheet(date),
        rawDate: date.toISOString(),
        rawDateMs: date.getTime(),
        createdAtMs: parseCreatedAtMs(createdAt),
        amount: parseNumber(row[1]),
        detail: String(row[2] || ""),
        formula: parseAmountFormula(formulaData.values?.[index]?.[1], type),
        type,
        createdAt,
        tags: parseTags(row[5]),
        ...(lineItems && { lineItems }),
      };
    })
    .filter(Boolean) as Transaction[];
}

export async function readSummaries(token: string, spreadsheetId: string) {
  const data = await googleFetch<{ values?: unknown[][] }>(
    token,
    readValuesUrl(spreadsheetId, `${SHEET_NAMES.summary}!A1:I`),
  );
  const rows = data.values || [];
  const headerIndex = Math.max(0, findHeaderIndex(rows, SUMMARY_HEADERS));
  return rows
    .map((row, index): SummaryRow | null => {
      if (index <= headerIndex) return null;
      const date = parseSheetDate(row[0]);
      if (!date) return null;
      return {
        monthYear: getMonthYear(date),
        freqIncome: parseNumber(row[1]),
        nonFreqIncome: parseNumber(row[2]),
        totalIncome: parseNumber(row[3]),
        freqExpense: parseNumber(row[4]),
        nonFreqExpense: parseNumber(row[5]),
        totalExpense: parseNumber(row[6]),
        netMonthly: parseNumber(row[7]),
        netNoFreq: parseNumber(row[8]),
      };
    })
    .filter(Boolean) as SummaryRow[];
}

async function writeTransactionRow(
  token: string,
  spreadsheetId: string,
  targetRow: number,
  tx: Transaction,
) {
  const dateObj = new Date(tx.rawDate);
  const sheetId = await getTransactionSheetId(token, spreadsheetId);
  await insertBlankRow(token, spreadsheetId, sheetId, targetRow);
  await writeRow(token, spreadsheetId, targetRow, buildTransactionRow(tx));
  await ensureMonthlySummaryRowByDate(
    token,
    spreadsheetId,
    dateObj,
    tx.type === "INGRESO FRECUENTE",
  );
  return { ...tx, rowId: targetRow };
}

export async function saveTransaction(
  token: string,
  spreadsheetId: string,
  draft: TransactionDraft,
) {
  const tx = buildTransactionFromDraft(draft, 0);
  const dateObj = new Date(tx.rawDate);
  const targetRow = await findChronologicalInsertionRow(
    token,
    spreadsheetId,
    dateObj,
  );
  return writeTransactionRow(token, spreadsheetId, targetRow, tx);
}

export async function insertTransactionAtRow(
  token: string,
  spreadsheetId: string,
  draft: TransactionDraft,
  targetRow: number,
) {
  const tx = buildTransactionFromDraft(draft, targetRow);
  const safeRow = Math.max(2, targetRow);
  return writeTransactionRow(token, spreadsheetId, safeRow, tx);
}

export async function updateTransaction(
  token: string,
  spreadsheetId: string,
  rowId: number,
  draft: TransactionDraft,
) {
  const tx = buildTransactionFromDraft(draft, rowId);
  const newDateObj = new Date(tx.rawDate);

  const oldRow = await readSingleRow(token, spreadsheetId, rowId);
  const oldDate = parseSheetDate(oldRow[0]);
  const oldType = normalizeType(String(oldRow[3] || ""));
  const oldMs = oldDate
    ? new Date(
        oldDate.getFullYear(),
        oldDate.getMonth(),
        oldDate.getDate(),
      ).getTime()
    : 0;
  const newMs = new Date(
    newDateObj.getFullYear(),
    newDateObj.getMonth(),
    newDateObj.getDate(),
  ).getTime();

  if (oldDate && oldMs !== newMs) {
    const sheetId = await getTransactionSheetId(token, spreadsheetId);
    await deleteSheetRow(token, spreadsheetId, sheetId, rowId);
    const targetRow = await findChronologicalInsertionRow(
      token,
      spreadsheetId,
      newDateObj,
    );
    await insertBlankRow(token, spreadsheetId, sheetId, targetRow);
    await writeRow(token, spreadsheetId, targetRow, buildTransactionRow(tx));
    await ensureMonthlySummaryRowByDate(
      token,
      spreadsheetId,
      newDateObj,
      tx.type === "INGRESO FRECUENTE",
    );
    await ensureMonthlySummaryRowByDate(
      token,
      spreadsheetId,
      oldDate,
      oldType === "INGRESO FRECUENTE",
    );
    return { ...tx, rowId: targetRow };
  }

  await writeRow(token, spreadsheetId, rowId, buildTransactionRow(tx));
  await ensureMonthlySummaryRowByDate(
    token,
    spreadsheetId,
    newDateObj,
    tx.type === "INGRESO FRECUENTE" || oldType === "INGRESO FRECUENTE",
  );
  return { ...tx, rowId };
}

export async function deleteTransaction(
  token: string,
  spreadsheetId: string,
  rowId: number,
) {
  const sheetId = await getTransactionSheetId(token, spreadsheetId);
  await deleteSheetRow(token, spreadsheetId, sheetId, rowId);
}

export async function moveTransaction(
  token: string,
  spreadsheetId: string,
  rowId: number,
  direction: "up" | "down",
) {
  const targetRowId = direction === "up" ? rowId - 1 : rowId + 1;
  if (targetRowId < 2) return;
  const [row1, row2] = await Promise.all([
    readSingleRow(token, spreadsheetId, rowId),
    readSingleRow(token, spreadsheetId, targetRowId),
  ]);
  if (!row1.length || !row2.length) return;
  await writeRow(token, spreadsheetId, rowId, row2);
  await writeRow(token, spreadsheetId, targetRowId, row1);
}

async function ensureMonthlySummaryRowByDate(
  token: string,
  spreadsheetId: string,
  date: Date,
  refreshFrequentIncome = false,
) {
  const [data, locale] = await Promise.all([
    googleFetch<{ values?: unknown[][] }>(
      token,
      valuesUrl(spreadsheetId, `${SHEET_NAMES.summary}!A1:I`),
    ),
    getSpreadsheetLocale(token, spreadsheetId),
  ]);
  const rows = data.values || [];
  const headerIndex = Math.max(0, findHeaderIndex(rows, SUMMARY_HEADERS));
  const monthYear = getMonthYear(date);
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const rowDate = parseSheetDate(rows[i]?.[0]);
    if (rowDate && getMonthYear(rowDate) === monthYear) {
      const rowNumber = i + 1;
      const firstDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      const startColumn = refreshFrequentIncome ? "B" : "C";
      const formulas = buildSummaryRowFormulas(
        rowNumber,
        firstDay,
        locale,
      ).slice(refreshFrequentIncome ? 1 : 2);
      await googleFetch(
        token,
        `${valuesUrl(spreadsheetId, `${SHEET_NAMES.summary}!A${rowNumber}`)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [[firstDay]] }),
        },
      );
      await googleFetch(
        token,
        `${valuesUrl(spreadsheetId, `${SHEET_NAMES.summary}!${startColumn}${rowNumber}:I${rowNumber}`)}?valueInputOption=USER_ENTERED`,
        {
          method: "PUT",
          body: JSON.stringify({ values: [formulas] }),
        },
      );
      const summarySheetId = await getSheetIdByName(token, spreadsheetId, SHEET_NAMES.summary);
      await googleFetch(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
        method: "POST",
        body: JSON.stringify({
          requests: summaryRowFormatRequests(summarySheetId, rowNumber - 1),
        }),
      });
      return rowNumber;
    }
  }
  const rowNumber = Math.max(rows.length + 1, headerIndex + 2);
  const firstDay = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  await googleFetch(
    token,
    `${valuesUrl(spreadsheetId, `${SHEET_NAMES.summary}!A${rowNumber}:I${rowNumber}`)}?valueInputOption=USER_ENTERED`,
    {
      method: "PUT",
      body: JSON.stringify({
        values: [buildSummaryRowFormulas(rowNumber, firstDay, locale)],
      }),
    },
  );
  const summarySheetId = await getSheetIdByName(token, spreadsheetId, SHEET_NAMES.summary);
  await googleFetch(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: summaryRowFormatRequests(summarySheetId, rowNumber - 1),
    }),
  });
  return rowNumber;
}

export {
  TAG_SEPARATOR,
  parseLineItems,
  formatCreatedAtForSheet,
  formatAmountForSheet,
  sanitizeAmountExpression,
  parseAmountFormula,
  unwrapAmountFormula,
  buildTransactionRow,
};
