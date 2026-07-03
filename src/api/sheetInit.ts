import { DEFAULT_SPREADSHEET_LOCALE, SHEET_NAMES, TRANSACTION_TYPES } from "@/domain/bucksLogic";
import { googleFetch, SHEETS } from "./googleFetch";

const TRANSACTION_HEADERS = [
  "Date",
  "Amount",
  "Detail",
  "Type",
  "CREATION TIME",
  "Tags",
  "LINE ITEMS",
];

const SUMMARY_HEADERS = [
  "MONTH",
  "FREQUENT INCOME",
  "NON-FREQUENT INCOME",
  "TOTAL INCOME",
  "FREQUENT EXPENSE",
  "NON-FREQUENT EXPENSE",
  "TOTAL EXPENSES",
  "MONTHLY NET",
  "NET WITHOUT FREQUENT INCOME",
];

type FormulaDialect = { sumifs: string; eomonth: string; sep: string };

function formulaDialect(locale: string): FormulaDialect {
  const normalized = locale.toLowerCase();
  if (normalized.startsWith("es"))
    return { sumifs: "SUMAR.SI.CONJUNTO", eomonth: "FIN.MES", sep: ";" };
  return { sumifs: "SUMIFS", eomonth: "EOMONTH", sep: "," };
}

function buildSummaryRowFormulas(
  rowNumber: number,
  firstDay: string,
  locale: string,
) {
  const dialect = formulaDialect(locale);
  const txSheet = `'${SHEET_NAMES.transactions}'`;
  const sumByType = (type: string) =>
    `=${dialect.sumifs}(${txSheet}!$B:$B${dialect.sep}${txSheet}!$A:$A${dialect.sep}">="&$A${rowNumber}${dialect.sep}${txSheet}!$A:$A${dialect.sep}"<="&${dialect.eomonth}($A${rowNumber}${dialect.sep}0)${dialect.sep}${txSheet}!$D:$D${dialect.sep}"${type}")`;
  return [
    firstDay,
    sumByType(TRANSACTION_TYPES[0]),
    sumByType(TRANSACTION_TYPES[1]),
    `=B${rowNumber}+C${rowNumber}`,
    sumByType(TRANSACTION_TYPES[2]),
    sumByType(TRANSACTION_TYPES[3]),
    `=E${rowNumber}+F${rowNumber}`,
    `=D${rowNumber}+G${rowNumber}`,
    `=H${rowNumber}-B${rowNumber}`,
  ];
}

async function getTransactionSheetId(token: string, spreadsheetId: string) {
  return getSheetIdByName(token, spreadsheetId, SHEET_NAMES.transactions);
}

