describe("googleWorkspace", () => {
  let createBucksSpreadsheet: typeof import("../src/api/googleWorkspace.ts").createBucksSpreadsheet;
  let findCompatibleSheets: typeof import("../src/api/googleWorkspace.ts").findCompatibleSheets;
  let readSummaries: typeof import("../src/api/googleWorkspace.ts").readSummaries;
  let readTransactions: typeof import("../src/api/googleWorkspace.ts").readTransactions;
  let saveTransaction: typeof import("../src/api/googleWorkspace.ts").saveTransaction;
  let insertTransactionAtRow: typeof import("../src/api/googleWorkspace.ts").insertTransactionAtRow;
  let updateTransaction: typeof import("../src/api/googleWorkspace.ts").updateTransaction;
  let deleteTransaction: typeof import("../src/api/googleWorkspace.ts").deleteTransaction;
  let moveTransaction: typeof import("../src/api/googleWorkspace.ts").moveTransaction;
  let readTagsCatalog: typeof import("../src/api/googleWorkspace.ts").readTagsCatalog;
  let writeTagsCatalog: typeof import("../src/api/googleWorkspace.ts").writeTagsCatalog;
  let isSheetTrashed: typeof import("../src/api/googleWorkspace.ts").isSheetTrashed;

  beforeAll(async () => {
    const mod = await import("../src/api/googleWorkspace.ts");
    createBucksSpreadsheet = mod.createBucksSpreadsheet;
    findCompatibleSheets = mod.findCompatibleSheets;
    readSummaries = mod.readSummaries;
    readTransactions = mod.readTransactions;
    saveTransaction = mod.saveTransaction;
    insertTransactionAtRow = mod.insertTransactionAtRow;
    updateTransaction = mod.updateTransaction;
    deleteTransaction = mod.deleteTransaction;
    moveTransaction = mod.moveTransaction;
    readTagsCatalog = mod.readTagsCatalog;
    writeTagsCatalog = mod.writeTagsCatalog;
    isSheetTrashed = mod.isSheetTrashed;
  });

  function json(value: unknown, status = 200) {
    return new Response(JSON.stringify(value), { status, headers: { "content-type": "application/json" } });
  }

  function installFetch(handler: (input: any, init?: any) => Promise<Response>) {
    const original = globalThis.fetch;
    globalThis.fetch = handler as any;
    return () => { globalThis.fetch = original; };
  }

  function sharedTxHandlers(requests: { url: string; method: string; body: any }[]) {
    return async (input: any, init: any = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({ values: [] });
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["TAGS"]] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
          ["January 2026"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    };
  }

  test("transaction reads accept legacy headers and skip corrupt rows", async () => {
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("valueRenderOption=FORMULA")) {
        return json({ values: [
          ["Date", "Amount", "Detail", "Type", "CREATION TIME", "Tags"],
          ["31-jan-26", "=-ABS(1000+234.5)"],
          ["31-feb-26", "=-10"],
          ["01-feb-26", "=-20"],
        ] });
      }
      return json({ values: [
        ["Date", "Amount", "Detail", "Type", "CREATION TIME", "Tags"],
        ["31-jan-26", "-1.234,50", "Mercado", "GASTO FRECUENTE", "12:34:56", "Comida,\n Salud"],
        ["31-feb-26", "-10", "Fecha corrupta", "GASTO FRECUENTE", "", ""],
        ["01-feb-26", "-20", "Tipo corrupto", "DESCONOCIDO", "", ""],
      ] });
    });
    try {
      const rows = await readTransactions("token", "legacy-sheet");
      expect(rows.length).toBe(1);
      expect(rows[0].rowId).toBe(2);
      expect(rows[0].amount).toBe(-1234.5);
      expect(rows[0].formula).toBe("1000+234.5");
      expect(rows[0].createdAt).toBe("12:34:56");
      expect(rows[0].tags).toEqual(["Comida", "Salud"]);
    } finally {
      restore();
    }
  });

  test("summary reads accept legacy aliases and locale-formatted numbers", async () => {
    const restore = installFetch(async () => json({ values: [
      ["MES Y AÑO", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "TOTAL SIN INGRESO FRECUENTE"],
      ["January 2026", "1.000,50", "20", "1.020,50", "-100", "-20", "-120", "900,50", "-100"],
      ["Mes inválido", "500"],
    ] }));
    try {
      const rows = await readSummaries("token", "sheet");
      expect(rows.length).toBe(1);
      expect(rows[0]).toEqual({
        monthYear: "January 2026",
        freqIncome: 1000.5,
        nonFreqIncome: 20,
        totalIncome: 1020.5,
        freqExpense: -100,
        nonFreqExpense: -20,
        totalExpense: -120,
        netMonthly: 900.5,
        netNoFreq: -100,
      });
    } finally {
      restore();
    }
  });

  test("spreadsheet creation preserves the exact name, tabs, and locale formulas", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      requests.push({ url, method: init.method || "GET", body: init.body ? JSON.parse(init.body) : null });
      if (url.endsWith("/v4/spreadsheets") && init.method === "POST") return json({ spreadsheetId: "created-sheet" });
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 1, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 2, title: "MONTHLY SUMMARY" } },
        ] });
      }
      return json({});
    });
    try {
      expect(await createBucksSpreadsheet("token")).toBe("created-sheet");
      const createBody = requests.find(({ url, method }) => url.endsWith("/v4/spreadsheets") && method === "POST")!.body;
      expect(createBody.properties.title).toBe("INCOME AND EXPENSES");
      expect(createBody.sheets.map(({ properties }: any) => properties.title)).toEqual(["INCOME AND EXPENSES", "MONTHLY SUMMARY"]);

      const valuesBody = requests.find(({ url }) => url.includes("/values:batchUpdate"))!.body;
      expect(valuesBody.data[1].values[1][1]).toMatch(/INGRESO FRECUENTE/);
      expect(valuesBody.data[1].values[1][2]).toMatch(/SUMIFS/);
      expect(valuesBody.data[1].values[1][2]).toMatch(/EOMONTH/);
    } finally {
      restore();
    }
  });

  test("saving a transaction inserts the row chronologically and refreshes its monthly formulas", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) {
        return json({ values: [["01-jan-26"], ["20-jan-26"]] });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
          ["January 2026"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    });
    try {
      const saved = await saveTransaction("token", "write-sheet", {
        date: "2026-01-15",
        amount: "=-(10+5)",
        detail: "Prueba",
        type: "GASTO NO FRECUENTE",
        createdAt: "11:22:33",
        tags: ["Casa", "Comida"],
      });

      expect(saved.rowId).toBe(3);
      expect(saved.amount).toBe(-15);
      expect(saved.formula).toBe("-(10+5)");
      const insert = requests.find(({ body }) => body?.requests?.[0]?.insertDimension);
      expect(insert!.body.requests[0].insertDimension.range.startIndex).toBe(2);
      const rowWrite = requests.find(({ url, method }) => url.includes("INCOME AND EXPENSES!A3:G3") && method === "PUT");
      expect(rowWrite!.body.values[0]).toEqual([
        "2026-01-15",
        "=-(10+5)",
        "Prueba",
        "GASTO NO FRECUENTE",
        "11:22:33",
        "Casa, Comida",
        "[]",
      ]);
      const formulaWrite = requests.find(({ url, method }) => url.includes("MONTHLY SUMMARY!C2:I2") && method === "PUT");
      const dateWrite = requests.find(({ url, method }) => url.includes("MONTHLY SUMMARY!A2") && method === "PUT");
      expect(dateWrite!.body.values[0]).toEqual(["2026-01"]);
      expect(formulaWrite!.body.values[0][0]).toMatch(/SUMIFS/);
    } finally {
      restore();
    }
  });

  test("saving frequent income refreshes the frequent-income summary formula", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({});
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
          ["January 2026"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    });
    try {
      await saveTransaction("token", "write-sheet", {
        date: "2026-01-15",
        amount: "1000",
        detail: "Sueldo",
        type: "INGRESO FRECUENTE",
        createdAt: "11:22:33",
        tags: [],
      });

      const formulaWrite = requests.find(({ url, method }) => url.includes("MONTHLY SUMMARY!B2:I2") && method === "PUT");
      const dateWrite = requests.find(({ url, method }) => url.includes("MONTHLY SUMMARY!A2") && method === "PUT");
      expect(dateWrite!.body.values[0]).toEqual(["2026-01"]);
      expect(formulaWrite!.body.values[0][0]).toMatch(/INGRESO FRECUENTE/);
    } finally {
      restore();
    }
  });

  test("saving a transaction creates a missing monthly summary row with default locale formulas", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({});
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"]] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: {} });
      return json({});
    });
    try {
      await saveTransaction("token", "write-sheet", {
        date: "2026-02-15",
        amount: "25",
        detail: "Extra",
        type: "INGRESO NO FRECUENTE",
        createdAt: "11:22:33",
        tags: [],
      });

      const summaryWrite = requests.find(({ url, method }) => url.includes("MONTHLY SUMMARY!A2:I2") && method === "PUT");
      expect(summaryWrite!.body.values[0][0]).toBe("2026-02");
      expect(summaryWrite!.body.values[0][1]).toMatch(/SUMIFS/);
      expect(summaryWrite!.body.values[0][1]).toMatch(/EOMONTH/);
    } finally {
      restore();
    }
  });

  test("Google API failures expose status and response details", async () => {
    const restore = installFetch(async () => json({ error: { message: "invalid token" } }, 401));
    try {
      await expect(findCompatibleSheets("token")).rejects.toThrow(/Google API 401:.*invalid token/);
    } finally {
      restore();
    }
  });

  test("Google HTML error pages produce an actionable message", async () => {
    const restore = installFetch(async () => new Response("<html>bad gateway</html>", { status: 502 }));
    try {
      await expect(findCompatibleSheets("token")).rejects.toThrow(/pagina HTML en vez de JSON/);
    } finally {
      restore();
    }
  });

  test("insertTransactionAtRow writes at the specified row", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(sharedTxHandlers(requests));
    try {
      const result = await insertTransactionAtRow("token", "sheet", {
        date: "2026-03-10",
        amount: "-50",
        detail: "Insertado",
        type: "GASTO FRECUENTE",
        createdAt: "09:00:00",
        tags: [],
      }, 4);

      expect(result.rowId).toBe(4);
      const insert = requests.find(({ body }) => body?.requests?.[0]?.insertDimension);
      expect(insert!.body.requests[0].insertDimension.range.startIndex).toBe(3);
    } finally {
      restore();
    }
  });

  test("insertTransactionAtRow clamps row below 2", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(sharedTxHandlers(requests));
    try {
      const result = await insertTransactionAtRow("token", "sheet", {
        date: "2026-03-10",
        amount: "-50",
        detail: "Clamped",
        type: "GASTO FRECUENTE",
        createdAt: "",
        tags: [],
      }, 1);

      expect(result.rowId).toBe(2);
    } finally {
      restore();
    }
  });

  test("updateTransaction rewrites same row when date unchanged", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A5:G5") && (init.method || "GET") === "GET") {
        return json({ values: [["2026-01-15", "-10", "Old", "GASTO FRECUENTE", "10:00:00", ""]] });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({ values: [] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
          ["January 2026"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    });
    try {
      const result = await updateTransaction("token", "sheet", 5, {
        date: "2026-01-15",
        amount: "-25",
        detail: "Updated",
        type: "GASTO FRECUENTE",
        createdAt: "10:00:00",
        tags: [],
      });

      expect(result.rowId).toBe(5);
      const rowWrite = requests.find(({ url, method }) => url.includes("INCOME AND EXPENSES!A5:G5") && method === "PUT");
      expect(rowWrite!.body.values[0][2]).toBe("Updated");
    } finally {
      restore();
    }
  });

  test("updateTransaction moves row when date changes", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A5:G5") && (init.method || "GET") === "GET") {
        return json({ values: [["2026-01-15", "-10", "Old", "GASTO FRECUENTE", "10:00:00", ""]] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({ values: [["2026-03-01"]] });
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
          ["January 2026"],
          ["March 2026"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    });
    try {
      const result = await updateTransaction("token", "sheet", 5, {
        date: "2026-03-20",
        amount: "-25",
        detail: "Moved",
        type: "GASTO FRECUENTE",
        createdAt: "",
        tags: [],
      });

      expect(result.rowId).not.toBe(5);
      const deletes = requests.filter(({ body }) => body?.requests?.[0]?.deleteDimension);
      expect(deletes.length).toBeGreaterThan(0);
    } finally {
      restore();
    }
  });

  test("deleteTransaction removes the row from the sheet", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [{ properties: { sheetId: 3, title: "INCOME AND EXPENSES" } }] });
      }
      return json({});
    });
    try {
      await deleteTransaction("token", "sheet", 5);

      const deleteReq = requests.find(({ body }) => body?.requests?.[0]?.deleteDimension);
      expect(deleteReq).toBeTruthy();
      expect(deleteReq!.body.requests[0].deleteDimension.range.startIndex).toBe(4);
      expect(deleteReq!.body.requests[0].deleteDimension.range.endIndex).toBe(5);
    } finally {
      restore();
    }
  });

  test("moveTransaction swaps adjacent rows", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("INCOME AND EXPENSES!A3:G3") && (init.method || "GET") === "GET") {
        return json({ values: [["2026-01-15", "-10", "Row3", "GASTO FRECUENTE", "", "", ""]] });
      }
      if (url.includes("INCOME AND EXPENSES!A4:G4") && (init.method || "GET") === "GET") {
        return json({ values: [["2026-01-20", "-20", "Row4", "GASTO NO FRECUENTE", "", "", ""]] });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      return json({});
    });
    try {
      await moveTransaction("token", "sheet", 3, "down");

      const writes = requests.filter(({ url, method }) => method === "PUT" && url.includes("INCOME AND EXPENSES!A"));
      expect(writes.length).toBe(2);
      const write3 = writes.find(({ url }) => url.includes("!A3:G3"));
      const write4 = writes.find(({ url }) => url.includes("!A4:G4"));
      expect(write3!.body.values[0][2]).toBe("Row4");
      expect(write4!.body.values[0][2]).toBe("Row3");
    } finally {
      restore();
    }
  });

  test("moveTransaction does nothing when target row is below 2", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("INCOME AND EXPENSES!A2:G2") && (init.method || "GET") === "GET") {
        return json({ values: [["2026-01-15", "-10", "Row2", "GASTO FRECUENTE", "", "", ""]] });
      }
      return json({});
    });
    try {
      await moveTransaction("token", "sheet", 2, "up");

      const writes = requests.filter(({ method }) => method === "PUT");
      expect(writes.length).toBe(0);
    } finally {
      restore();
    }
  });

  test("moveTransaction does nothing when a row is empty", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("INCOME AND EXPENSES!A3:G3") && (init.method || "GET") === "GET") {
        return json({ values: [["2026-01-15", "-10", "Row3", "GASTO FRECUENTE", "", "", ""]] });
      }
      if (url.includes("INCOME AND EXPENSES!A4:G4") && (init.method || "GET") === "GET") {
        return json({ values: [] });
      }
      return json({});
    });
    try {
      await moveTransaction("token", "sheet", 3, "down");

      const writes = requests.filter(({ method }) => method === "PUT");
      expect(writes.length).toBe(0);
    } finally {
      restore();
    }
  });

  test("readTransactions uses English SUMIFS formulas when locale is en_US", async () => {
    const restore = installFetch(async (input, _init = {}) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("valueRenderOption=FORMULA")) {
        return json({ values: [
          ["Date", "Amount", "Detail", "Type", "Created at", "Tags"],
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({ values: [
        ["Date", "Amount", "Detail", "Type", "Created at", "Tags"],
        ["2026-01-15", "50", "Lunch", "GASTO FRECUENTE", "", ""],
      ] });
    });
    try {
      const rows = await readTransactions("token", "sheet");
      expect(rows.length).toBe(1);
      expect(rows[0].amount).toBe(50);
    } finally {
      restore();
    }
  });

  test("readTransactions handles numeric Excel-style dates", async () => {
    const restore = installFetch(async (input, _init = {}) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("valueRenderOption=FORMULA")) {
        return json({ values: [
          ["Fecha", "Monto", "Detalle", "Tipo", "Hora", "Tags"],
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({ values: [] });
      return json({ values: [
        ["Fecha", "Monto", "Detalle", "Tipo", "Hora de creación", "Tags"],
        [46028, "100", "Numeric date", "GASTO FRECUENTE", "", ""],
      ] });
    });
    try {
      const rows = await readTransactions("token", "sheet");
      expect(rows.length).toBe(1);
      expect(rows[0].amount).toBe(100);
    } finally {
      restore();
    }
  });

  test("readTransactions handles Month Year format dates", async () => {
    const restore = installFetch(async (input, _init = {}) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("valueRenderOption=FORMULA")) {
        return json({ values: [
          ["Fecha", "Monto", "Detalle", "Tipo", "Hora", "Tags"],
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({ values: [] });
      return json({ values: [
        ["Fecha", "Monto", "Detalle", "Tipo", "Hora de creación", "Tags"],
        ["January 2026", "200", "MonthYear date", "GASTO FRECUENTE", "", ""],
      ] });
    });
    try {
      const rows = await readTransactions("token", "sheet");
      expect(rows.length).toBe(1);
      expect(rows[0].amount).toBe(200);
    } finally {
      restore();
    }
  });

  test("findCompatibleSheets returns empty array when validation throws", async () => {
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("drive/v3/files")) {
        return json({ files: [{ id: "file1", name: "Sheet1", modifiedTime: "2026-01-01" }] });
      }
      throw new Error("network failure");
    });
    try {
      const result = await findCompatibleSheets("token");
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });

  test("findCompatibleSheets paginates through multiple pages", async () => {
    let pageCalls = 0;
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("drive/v3/files")) {
        pageCalls++;
        if (pageCalls === 1) {
          return json({ files: [{ id: "f1", name: "S1" }], nextPageToken: "page2" });
        }
        return json({ files: [{ id: "f2", name: "S2" }] });
      }
      if (url.includes("sheets.googleapis.com")) {
        return json({ sheets: [{ properties: { title: "INCOME AND EXPENSES" } }] });
      }
      return json({ values: [["Fecha", "Monto", "Detalle", "Tipo"]] });
    });
    try {
      const result = await findCompatibleSheets("token");
      expect(Array.isArray(result)).toBeTruthy();
      expect(pageCalls).toBe(2);
    } finally {
      restore();
    }
  });

  test("removeTagFromAllRows handles JSON parse errors in lineItems", async () => {
    const mod = await import("../src/api/googleWorkspace.ts");
    const removeTag = mod.removeTagFromAllRows;
    let called = false;
    const restore = installFetch(async (input, _init) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("values:batchUpdate")) { called = true; return json({}); }
      if (url.includes("F2:G")) {
        return json({ values: [
          ["tag-uno", "not-valid-json"],
        ] });
      }
      return json({});
    });
    try {
      await removeTag("token", "sid", "tag-uno");
      expect(called).toBeTruthy();
    } finally {
      restore();
    }
  });

  test("isSheetTrashed returns true for trashed spreadsheet", async () => {
    const restore = installFetch(async () => json({ trashed: true }));
    try {
      expect(await isSheetTrashed("token", "sid")).toBe(true);
    } finally {
      restore();
    }
  });

  test("isSheetTrashed returns false for active spreadsheet", async () => {
    const restore = installFetch(async () => json({ trashed: false }));
    try {
      expect(await isSheetTrashed("token", "sid")).toBe(false);
    } finally {
      restore();
    }
  });

  test("isSheetTrashed returns false on fetch error", async () => {
    const restore = installFetch(async () => { throw new Error("network"); });
    try {
      expect(await isSheetTrashed("token", "sid")).toBe(false);
    } finally {
      restore();
    }
  });

  test("readTagsCatalog returns empty array when cell is empty", async () => {
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!K2")) return json({ values: [[undefined]] });
      return json({});
    });
    try {
      const result = await readTagsCatalog("token", "sheet");
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });

  test("readTagsCatalog returns empty array when cell value is not JSON", async () => {
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!K2")) return json({ values: [["not json"]] });
      return json({});
    });
    try {
      const result = await readTagsCatalog("token", "sheet");
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });

  test("readTagsCatalog parses valid tags from cell", async () => {
    const tags = [{ id: "default-comida", label: "Comida", color: "#ff0000" }];
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!K2")) return json({ values: [[JSON.stringify(tags)]] });
      return json({});
    });
    try {
      const result = await readTagsCatalog("token", "sheet");
      expect(result).toEqual(tags);
    } finally {
      restore();
    }
  });

  test("readTagsCatalog filters out invalid tag objects", async () => {
    const mixed = [{ id: "a", label: "A", color: "#000" }, { id: "b" }, "string"];
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("MONTHLY SUMMARY!K2")) return json({ values: [[JSON.stringify(mixed)]] });
      return json({});
    });
    try {
      const result = await readTagsCatalog("token", "sheet");
      expect(result.length).toBe(1);
      expect(result[0].id).toBe("a");
    } finally {
      restore();
    }
  });

  test("readTagsCatalog handles fetch errors gracefully", async () => {
    const restore = installFetch(async () => { throw new Error("network"); });
    try {
      const result = await readTagsCatalog("token", "sheet");
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });

  test("writeTagsCatalog writes header and tags to K1:K2", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      requests.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : null });
      return json({});
    });
    try {
      const tags = [{ id: "test", label: "Test", color: "#fff" }];
      await writeTagsCatalog("token", "sheet", tags);

      const put = requests.find((r) => r.method === "PUT");
      expect(put).toBeTruthy();
      expect(put!.url).toContain("MONTHLY SUMMARY!K1:K2");
      expect(put!.body.values[0][0]).toBe("TAGS CATALOGUE");
      expect(JSON.parse(put!.body.values[1][0])).toEqual(tags);
    } finally {
      restore();
    }
  });

  test("removeTagFromAllRows cleans tag from column F and batch writes", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const method = init.method || "GET";
      requests.push({ url, method, body: init.body ? JSON.parse(init.body) : null });
      if (url.includes("INCOME AND EXPENSES!F2:G") && method === "GET") {
        return json({ values: [["default-comida, custom-vivienda", ""], ["default-salud", ""], ["custom-vivienda", ""]] });
      }
      if (url.includes("values:batchUpdate")) return json({});
      return json({});
    });
    try {
      const mod = await import("../src/api/googleWorkspace.ts");
      const removeTag = mod.removeTagFromAllRows;
      await removeTag("token", "sheet", "custom-vivienda");

      const batchCall = requests.find((r) => r.url.includes("values:batchUpdate"));
      expect(batchCall).toBeTruthy();
      const data = batchCall!.body.data;
      expect(data.length).toBe(2);
      expect(data[0].values).toEqual([["default-comida"]]);
      expect(data[1].values).toEqual([[""]]);
    } finally {
      restore();
    }
  });

  test("removeTagFromAllRows does nothing when tag not found", async () => {
    let batchCalled = false;
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("INCOME AND EXPENSES!F2:G") && (init.method || "GET") === "GET") {
        return json({ values: [["default-comida", ""], ["default-salud", ""]] });
      }
      if (url.includes("values:batchUpdate")) {
        batchCalled = true;
        return json({});
      }
      return json({});
    });
    try {
      const mod = await import("../src/api/googleWorkspace.ts");
      const removeTag = mod.removeTagFromAllRows;
      await removeTag("token", "sheet", "custom-vivienda");
      expect(batchCalled).toBe(false);
    } finally {
      restore();
    }
  });

  test("removeTagFromAllRows updates both tags and lineItems when both contain tag", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const method = init.method || "GET";
      requests.push({ url, method, body: init.body ? JSON.parse(init.body) : null });
      if (url.includes("INCOME AND EXPENSES!F2:G") && method === "GET") {
        return json({ values: [[
          "tag-uno, tag-dos",
          '[{"tags":["tag-uno"]}, {"tags":["tag-otro"]}]',
        ]] });
      }
      if (url.includes("values:batchUpdate")) return json({});
      return json({});
    });
    try {
      const mod = await import("../src/api/googleWorkspace.ts");
      const removeTag = mod.removeTagFromAllRows;
      await removeTag("token", "sheet", "tag-uno");
      const batchCall = requests.find((r) => r.url.includes("values:batchUpdate"));
      expect(batchCall).toBeTruthy();
      expect(batchCall!.body.data.length).toBe(1);
      expect(batchCall!.body.data[0]).toEqual({
        range: "INCOME AND EXPENSES!F2:G2",
        values: [["tag-dos", '[{"tags":[]},{"tags":["tag-otro"]}]']],
      });
    } finally {
      restore();
    }
  });

  test("removeTagFromAllRows updates lineItems when tag only in lineItems", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const method = init.method || "GET";
      requests.push({ url, method, body: init.body ? JSON.parse(init.body) : null });
      if (url.includes("INCOME AND EXPENSES!F2:G") && method === "GET") {
        return json({ values: [[
          "tag-otro",
          '[{"tags":["tag-uno"]}]',
        ]] });
      }
      if (url.includes("values:batchUpdate")) return json({});
      return json({});
    });
    try {
      const mod = await import("../src/api/googleWorkspace.ts");
      const removeTag = mod.removeTagFromAllRows;
      await removeTag("token", "sheet", "tag-uno");
      const batchCall = requests.find((r) => r.url.includes("values:batchUpdate"));
      expect(batchCall).toBeTruthy();
      expect(batchCall!.body.data.length).toBe(1);
      expect(batchCall!.body.data[0]).toEqual({
        range: "INCOME AND EXPENSES!G2",
        values: [['[{"tags":[]}]']],
      });
    } finally {
      restore();
    }
  });

  test("saveTransaction with ISO createdAt formats time correctly", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(sharedTxHandlers(requests));
    try {
      await saveTransaction("token", "sheet", {
        date: "2026-01-15",
        amount: "-10",
        detail: "ISO date",
        type: "GASTO FRECUENTE",
        createdAt: "2026-01-15T14:30:00.000Z",
        tags: [],
      });

      const rowWrite = requests.find(({ url, method }) => method === "PUT" && url.includes("INCOME AND EXPENSES!A"));
      expect(rowWrite).toBeTruthy();
      const createdAt = rowWrite!.body.values[0][4];
      expect(createdAt).toContain(":");
    } finally {
      restore();
    }
  });

  test("googleFetch retries on 5xx and succeeds", async () => {
    let calls = 0;
    const restore = installFetch(async () => {
      calls++;
      if (calls === 1) return new Response("server error", { status: 500 });
      return json({ files: [] });
    });
    try {
      const result = await findCompatibleSheets("token");
      expect(Array.isArray(result)).toBeTruthy();
      expect(calls).toBe(2);
    } finally {
      restore();
    }
  });

  test("googleFetch retries on 429 rate limit", async () => {
    let calls = 0;
    const restore = installFetch(async () => {
      calls++;
      if (calls === 1) return new Response("rate limited", { status: 429 });
      return json({ files: [] });
    });
    try {
      const result = await findCompatibleSheets("token");
      expect(Array.isArray(result)).toBeTruthy();
      expect(calls).toBe(2);
    } finally {
      restore();
    }
  });

  test("googleFetch does not retry on 400 client errors", async () => {
    let calls = 0;
    const restore = installFetch(async () => {
      calls++;
      return new Response(JSON.stringify({ error: { message: "bad request" } }), { status: 400, headers: { "content-type": "application/json" } });
    });
    try {
      await expect(findCompatibleSheets("token")).rejects.toThrow(/400/);
      expect(calls).toBe(1);
    } finally {
      restore();
    }
  });

  test("googleFetch throws after exhausting retries on 5xx", async () => {
    let calls = 0;
    const restore = installFetch(async () => {
      calls++;
      return new Response("persistent error", { status: 503 });
    });
    try {
      await expect(findCompatibleSheets("token")).rejects.toThrow(/503/);
      expect(calls).toBeGreaterThanOrEqual(2);
    } finally {
      restore();
    }
  });

  test("googleFetch handles network failures with retry", async () => {
    let calls = 0;
    const restore = installFetch(async () => {
      calls++;
      if (calls <= 1) throw new TypeError("Failed to fetch");
      return json({ files: [] });
    });
    try {
      const result = await findCompatibleSheets("token");
      expect(Array.isArray(result)).toBeTruthy();
      expect(calls).toBe(2);
    } finally {
      restore();
    }
  });

  test("saveTransaction falls back to row 2 when date column read fails", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) {
        return new Response("server error", { status: 500 });
      }
      if (url.includes("INCOME AND EXPENSES!F1")) return json({ values: [["Tags"]] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
          ["January 2026"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    });
    try {
      const saved = await saveTransaction("token", "sheet", {
        date: "2026-01-15",
        amount: "-10",
        detail: "Fallback row",
        type: "GASTO FRECUENTE",
        createdAt: "",
        tags: [],
      });

      expect(saved.rowId).toBe(2);
    } finally {
      restore();
    }
  });

  test("ensureTransactionTagsColumn writes Tags header when F1 is not a tag header", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({ values: [] });
      if (url.includes("INCOME AND EXPENSES!F1") && (init.method || "GET") === "GET") {
        return json({ values: [["CREATION TIME"]] });
      }
      if (url.includes("INCOME AND EXPENSES!F1") && init.method === "PUT") {
        return json({});
      }
      if (url.includes("batchUpdate")) return json({});
      if (url.includes("INCOME AND EXPENSES!F2:F")) return json({ values: [] });
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    });
    try {
      const rows = await readTransactions("token", "no-tags-sheet");
      expect(Array.isArray(rows)).toBeTruthy();

      const putF1 = requests.find(({ url, method }) => method === "PUT" && url.includes("INCOME AND EXPENSES!F1"));
      expect(putF1).toBeTruthy();
      expect(putF1!.body.values).toEqual([["Tags"]]);

      const batchReq = requests.find(({ body }) => body?.requests?.length > 0 && body.requests[0]?.copyPaste);
      expect(batchReq).toBeTruthy();
    } finally {
      restore();
    }
  });

  test("ensureTransactionTagsColumn normalizes existing tag cells with commas", async () => {
    const requests: { url: string; method: string; body: any }[] = [];
    const restore = installFetch(async (input, init = {}) => {
      const url = decodeURIComponent(String(input));
      const body = init.body ? JSON.parse(init.body) : null;
      requests.push({ url, method: init.method || "GET", body });
      if (url.includes("fields=sheets.properties(sheetId,title)")) {
        return json({ sheets: [
          { properties: { sheetId: 7, title: "INCOME AND EXPENSES" } },
          { properties: { sheetId: 8, title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("INCOME AND EXPENSES!A2:A")) return json({ values: [] });
      if (url.includes("INCOME AND EXPENSES!F1") && (init.method || "GET") === "GET") {
        return json({ values: [["CREATION TIME"]] });
      }
      if (url.includes("INCOME AND EXPENSES!F1") && init.method === "PUT") {
        return json({});
      }
      if (url.includes("batchUpdate")) return json({});
      if (url.includes("INCOME AND EXPENSES!F2:F") && (init.method || "GET") === "GET") {
        return json({ values: [["Comida,\nSalud"], ["Transporte"]] });
      }
      if (url.includes("INCOME AND EXPENSES!F2:F") && init.method === "PUT") {
        return json({});
      }
      if (url.includes("MONTHLY SUMMARY!A1:I") && (init.method || "GET") === "GET") {
        return json({ values: [
          ["MES", "INGRESO FRECUENTE", "INGRESO NO FRECUENTE", "TOTAL INGRESOS", "GASTO FRECUENTE", "GASTO NO FRECUENTE", "TOTAL GASTOS", "NETO MENSUAL", "NETO SIN ING FRECUENTE"],
        ] });
      }
      if (url.includes("fields=properties.locale")) return json({ properties: { locale: "en_US" } });
      return json({});
    });
    try {
      const rows = await readTransactions("token", "normalize-tags-sheet");
      expect(Array.isArray(rows)).toBeTruthy();

      const normalizePut = requests.find(({ url, method }) => method === "PUT" && url.includes("INCOME AND EXPENSES!F2:F"));
      expect(normalizePut).toBeTruthy();
      expect(normalizePut!.body.values).toEqual([["Comida, Salud"], ["Transporte"]]);
    } finally {
      restore();
    }
  });

  test("findCompatibleSheets returns false when only transactions tab exists", async () => {
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("drive/v3/files")) {
        return json({ files: [{ id: "f1", name: "Sheet1", modifiedTime: "2026-01-01" }] });
      }
      if (url.includes("sheets.googleapis.com") && url.includes("fields=sheets.properties.title")) {
        return json({ sheets: [
          { properties: { title: "INCOME AND EXPENSES" } },
        ] });
      }
      return json({});
    });
    try {
      const result = await findCompatibleSheets("token");
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });

  test("findCompatibleSheets returns false when headers are invalid", async () => {
    const restore = installFetch(async (input) => {
      const url = decodeURIComponent(String(input));
      if (url.includes("drive/v3/files")) {
        return json({ files: [{ id: "f1", name: "Sheet1", modifiedTime: "2026-01-01" }] });
      }
      if (url.includes("sheets.googleapis.com") && url.includes("fields=sheets.properties.title")) {
        return json({ sheets: [
          { properties: { title: "INCOME AND EXPENSES" } },
          { properties: { title: "MONTHLY SUMMARY" } },
        ] });
      }
      if (url.includes("values:batchGet")) {
        return json({ valueRanges: [
          { values: [["X", "Y", "Z"]] },
          { values: [["A", "B", "C"]] },
        ] });
      }
      return json({});
    });
    try {
      const result = await findCompatibleSheets("token");
      expect(result).toEqual([]);
    } finally {
      restore();
    }
  });
});
