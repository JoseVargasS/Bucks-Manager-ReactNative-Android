// Simplified React mock (hooks are tested without render)
const __hookStates: any[] = [];
const __hookRefs: any[] = [];
let __hookStateIdx = 0;
let __hookRefIdx = 0;
jest.mock("react", () => ({
  useState: (init: any) => {
    const i = __hookStateIdx++;
    if (__hookStates[i] === undefined) __hookStates[i] = typeof init === "function" ? init() : init;
    const set = (v: any) => { __hookStates[i] = typeof v === "function" ? v(__hookStates[i]) : v; };
    return [__hookStates[i], set];
  },
  useEffect: () => {},
  useMemo: (fn: any) => fn(),
  useCallback: (fn: any) => fn,
  useRef: (init: any) => {
    const i = __hookRefIdx++;
    if (__hookRefs[i] === undefined) __hookRefs[i] = { current: init };
    return __hookRefs[i];
  },
}));
jest.mock("react-native", () => ({
  Alert: (globalThis as any).__bucksAlertMock || { alert: () => {} },
  Platform: { OS: "android", select: (o: any) => o.android ?? o.default },
  Dimensions: { get: () => ({ width: 390, height: 844 }) },
  PixelRatio: { get: () => 3 },
}));

describe("useExport", () => {
  const g = globalThis as any;
  g.__bucksAlertMock = { alert: (...args: any[]) => { g.__lastAlertArgs = args; } };
  g.__bucksExpoPrintMock = { printToFileAsync: async () => ({ uri: "mock://print-output.pdf" }) };
  g.__bucksExpoSharingMock = { shareAsync: async () => {} };

  const txJan = {
    rowId: 2,
    date: "15-jan-26",
    rawDate: "2026-01-15T05:00:00.000Z",
    amount: -100,
    detail: "Almuerzo",
    type: "GASTO FRECUENTE",
    createdAt: "2026-01-15T12:30:45.000Z",
    tags: [],
  } as any;

  const txFeb = {
    rowId: 3,
    date: "20-feb-26",
    rawDate: "2026-02-20T05:00:00.000Z",
    amount: 500,
    detail: "Freelance",
    type: "INGRESO FRECUENTE",
    createdAt: "2026-02-20T08:15:00.000Z",
    tags: [],
  } as any;

  const txMar = {
    rowId: 4,
    date: "10-mar-26",
    rawDate: "2026-03-10T05:00:00.000Z",
    amount: -200,
    detail: "Transporte",
    type: "GASTO NO FRECUENTE",
    createdAt: "2026-03-10T18:00:00.000Z",
    tags: [],
  } as any;

  const allTx = [txJan, txFeb, txMar];

  const copy = {
    csvHeader: "Fecha,Monto,Detalle,Tipo,Hora de creacion",
    exportPdf: "Export PDF",
    exportMovements: "Exportar movimientos",
    noDataToExport: "No hay datos para exportar.",
  } as any;

  const fileSystemMock = g.__bucksFileSystemMock;

  function resetAll() {
    fileSystemMock.reset();
    g.__bucksExpoPrintMock.printToFileAsync = async () => ({ uri: "mock://print-output.pdf" });
    g.__bucksExpoSharingMock.shareAsync = async () => {};
    g.__lastAlertArgs = undefined;
  }

  function flushMicrotasks() {
    return new Promise((r) => setTimeout(r, 50));
  }

  beforeEach(() => resetAll());

  let useExport: typeof import("../src/hooks/useExport.ts").useExport;

  beforeAll(async () => {
    const mod = await import("../src/hooks/useExport.ts");
    useExport = mod.useExport;
  });

  // ─── CSV export ───

  test("CSV export filters transactions by date range", async () => {
    const api = useExport(allTx, "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-02-28",
    });

    const written = fileSystemMock.files;
    const csvPath = [...written.keys()].find((k) => k.endsWith(".csv"));
    expect(csvPath).toBeTruthy();
    const csv = written.get(csvPath);
    expect(csv).toContain("Fecha,Monto,Detalle,Tipo,Hora de creacion");
    expect(csv).toContain("Almuerzo");
    expect(csv).toContain("Freelance");
    expect(csv).not.toContain("Transporte");
  });

  test("CSV export includes all transactions when no date range", async () => {
    const api = useExport(allTx, "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "dates",
      startDate: "",
      endDate: "",
    });

    const csvPath = [...fileSystemMock.files.keys()].find((k) => k.endsWith(".csv"));
    const csv = fileSystemMock.files.get(csvPath);
    expect(csv).toContain("Almuerzo");
    expect(csv).toContain("Freelance");
    expect(csv).toContain("Transporte");
  });

  test("CSV export escapes quotes in detail field", async () => {
    const tx = { ...txJan, detail: 'Detail with "quotes"' };
    const api = useExport([tx], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    const csvPath = [...fileSystemMock.files.keys()].find((k) => k.endsWith(".csv"));
    const csv = fileSystemMock.files.get(csvPath);
    expect(csv).toContain('Detail with ""quotes""');
  });

  test("CSV export shares with text/csv mime type", async () => {
    let shareCall: any = null;
    g.__bucksExpoSharingMock.shareAsync = async (uri: string, opts: any) => {
      shareCall = { uri, ...opts };
    };
    const api = useExport([txJan], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    expect(shareCall).toBeTruthy();
    expect(shareCall.mimeType).toBe("text/csv");
  });

  // ─── PDF export ───

  test("PDF export generates HTML and calls printToFileAsync", async () => {
    let printCall: any = null;
    g.__bucksExpoPrintMock.printToFileAsync = async (opts: any) => {
      printCall = opts;
      return { uri: "mock://print-output.pdf" };
    };
    const api = useExport([txJan], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "pdf",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    expect(printCall).toBeTruthy();
    expect(printCall.html).toContain("<table");
    expect(printCall.html).toContain("Almuerzo");
  });

  test("PDF export filters by date range", async () => {
    let printCall: any = null;
    g.__bucksExpoPrintMock.printToFileAsync = async (opts: any) => {
      printCall = opts;
      return { uri: "mock://print-output.pdf" };
    };
    const api = useExport(allTx, "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "pdf",
      rangeMode: "dates",
      startDate: "2026-03-01",
      endDate: "2026-03-31",
    });

    expect(printCall.html).toContain("Transporte");
    expect(printCall.html).not.toContain("Almuerzo");
    expect(printCall.html).not.toContain("Freelance");
  });

  test("PDF export shares with application/pdf mime type", async () => {
    let shareCall: any = null;
    g.__bucksExpoSharingMock.shareAsync = async (uri: string, opts: any) => {
      shareCall = { uri, ...opts };
    };
    const api = useExport([txJan], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "pdf",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    await flushMicrotasks();

    expect(shareCall).toBeTruthy();
    expect(shareCall.mimeType).toBe("application/pdf");
  });

  test("Month range filters correctly", async () => {
    const api = useExport(allTx, "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "months",
      startDate: "2026-01",
      endDate: "2026-02",
    });

    const csvPath = [...fileSystemMock.files.keys()].find((k) => k.endsWith(".csv"));
    const csv = fileSystemMock.files.get(csvPath);
    expect(csv).toContain("Almuerzo");
    expect(csv).toContain("Freelance");
    expect(csv).not.toContain("Transporte");
  });

  test("Single month range includes only that month", async () => {
    const api = useExport(allTx, "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "months",
      startDate: "2026-02",
      endDate: "2026-02",
    });

    const csvPath = [...fileSystemMock.files.keys()].find((k) => k.endsWith(".csv"));
    const csv = fileSystemMock.files.get(csvPath);
    const lines = csv.split("\n").filter(Boolean);
    expect(lines.length).toBe(2);
    expect(csv).toContain("Freelance");
  });

  // ─── No data case ───

  test("No data shows alert and does not write file", async () => {
    const api = useExport([], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    expect(g.__lastAlertArgs).toEqual(["Exportar movimientos", "No hay datos para exportar."]);
    expect(Object.keys(fileSystemMock.files).length).toBe(0);
  });

  test("No data for PDF shows alert without calling print", async () => {
    let printCalled = false;
    g.__bucksExpoPrintMock.printToFileAsync = async () => {
      printCalled = true;
      return { uri: "mock://print-output.pdf" };
    };
    const api = useExport([], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "pdf",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });

    expect(printCalled).toBe(false);
  });

  // ─── File naming ───

  test("CSV filename includes date range", async () => {
    const api = useExport([txJan], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });

    const csvPath = [...fileSystemMock.files.keys()].find((k) => k.endsWith(".csv"));
    expect(csvPath).toContain("2026-01-01");
    expect(csvPath).toContain("2026-03-31");
    expect(csvPath).toContain(".csv");
  });

  test("PDF filename includes date range", async () => {
    g.__bucksExpoPrintMock.printToFileAsync = async () => ({ uri: "mock://print-output.pdf" });
    const api = useExport([txJan], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "pdf",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-03-31",
    });
    await flushMicrotasks();

    const pdfPath = [...fileSystemMock.files.keys()].find((k) => k.endsWith(".pdf"));
    expect(pdfPath).toBeTruthy();
    expect(pdfPath).toContain("bucks-manager");
    expect(pdfPath).toContain(".pdf");
  });

  test("Month-range filename uses month names", async () => {
    const api = useExport([txJan], "$", copy, (e: any) => String(e));

    await api.startExport({
      format: "xlsx",
      rangeMode: "months",
      startDate: "2026-01",
      endDate: "2026-03",
    });

    const csvPath = [...fileSystemMock.files.keys()].find((k) => k.endsWith(".csv"));
    expect(csvPath).toContain("january-2026");
    expect(csvPath).toContain("march-2026");
  });

  // ─── exportMinDate ───

  test("exportMinDate is earliest transaction date", async () => {
    const api = useExport(allTx, "$", copy, (e: any) => String(e));
    expect(api.exportMinDate).toBe("2026-01-15");
  });

  test("exportMinDate is empty for empty transactions", async () => {
    const api = useExport([], "$", copy, (e: any) => String(e));
    expect(api.exportMinDate).toBe("");
  });

  // ─── Error handling ───

  test("startExport shows error alert on failure", async () => {
    g.__bucksExpoPrintMock.printToFileAsync = async () => {
      throw new Error("disk full");
    };
    const api = useExport([txJan], "$", copy, (e: any) => `Error: ${e.message}`);

    await api.startExport({
      format: "pdf",
      rangeMode: "dates",
      startDate: "2026-01-01",
      endDate: "2026-01-31",
    });
    await flushMicrotasks();

    expect(g.__lastAlertArgs).toEqual(["Exportar movimientos", "Error: disk full"]);
  });
});
