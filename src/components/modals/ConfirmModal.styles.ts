import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";

export const s = StyleSheet.create({
  body: { padding: 16, gap: 14 },
  previewCard: {
    borderRadius: RADIUS.xl,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  previewIcon: {
    width: 44,
    height: 44,
    borderRadius: RADIUS["2xl"],
    alignItems: "center",
    justifyContent: "center",
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  previewAmount: {
    marginTop: 2,
    fontSize: 20,
    fontWeight: "700",
    fontVariant: ["tabular-nums"],
  },
  previewDetail: {
    marginTop: 2,
    fontSize: 13,
    fontWeight: "500",
  },
  message: { fontSize: 14, fontWeight: "500", lineHeight: 20 },
});
