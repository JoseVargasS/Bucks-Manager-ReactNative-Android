describe("tags", () => {
  let mergeTagsFromSheet: typeof import("../src/utils/tags").mergeTagsFromSheet;
  let labelForTagId: typeof import("../src/utils/tags").labelForTagId;
  let migrateTransactionTags: typeof import("../src/utils/tags").migrateTransactionTags;

  beforeAll(async () => {
    const mod = await import("../src/utils/tags");
    mergeTagsFromSheet = mod.mergeTagsFromSheet;
    labelForTagId = mod.labelForTagId;
    migrateTransactionTags = mod.migrateTransactionTags;
  });

  const currentTags = [
    { id: "default-comida", label: "Comida", color: "#f59e0b" },
    { id: "default-salud", label: "Salud", color: "#f43f5e" },
    { id: "custom-viaje", label: "Viaje", color: "#0ea5e9" },
  ];

  test("labelForTagId returns custom label for custom- prefix id", () => {
    expect(labelForTagId("custom-mi-tag-personal", currentTags)).toBe("Mi Tag Personal");
    expect(labelForTagId("custom-cafe-paseo", currentTags)).toBe("Cafe Paseo");
  });

  test("labelForTagId returns id as fallback for unknown non-custom id", () => {
    expect(labelForTagId("ghost-id", currentTags)).toBe("ghost-id");
  });

  test("mergeTagsFromSheet adds new custom tags from transactions", () => {
    const transactions = [
      { rowId: 1, tags: ["custom-nuevo", "default-comida"] },
      { rowId: 2, tags: ["custom-otro"] },
    ];
    const sheetTags: any[] = [];
    const tagColors = ["#ff0000", "#00ff00"];
    const result = mergeTagsFromSheet(currentTags, sheetTags, transactions as any, tagColors);
    expect(result.some((t: any) => t.id === "custom-nuevo")).toBeTruthy();
    expect(result.some((t: any) => t.id === "custom-otro")).toBeTruthy();
    expect(result.find((t: any) => t.id === "custom-nuevo")!.color).toBe("#ff0000");
    expect(result.find((t: any) => t.id === "custom-otro")!.color).toBe("#00ff00");
  });

  test("mergeTagsFromSheet updates default tag color from sheet", () => {
    const sheetTags = [{ id: "default-comida", label: "Comida", color: "#111111" }];
    const result = mergeTagsFromSheet(currentTags, sheetTags, [], []);
    expect(result.find((t: any) => t.id === "default-comida")!.color).toBe("#111111");
  });

  test("mergeTagsFromSheet adds custom tags from sheet", () => {
    const sheetTags = [{ id: "custom-sheet-tag", label: "SheetTag", color: "#abcdef" }];
    const result = mergeTagsFromSheet(currentTags, sheetTags, [], []);
    expect(result.some((t: any) => t.id === "custom-sheet-tag")).toBeTruthy();
  });

  test("mergeTagsFromSheet returns same array when nothing changes", () => {
    const result = mergeTagsFromSheet(currentTags, [], [], []);
    expect(result).toBe(currentTags);
  });

  test("migrateTransactionTags migrates line items tags", () => {
    const txs = [
      {
        rowId: 1, date: "", rawDate: "", amount: 0, detail: "A", type: "GASTO FRECUENTE", createdAt: "", tags: [],
        lineItems: [
          { id: "li-1", amount: 10, description: "Item", tags: ["Food"] },
          { id: "li-2", amount: 20, description: "Item2", tags: ["default-comida"] },
        ],
      },
    ];
    const result = migrateTransactionTags(txs as any, currentTags);
    expect(result[0].lineItems![0].tags[0]).toBe("default-comida");
    expect(result[0].lineItems![1].tags[0]).toBe("default-comida");
  });

  test("migrateTransactionTags returns same array when nothing changes (line items)", () => {
    const txs = [
      {
        rowId: 1, date: "", rawDate: "", amount: 0, detail: "A", type: "GASTO FRECUENTE", createdAt: "",
        tags: ["default-comida"],
        lineItems: [
          { id: "li-1", amount: 10, description: "Item", tags: ["default-comida"] },
        ],
      },
    ];
    const result = migrateTransactionTags(txs as any, currentTags);
    expect(result).toBe(txs);
  });

  test("labelForTagId reconstructs label from custom- prefix", () => {
    expect(labelForTagId("custom-gym", currentTags)).toBe("Gym");
    expect(labelForTagId("custom-tag-con-guiones", currentTags)).toBe("Tag Con Guiones");
  });
});
