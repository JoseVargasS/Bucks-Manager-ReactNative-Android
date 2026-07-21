jest.mock("expo-file-system/legacy", () => ({
  cacheDirectory: "file://cache/",
  writeAsStringAsync: jest.fn().mockResolvedValue(undefined),
  deleteAsync: jest.fn().mockResolvedValue(undefined),
  copyAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("expo-print", () => ({
  printToFileAsync: jest.fn().mockResolvedValue({ uri: "file://print/output.pdf" }),
}));

jest.mock("expo-sharing", () => ({
  shareAsync: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("react-native", () => ({
  Alert: { alert: jest.fn() },
}));

import { renderHook, waitFor } from "@testing-library/react-native";
import { Alert } from "react-native";
import { useExport } from "@/hooks/useExport";
import type { Transaction } from "@/types";

const mockAlert = Alert.alert as jest.Mock;
const mockShare = jest.requireMock("expo-sharing").shareAsync;
const mockWrite = jest.requireMock("expo-file-system/legacy").writeAsStringAsync;
const mockPrint = jest.requireMock("expo-print").printToFileAsync;
const mockDelete = jest.requireMock("expo-file-system/legacy").deleteAsync;
const mockCopy = jest.requireMock("expo-file-system/legacy").copyAsync;

const copy = {
  exportMovements: "Exportar movimientos",
  noDataToExport: "No hay datos para exportar.",
  csvHeader: "Fecha,Monto,Detalle,Tipo,Hora de creacion",
  exportPdf: "Exportar PDF",
} as any;

const getErrorMessage = jest.fn((e: unknown) => (e as Error).message);

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  rowId: 1, date: "15-ene-26", rawDate: "2026-01-15T12:00:00.000Z",
  amount: -50, detail: "Test", type: "GASTO NO FRECUENTE", tags: [], createdAt: "12:00",
  ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
});

describe("useExport", () => {
  test("exportMinDate is empty string with no transactions", async () => {
    const { result } = await renderHook(() => useExport([], "S/", copy, getErrorMessage));
    expect(result.current.exportMinDate).toBe("");
  });

  test("exportMinDate computed from transactions", async () => {
    const txs = [
      makeTx({ rawDate: "2026-03-01T00:00:00.000Z" }),
      makeTx({ rawDate: "2025-12-15T00:00:00.000Z" }),
      makeTx({ rawDate: "2026-01-15T00:00:00.000Z" }),
    ];
    const { result } = await renderHook(() => useExport(txs, "S/", copy, getErrorMessage));
    expect(result.current.exportMinDate).toBe("2025-12-15");
  });

  test("startExport with CSV writes and shares file", async () => {
    const tx = makeTx({ amount: -100, detail: 'Comida "extra"', createdAt: "12:30" });
    const { result } = await renderHook(() => useExport([tx], "S/", copy, getErrorMessage));

    result.current.startExport({
      format: "xlsx", rangeMode: "dates",
      startDate: "2026-01-01", endDate: "2026-12-31",
    });

    await waitFor(() => {
      expect(mockWrite).toHaveBeenCalled();
    });
    expect(mockShare).toHaveBeenCalledWith(
      expect.stringContaining(".csv"),
      expect.objectContaining({ mimeType: "text/csv" }),
    );
  });

  test("startExport with PDF prints and shares file", async () => {
    const tx = makeTx({ amount: -100 });
    const { result } = await renderHook(() => useExport([tx], "$", copy, getErrorMessage));

    result.current.startExport({
      format: "pdf", rangeMode: "dates",
      startDate: "2026-01-01", endDate: "2026-12-31",
    });

    await waitFor(() => {
      expect(mockPrint).toHaveBeenCalled();
    });
    expect(mockDelete).toHaveBeenCalled();
    expect(mockCopy).toHaveBeenCalled();
    expect(mockShare).toHaveBeenCalledWith(
      expect.stringContaining(".pdf"),
      expect.objectContaining({ mimeType: "application/pdf" }),
    );
  });

  test("startExport with months range mode", async () => {
    const txs = [
      makeTx({ rawDate: "2026-03-15T00:00:00.000Z" }),
      makeTx({ rawDate: "2026-01-10T00:00:00.000Z" }),
    ];
    const { result } = await renderHook(() => useExport(txs, "S/", copy, getErrorMessage));

    result.current.startExport({
      format: "xlsx", rangeMode: "months",
      startDate: "2026-01", endDate: "2026-02",
    });

    await waitFor(() => {
      expect(mockWrite).toHaveBeenCalled();
    });
  });

  test("alerts when no rows match filter", async () => {
    const tx = makeTx({ rawDate: "2025-01-01T00:00:00.000Z" });
    const { result } = await renderHook(() => useExport([tx], "S/", copy, getErrorMessage));

    result.current.startExport({
      format: "xlsx", rangeMode: "dates",
      startDate: "2026-01-01", endDate: "2026-12-31",
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalled();
    });
    expect(mockWrite).not.toHaveBeenCalled();
  });

  test("alerts on export error", async () => {
    mockWrite.mockRejectedValueOnce(new Error("disk full"));
    const tx = makeTx();
    const { result } = await renderHook(() => useExport([tx], "S/", copy, getErrorMessage));

    result.current.startExport({
      format: "xlsx", rangeMode: "dates",
      startDate: "2026-01-01", endDate: "2026-12-31",
    });

    await waitFor(() => {
      expect(mockAlert).toHaveBeenCalledWith(
        copy.exportMovements,
        "disk full",
      );
    });
  });
});
