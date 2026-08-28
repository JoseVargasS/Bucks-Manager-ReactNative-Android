import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";

export const searchModalStyles = StyleSheet.create({
  searchOverlay: { flex: 1, justifyContent: "flex-end" },
  searchSheet: {
    width: "100%",
    maxHeight: "88%",
    borderTopWidth: 0,
    borderTopLeftRadius: RADIUS["2xl"],
    borderTopRightRadius: RADIUS["2xl"],
    overflow: "hidden",
  },
  searchGrabber: {
    width: 42,
    height: 4,
    borderRadius: RADIUS.pill,
    alignSelf: "center",
    marginTop: 9,
    marginBottom: 8,
  },
  searchHeader: {
    minHeight: 66,
    paddingHorizontal: 16,
    paddingBottom: 13,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  searchHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  searchTitleBlock: { flex: 1, minWidth: 0 },
  searchTitle: { fontSize: 19, fontWeight: "700" },
  searchSubtitle: { marginTop: 3, fontSize: 12, fontWeight: "500" },
  optionClose: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.lg,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },
});
