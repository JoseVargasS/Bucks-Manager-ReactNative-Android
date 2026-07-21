jest.mock("@/api/googleWorkspace", () => ({
  removeTagsFromAllRows: jest.fn(),
}));

jest.mock("react-native", () => ({}));

jest.mock("@/utils/tags", () => ({
  loadTags: jest.fn(),
  migrateTransactionTags: jest.fn((txs: unknown[]) => txs),
}));

import { renderHook, waitFor } from "@testing-library/react-native";
import { useTagSyncEffects } from "@/hooks/useTagSync";
import { loadTags } from "@/utils/tags";
import { removeTagsFromAllRows } from "@/api/googleWorkspace";
import type { Tag, Transaction } from "@/types";

const mockLoadTags = loadTags as jest.Mock;
const mockRemoveTags = removeTagsFromAllRows as jest.Mock;

const baseTags: Tag[] = [
  { id: "default-comida", label: "Comida", color: "#f59e0b" },
  { id: "default-salud", label: "Salud", color: "#f43f5e" },
];

const makeTx = (overrides: Partial<Transaction> = {}): Transaction => ({
  rowId: 1, date: "15-jan-26", rawDate: "2026-01-15T12:00:00.000Z", amount: -50,
  detail: "Test", type: "GASTO NO FRECUENTE", ...overrides,
});

beforeEach(() => {
  jest.clearAllMocks();
  mockLoadTags.mockResolvedValue(baseTags);
  mockRemoveTags.mockResolvedValue(undefined);
});

describe("useTagSyncEffects", () => {
  test("loads tags on mount", async () => {
    const setTagsList = jest.fn();
    const replaceTransactions = jest.fn();

    await renderHook(() =>
      useTagSyncEffects("es", replaceTransactions, "tok", "sid", [], setTagsList),
    );

    await waitFor(() => {
      expect(mockLoadTags).toHaveBeenCalledWith("es");
    });
  });

  test("cleans orphaned tags from transactions on tags change", async () => {
    const txs = [makeTx({ tags: ["default-comida", "orphan-tag"] })];
    let currentTxs = [...txs];
    const replaceTransactions = jest.fn().mockImplementation(
      (updater: (prev: Transaction[]) => Transaction[]) => { currentTxs = updater(currentTxs); },
    );
    const setTagsList = jest.fn();

    mockLoadTags.mockResolvedValue(baseTags);

    const { rerender } = await renderHook(
      (props: { tagsList: Tag[]; accessToken: string | null; spreadsheetId: string | null }) =>
        useTagSyncEffects("es", replaceTransactions, props.accessToken, props.spreadsheetId, props.tagsList, setTagsList),
      { initialProps: { tagsList: [] as Tag[], accessToken: null, spreadsheetId: null } },
    );

    await waitFor(() => { expect(mockLoadTags).toHaveBeenCalled(); });

    rerender({ tagsList: baseTags, accessToken: "tok", spreadsheetId: "sid" });

    await waitFor(() => {
      expect(currentTxs[0].tags).toEqual(["default-comida"]);
    });
  });

  test("calls removeTagsFromAllRows when tags are removed", async () => {
    const replaceTransactions = jest.fn();
    const setTagsList = jest.fn();

    const { rerender } = await renderHook(
      (props: { tagsList: Tag[] }) =>
        useTagSyncEffects("es", replaceTransactions, "tok", "sid", props.tagsList, setTagsList),
      { initialProps: { tagsList: baseTags } },
    );

    rerender({ tagsList: baseTags.slice(0, 1) });

    await waitFor(() => {
      expect(mockRemoveTags).toHaveBeenCalledWith("tok", "sid", ["default-salud"]);
    });
  });

  test("handles loadTags rejection gracefully", async () => {
    mockLoadTags.mockRejectedValue(new Error("fail"));
    const setTagsList = jest.fn();
    const replaceTransactions = jest.fn();

    renderHook(() =>
      useTagSyncEffects("es", replaceTransactions, "tok", "sid", baseTags, setTagsList),
    );

    await waitFor(() => {
      expect(mockLoadTags).toHaveBeenCalled();
    });
  });

  test("cleans deleted tags from transactions in second effect", async () => {
    const txs = [makeTx({ tags: ["default-comida", "default-salud"] })];
    let currentTxs = [...txs];
    const replaceTransactions = jest.fn().mockImplementation(
      (updater: (prev: Transaction[]) => Transaction[]) => { currentTxs = updater(currentTxs); },
    );
    const setTagsList = jest.fn();

    mockLoadTags.mockResolvedValue(baseTags);

    const { rerender } = await renderHook(
      (props: { tagsList: Tag[]; accessToken: string | null; spreadsheetId: string | null }) =>
        useTagSyncEffects("es", replaceTransactions, props.accessToken, props.spreadsheetId, props.tagsList, setTagsList),
      { initialProps: { tagsList: baseTags, accessToken: "tok", spreadsheetId: "sid" } },
    );

    await waitFor(() => { expect(mockLoadTags).toHaveBeenCalled(); });

    const reducedTags = [baseTags[0]];
    rerender({ tagsList: reducedTags, accessToken: "tok", spreadsheetId: "sid" });

    await waitFor(() => {
      expect(currentTxs[0].tags).toEqual(["default-comida"]);
    });
  });

  test("handles removeTagsFromAllRows rejection gracefully", async () => {
    mockRemoveTags.mockRejectedValue(new Error("API error"));
    const txs = [makeTx({ tags: ["default-comida", "default-salud"] })];
    let currentTxs = [...txs];
    const replaceTransactions = jest.fn().mockImplementation(
      (updater: (prev: Transaction[]) => Transaction[]) => { currentTxs = updater(currentTxs); },
    );
    const setTagsList = jest.fn();

    mockLoadTags.mockResolvedValue(baseTags);

    const { rerender } = await renderHook(
      (props: { tagsList: Tag[]; accessToken: string | null; spreadsheetId: string | null }) =>
        useTagSyncEffects("es", replaceTransactions, props.accessToken, props.spreadsheetId, props.tagsList, setTagsList),
      { initialProps: { tagsList: baseTags, accessToken: "tok", spreadsheetId: "sid" } },
    );

    await waitFor(() => { expect(mockLoadTags).toHaveBeenCalled(); });

    const reducedTags = [baseTags[0]];
    rerender({ tagsList: reducedTags, accessToken: "tok", spreadsheetId: "sid" });

    await waitFor(() => {
      expect(mockRemoveTags).toHaveBeenCalledWith("tok", "sid", ["default-salud"]);
    });
  });

  test("does not call removeTagsFromAllRows when accessToken is null", async () => {
    const replaceTransactions = jest.fn();
    const setTagsList = jest.fn();

    const { rerender } = await renderHook(
      (props: { tagsList: Tag[] }) =>
        useTagSyncEffects("es", replaceTransactions, null, "sid", props.tagsList, setTagsList),
      { initialProps: { tagsList: baseTags } },
    );

    rerender({ tagsList: [baseTags[0]] });
    await waitFor(() => { expect(mockRemoveTags).not.toHaveBeenCalled(); });
  });
});