async function getSheetIdByName(
  token: string,
  spreadsheetId: string,
  sheetName: string,
) {
  const meta = await googleFetch<{
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
  }>(
    token,
    `${SHEETS}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
  );
  const sheetId = meta.sheets?.find(
    (s) => s.properties?.title === sheetName,
  )?.properties?.sheetId;
  if (sheetId == null)
    throw new Error(`No se encontro la hoja "${sheetName}"`);
  return sheetId;
}

function transactionRowFormatRequests(sheetId: number, rowIndex: number) {
  const blackBorder = {
    style: "SOLID",
    width: 1,
    color: { red: 0, green: 0, blue: 0 },
  };
  return [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: 6,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { fontFamily: "Lexend", fontSize: 10 },
          },
        },
        fields: "userEnteredFormat.textFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 3,
          endColumnIndex: 5,
        },
        cell: {
          userEnteredFormat: {
            textFormat: { fontFamily: "Roboto", fontSize: 10 },
          },
        },
        fields: "userEnteredFormat.textFormat",
      },
    },
    {
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: 7,
        },
        innerVertical: blackBorder,
        right: blackBorder,
      },
    },
    {
      updateBorders: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 4,
          endColumnIndex: 5,
        },
        right: blackBorder,
      },
    },
    {
      updateDimensionProperties: {
        range: {
          sheetId,
          dimension: "ROWS",
          startIndex: rowIndex,
          endIndex: rowIndex + 1,
        },
        properties: { pixelSize: 20 },
        fields: "pixelSize",
      },
    },
  ];
}

function summaryRowFormatRequests(sheetId: number, rowIndex: number) {
  return [
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 0,
          endColumnIndex: 1,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: "DATE", pattern: "MMM YYYY" },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
    {
      repeatCell: {
        range: {
          sheetId,
          startRowIndex: rowIndex,
          endRowIndex: rowIndex + 1,
          startColumnIndex: 1,
          endColumnIndex: 9,
        },
        cell: {
          userEnteredFormat: {
            numberFormat: {
              type: "NUMBER",
              pattern: '#,##0.00;[Red]-#,##0.00',
            },
          },
        },
        fields: "userEnteredFormat.numberFormat",
      },
    },
  ];
}

async function insertBlankRow(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  rowNumber: number,
) {
  const rowIndex = rowNumber - 1;
  await googleFetch(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          insertDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowIndex,
              endIndex: rowIndex + 1,
            },
            inheritFromBefore: rowNumber > 2,
          },
        },
        ...transactionRowFormatRequests(sheetId, rowIndex),
      ],
    }),
  });
}

async function deleteSheetRow(
  token: string,
  spreadsheetId: string,
  sheetId: number,
  rowNumber: number,
) {
  await googleFetch(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: rowNumber - 1,
              endIndex: rowNumber,
            },
          },
        },
      ],
    }),
  });
}

async function getSpreadsheetLocale(token: string, spreadsheetId: string) {
  const meta = await googleFetch<{ properties?: { locale?: string } }>(
    token,
    `${SHEETS}/${spreadsheetId}?fields=properties.locale`,
  );
  return meta.properties?.locale || DEFAULT_SPREADSHEET_LOCALE;
}

async function formatSpreadsheet(token: string, spreadsheetId: string) {
  const meta = await googleFetch<{
    sheets?: { properties?: { sheetId?: number; title?: string } }[];
  }>(
    token,
    `${SHEETS}/${spreadsheetId}?fields=sheets.properties(sheetId,title)`,
  );
  const txSheetId = meta.sheets?.find(
    (sheet) => sheet.properties?.title === SHEET_NAMES.transactions,
  )?.properties?.sheetId;
  const summarySheetId = meta.sheets?.find(
    (sheet) => sheet.properties?.title === SHEET_NAMES.summary,
  )?.properties?.sheetId;
  const requests: unknown[] = [txSheetId, summarySheetId]
    .filter((sheetId): sheetId is number => typeof sheetId === "number")
    .flatMap((sheetId) => [
      {
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: {
            userEnteredFormat: {
              textFormat: { bold: true },
              horizontalAlignment: "CENTER",
              backgroundColor: { red: 0.78, green: 1, blue: 0 },
            },
          },
          fields:
            "userEnteredFormat(textFormat,horizontalAlignment,backgroundColor)",
        },
      },
      {
        updateSheetProperties: {
          properties: { sheetId, gridProperties: { frozenRowCount: 1 } },
          fields: "gridProperties.frozenRowCount",
        },
      },
    ]);
  if (typeof txSheetId === "number")
    requests.push(...transactionRowFormatRequests(txSheetId, 1));
  if (requests.length) {
    await googleFetch(token, `${SHEETS}/${spreadsheetId}:batchUpdate`, {
      method: "POST",
      body: JSON.stringify({ requests }),
    });
  }
}

const DEFAULT_TAGS_CATALOGUE = JSON.stringify([
  { id: "default-salud", label: "Salud", color: "#f43f5e" },
  { id: "default-comida", label: "Comida", color: "#f59e0b" },
  { id: "default-viaje", label: "Viaje", color: "#0ea5e9" },
  { id: "default-transporte", label: "Transporte", color: "#10b981" },
  { id: "default-ocio", label: "Ocio", color: "#8b5cf6" },
  { id: "default-educacion", label: "Educación", color: "#84cc16" },
]);

async function initializeSpreadsheet(token: string, spreadsheetId: string) {
  const currentMonth = new Date();
  const firstDay = `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}`;
  const locale = await getSpreadsheetLocale(token, spreadsheetId);
  await googleFetch(token, `${SHEETS}/${spreadsheetId}/values:batchUpdate`, {
    method: "POST",
    body: JSON.stringify({
      valueInputOption: "USER_ENTERED",
      data: [
        {
          range: `${SHEET_NAMES.transactions}!A1:G1`,
          values: [TRANSACTION_HEADERS],
        },
        {
          range: `${SHEET_NAMES.summary}!A1:I2`,
          values: [
            SUMMARY_HEADERS,
            buildSummaryRowFormulas(2, firstDay, locale),
          ],
        },
        {
          range: `${SHEET_NAMES.summary}!K1:K2`,
          values: [["TAGS CATALOGUE"], [DEFAULT_TAGS_CATALOGUE]],
        },
      ],
    }),
  });
  await formatSpreadsheet(token, spreadsheetId);
}

export async function createBucksSpreadsheet(token: string) {
  const created = await googleFetch<{ spreadsheetId: string }>(token, SHEETS, {
    method: "POST",
    body: JSON.stringify({
      properties: {
        title: SHEET_NAMES.transactions,
        locale: DEFAULT_SPREADSHEET_LOCALE,
      },
      sheets: [
        { properties: { title: SHEET_NAMES.transactions } },
        { properties: { title: SHEET_NAMES.summary } },
      ],
    }),
  });
  await initializeSpreadsheet(token, created.spreadsheetId);
  return created.spreadsheetId;
}

export {
  SUMMARY_HEADERS,
  TRANSACTION_HEADERS,
  getTransactionSheetId,
  getSheetIdByName,
  transactionRowFormatRequests,
  summaryRowFormatRequests,
  insertBlankRow,
  deleteSheetRow,
  getSpreadsheetLocale,
  formulaDialect,
  buildSummaryRowFormulas,
};
