import { StyleSheet } from "react-native";
import { T } from "@/theme/typography";

export const modalHeaderStyles = StyleSheet.create({
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  modalTitle: { ...T.section },
});
