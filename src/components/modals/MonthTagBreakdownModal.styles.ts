import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";

export const monthTagBreakdownStyles = StyleSheet.create({
  modal: {
    borderRadius: RADIUS["2xl"],
    borderWidth: 0,
    width: "100%",
    maxWidth: 390,
    maxHeight: "90%",
    alignSelf: "center",
    overflow: "hidden",
  },
  body: { gap: 12, padding: 16 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  closeBtn: {
    width: 38,
    height: 38,
    borderRadius: RADIUS["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontWeight: "500",
    padding: 24,
  },
});
