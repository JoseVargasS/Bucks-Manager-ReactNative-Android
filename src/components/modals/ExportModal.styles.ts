import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";

export const exportModalStyles = StyleSheet.create({
  exportChip: {
    flex: 1,
    minHeight: 48,
    borderWidth: 1,
    borderRadius: RADIUS.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
});
