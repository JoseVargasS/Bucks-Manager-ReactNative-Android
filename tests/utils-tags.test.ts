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

  // ─── Regression: deleted default tags must not reappear after reinstall ───

  test("mergeTagsFromSheet removes default tag deleted from sheet (reinstall scenario)", () => {
    // Simulates fresh install: SecureStore returns all 6 defaults, sheet has 5.
    const freshDefaults = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
      { id: "default-viaje", label: "Viaje", color: "#0ea5e9" },
      { id: "default-transporte", label: "Transporte", color: "#10b981" },
      { id: "default-ocio", label: "Ocio", color: "#8b5cf6" },
      { id: "default-educacion", label: "Educación", color: "#84cc16" },
    ];
    // User deleted "default-salud" from the sheet.
    const sheetTags = freshDefaults.filter((t) => t.id !== "default-salud");
    const result = mergeTagsFromSheet(freshDefaults, sheetTags, [], []);
    expect(result.find((t: any) => t.id === "default-salud")).toBeUndefined();
    expect(result.length).toBe(5);
  });

  test("mergeTagsFromSheet removes multiple default tags deleted from sheet", () => {
    const freshDefaults = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
      { id: "default-viaje", label: "Viaje", color: "#0ea5e9" },
    ];
    const sheetTags = [freshDefaults[0]]; // only Comida remains
    const result = mergeTagsFromSheet(freshDefaults, sheetTags, [], []);
    expect(result.length).toBe(1);
    expect(result[0].id).toBe("default-comida");
  });

  test("mergeTagsFromSheet keeps local custom tag not in sheet", () => {
    const defaults = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
    ];
    const localCustom = { id: "custom-mi-tag", label: "Mi Tag", color: "#abcdef" };
    const sheetTags = [...defaults]; // sheet doesn't have the custom tag yet
    const result = mergeTagsFromSheet([...defaults, localCustom], sheetTags, [], []);
    expect(result.some((t: any) => t.id === "custom-mi-tag")).toBeTruthy();
    expect(result.length).toBe(3);
  });

  test("mergeTagsFromSheet does not lose local custom tags when sheet has tags", () => {
    const localCustom = { id: "custom-pendiente", label: "Pendiente", color: "#123456" };
    const current = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      localCustom,
    ];
    const sheetTags = [{ id: "default-comida", label: "Comida", color: "#ff0000" }];
    const result = mergeTagsFromSheet(current, sheetTags, [], []);
    expect(result.some((t: any) => t.id === "custom-pendiente")).toBeTruthy();
    expect(result.find((t: any) => t.id === "default-comida")!.color).toBe("#ff0000");
  });

  test("mergeTagsFromSheet uses sheet as source of truth for defaults", () => {
    // User changed default-comida color to purple in another device.
    const localDefaults = [
      { id: "default-comida", label: "Comida", color: "#f59e0b" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
    ];
    const sheetTags = [
      { id: "default-comida", label: "Comida", color: "#800080" },
      { id: "default-salud", label: "Salud", color: "#f43f5e" },
    ];
    const result = mergeTagsFromSheet(localDefaults, sheetTags, [], []);
    expect(result.find((t: any) => t.id === "default-comida")!.color).toBe("#800080");
  });
});
