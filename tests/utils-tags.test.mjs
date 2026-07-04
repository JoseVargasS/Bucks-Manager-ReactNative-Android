import assert from "node:assert/strict";
import test from "node:test";
import "./setup.mjs";

const {
  mergeTagsFromSheet,
  labelForTagId,
  migrateTransactionTags,
  findTagById,
} = await import("../src/utils/tags.ts");

const currentTags = [
  { id: "default-comida", label: "Comida", color: "#f59e0b" },
  { id: "default-salud", label: "Salud", color: "#f43f5e" },
  { id: "custom-viaje", label: "Viaje", color: "#0ea5e9" },
];

test("labelForTagId returns custom label for custom- prefix id", () => {
  assert.equal(labelForTagId("custom-mi-tag-personal", currentTags), "Mi Tag Personal");
  assert.equal(labelForTagId("custom-cafe-paseo", currentTags), "Cafe Paseo");
});

test("labelForTagId returns id as fallback for unknown non-custom id", () => {
  assert.equal(labelForTagId("ghost-id", currentTags), "ghost-id");
});

test("mergeTagsFromSheet adds new custom tags from transactions", () => {
  const transactions = [
    { rowId: 1, tags: ["custom-nuevo", "default-comida"] },
    { rowId: 2, tags: ["custom-otro"] },
  ];
  const sheetTags = [];
  const tagColors = ["#ff0000", "#00ff00"];
  const result = mergeTagsFromSheet(currentTags, sheetTags, transactions, tagColors);
  assert.ok(result.some((t) => t.id === "custom-nuevo"));
  assert.ok(result.some((t) => t.id === "custom-otro"));
  assert.equal(result.find((t) => t.id === "custom-nuevo").color, "#ff0000");
  assert.equal(result.find((t) => t.id === "custom-otro").color, "#00ff00");
});

test("mergeTagsFromSheet updates default tag color from sheet", () => {
  const sheetTags = [{ id: "default-comida", label: "Comida", color: "#111111" }];
  const result = mergeTagsFromSheet(currentTags, sheetTags, [], []);
  assert.equal(result.find((t) => t.id === "default-comida").color, "#111111");
});

test("mergeTagsFromSheet adds custom tags from sheet", () => {
  const sheetTags = [{ id: "custom-sheet-tag", label: "SheetTag", color: "#abcdef" }];
  const result = mergeTagsFromSheet(currentTags, sheetTags, [], []);
  assert.ok(result.some((t) => t.id === "custom-sheet-tag"));
});

test("mergeTagsFromSheet returns same array when nothing changes", () => {
  const result = mergeTagsFromSheet(currentTags, [], [], []);
  assert.strictEqual(result, currentTags);
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
  const result = migrateTransactionTags(txs, currentTags);
  assert.equal(result[0].lineItems[0].tags[0], "default-comida");
  assert.equal(result[0].lineItems[1].tags[0], "default-comida");
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
  const result = migrateTransactionTags(txs, currentTags);
  assert.strictEqual(result, txs);
});

test("labelForTagId reconstructs label from custom- prefix", () => {
  assert.equal(labelForTagId("custom-gym", currentTags), "Gym");
  assert.equal(labelForTagId("custom-tag-con-guiones", currentTags), "Tag Con Guiones");
});
