import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";
import { T } from "@/theme/typography";

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
    borderRadius: RADIUS["2xl"],
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  groupedTxMain: { flex: 1, minWidth: 0 },
  groupedTxTitle: { ...T.bodyStrong },
  groupedTxMeta: { marginTop: 2, ...T.labelMuted },
  groupedTxAmount: {
    maxWidth: 122,
    ...T.amountList,
    textAlign: "right",
  },
  sectionCardRow: { marginHorizontal: 14 },
  sectionCardFirstRow: { borderTopLeftRadius: 14, borderTopRightRadius: 14 },
  sectionCardLastRow: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
});
