import { StyleSheet } from "react-native";

const KEY_W = 68;
const KEY_H = 52;
const DOT_SIZE = 18;
const DOT_GAP = 14;

export const s = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 28,
  },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 8, textAlign: "center" },
  subtitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 28,
    textAlign: "center",
    paddingHorizontal: 12,
  },
  dotRow: { flexDirection: "row", gap: DOT_GAP, marginBottom: 36 },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
    borderWidth: 2,
  },
  errorText: { fontSize: 13, fontWeight: "600", marginBottom: 16 },
  keypad: { gap: 10, alignItems: "center" },
  keypadRow: { flexDirection: "row", gap: 10, justifyContent: "center" },
  key: {
    width: KEY_W,
    height: KEY_H,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  keyText: { fontSize: 22, fontWeight: "600", fontVariant: ["tabular-nums"] },
  placeholder: { width: KEY_W, height: KEY_H },
});
