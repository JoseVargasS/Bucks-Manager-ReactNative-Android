import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";

export const summaryStyles = StyleSheet.create({
  chartCard: {
    flex: 1,
    borderWidth: 0,
    borderRadius: RADIUS.xl,
    padding: 14,
    alignItems: "center",
    marginBottom: 12,
  },
});
