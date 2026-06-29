import { StyleSheet } from "react-native";

export const s = StyleSheet.create({
  body: { paddingHorizontal: 16, paddingBottom: 20 },
  subtitle: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 12,
    marginTop: 4,
  },
  emptyState: { paddingVertical: 32, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontWeight: "500" },
  list: { maxHeight: 420 },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  historyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  labelRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  deleteLabel: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  timestamp: { fontSize: 11, fontWeight: "500" },
  detail: { fontSize: 14, fontWeight: "600", marginTop: 1 },
  amount: { fontSize: 13, fontWeight: "600", fontVariant: ["tabular-nums"], marginTop: 1 },
  undoBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
