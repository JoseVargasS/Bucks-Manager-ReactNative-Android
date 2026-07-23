import { StyleSheet } from "react-native";

export const monthTagBreakdownStyles = StyleSheet.create({
  modal: {
    borderRadius: 20,
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
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    textAlign: "center",
    fontWeight: "500",
    padding: 24,
  },
});
