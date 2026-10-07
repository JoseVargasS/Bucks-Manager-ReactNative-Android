import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";
import { T } from "@/theme/typography";

/** Shared styles used across multiple components — radios y sombras usan tokens del tema */
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
    borderRadius: RADIUS.xl,
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
  recordTitle: { flex: 1, minWidth: 0, ...T.title },
  closeBtn: {
    width: 42,
    height: 42,
    borderRadius: RADIUS.lg,
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
  },

  // Form shared
  label: { ...T.label, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderRadius: RADIUS.md,
    paddingVertical: 11,
    paddingHorizontal: 12,
    ...T.input,
  },
  inputIcon: { position: "absolute", right: 14, top: 12 },

  // Shared text/layout
  empty: { padding: 18, textAlign: "center", ...T.metadata },
  mobileEmptyCard: { borderWidth: 0, borderRadius: RADIUS.xl },
  sectionTitle: {
    alignSelf: "flex-start",
    ...T.section,
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
  cancelBtn: { borderRadius: RADIUS.sm, paddingVertical: 12, paddingHorizontal: 14 },
  saveBtn: { borderRadius: RADIUS.sm, paddingVertical: 12, paddingHorizontal: 18 },
  saveText: { ...T.label, fontWeight: "700" },

  // Financial text – tabular numbers for consistent digit widths
  financialText: {
    fontVariant: ["tabular-nums"],
  },

  // Sombras — el color se inyecta desde el tema (colors.shadow) para no verse duro en light
  // Uso: style={[base.shadowSm, { shadowColor: colors.shadow }]}
  shadowSm: {
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  shadowLg: {
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 8,
  },
});
