import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  body: { padding: 14, gap: 10 },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 40,
    fontWeight: "600",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  colorSwatches: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  swatch: { width: 28, height: 28, borderRadius: 14, borderWidth: 2 },
  flatList: { maxHeight: 260 },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  tagDot: { width: 24, height: 24, borderRadius: 12 },
  editInput: {
    flex: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    minHeight: 32,
    fontWeight: "600",
  },
  editColorRow: { flexDirection: "row", gap: 4, flex: 1, flexWrap: "wrap" },
  editColorDot: { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5 },
  tagLabel: { flex: 1, fontWeight: "600", fontSize: 14 },
  customBadge: { fontSize: 10, fontWeight: "400", marginRight: 4 },
});
