import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";

export const loginStyles = StyleSheet.create({
  loginScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
  },
  loginMark: {
    width: 78,
    height: 78,
    borderRadius: RADIUS["2xl"],
    borderWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: "700",
    letterSpacing: 0,
    textAlign: "center",
  },
  googleLoginBtn: {
    minWidth: 232,
    minHeight: 50,
    marginTop: 22,
    borderRadius: RADIUS.lg,
    paddingVertical: 12,
    paddingHorizontal: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  googleLoginText: { fontSize: 15, fontWeight: "700" },
  loginStatus: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
});
