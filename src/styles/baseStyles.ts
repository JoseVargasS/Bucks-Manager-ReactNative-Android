import { StyleSheet } from "react-native";

/** Shared styles used across multiple components */
export const base = StyleSheet.create({
  // Layout
  pageScroll: { paddingBottom: 136 },
  pageScrollMobile: { paddingHorizontal: 14 },

  // Modal base
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    padding: 14,
  },
  modal: {
    borderRadius: 8,
    padding: 16,
    maxWidth: 620,
    maxHeight: "90%",
    width: "100%",
    alignSelf: "center",
  },
  optionBackdrop: { ...StyleSheet.absoluteFill },

  // Record modal shared
  recordHeader: {
    minHeight: 68,
    borderBottomWidth: 1,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  recordTitle: { flex: 1, minWidth: 0, fontSize: 19, fontWeight: "700" },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  // Form shared
  label: { fontSize: 13, fontWeight: "600", marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 11,
    paddingHorizontal: 12,
    fontSize: 15,
    fontWeight: "500",
  },
  inputIcon: { position: "absolute", right: 14, top: 12 },

  // Shared text/layout
  empty: { padding: 18, textAlign: "center", fontWeight: "500" },
  mobileEmptyCard: { borderWidth: 0, borderRadius: 14 },
  sectionTitle: {
    alignSelf: "flex-start",
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 12,
  },

  // Modal actions shared
  twoCols: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  modalActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 8,
  },
  cancelBtn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 14 },
  saveBtn: { borderRadius: 8, paddingVertical: 12, paddingHorizontal: 18 },
  saveText: { fontWeight: "700" },

  // Financial text – tabular numbers for consistent digit widths
  financialText: {
    fontVariant: ["tabular-nums"],
  },

  // Pure-black shadows with controlled opacity (Obsidian standard)
  shadowSm: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLg: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
