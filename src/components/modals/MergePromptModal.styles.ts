import { StyleSheet } from "react-native";

export const mergeStyles = StyleSheet.create({
  body: { padding: 16, gap: 16 },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 12,
  },
  countLabel: { fontSize: 14, fontWeight: "600" },
  countValue: { fontSize: 20, fontWeight: "700", fontVariant: ["tabular-nums"] },
  message: { fontSize: 14, fontWeight: "500", lineHeight: 20, textAlign: "center" },
});
