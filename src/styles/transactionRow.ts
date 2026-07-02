import { StyleSheet } from "react-native";

export const txStyles = StyleSheet.create({
  groupedTxRow: {
    minHeight: 68,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  txIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  groupedTxMain: { flex: 1, minWidth: 0 },
  groupedTxTitle: { fontSize: 15, fontWeight: "600" },
  groupedTxMeta: { marginTop: 2, fontSize: 13, fontWeight: "400" },
  groupedTxAmount: {
    maxWidth: 122,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "right",
    fontVariant: ["tabular-nums"],
  },
  sectionCardRow: { marginHorizontal: 14 },
  sectionCardFirstRow: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  sectionCardLastRow: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});
