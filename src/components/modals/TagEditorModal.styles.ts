import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";

export const s = StyleSheet.create({
  body: { padding: 14, gap: 10 },
  addRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  input: {
    flex: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 12,
    minHeight: 40,
    fontWeight: "600",
  },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: RADIUS["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  flatList: { maxHeight: 260 },
  tagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  tagDot: { width: 24, height: 24, borderRadius: RADIUS.lg },
  editInput: {
    flex: 1,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 8,
    minHeight: 32,
    fontWeight: "600",
  },
  tagLabel: { flex: 1, fontWeight: "600", fontSize: 14 },
  customBadge: { fontSize: 10, fontWeight: "400", marginRight: 4 },
});
