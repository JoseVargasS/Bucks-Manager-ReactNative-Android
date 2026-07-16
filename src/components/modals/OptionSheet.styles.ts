import { StyleSheet } from "react-native";

export const optionSheetStyles = StyleSheet.create({
  optionOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  optionHeader: {
    minHeight: 52,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionTitle: { fontSize: 17, fontWeight: "700" },
  optionClose: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
  },
  optionList: { flexShrink: 1 },
  optionListContent: { paddingBottom: 24 },
  optionRow: {
    minHeight: 50,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  optionIcon: {
    width: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  optionLabel: { flex: 1, minWidth: 0, fontSize: 16, fontWeight: "500" },
});
