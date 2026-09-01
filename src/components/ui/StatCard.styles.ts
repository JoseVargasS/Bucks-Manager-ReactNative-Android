import { StyleSheet } from "react-native";
import { RADIUS } from "@/theme/radii";
import { T } from "@/theme/typography";

export const statCardStyles = StyleSheet.create({
  statCard: {
    flexGrow: 1,
    flexBasis: "48%",
    minWidth: 0,
    borderWidth: 0,
    borderRadius: RADIUS.xl,
    padding: 12,
    position: "relative",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statIcon: {
    width: 40,
    height: 40,
    borderRadius: RADIUS.pill,
    alignItems: "center",
    justifyContent: "center",
  },
  statContent: { flex: 1, minWidth: 0 },
  statLabel: {
    ...T.metadata,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  statValue: {
    ...T.amountStat,
    marginTop: 4,
  },
  editStat: { position: "absolute", right: 10, top: 10 },
  kpi: { flex: 1, minWidth: 0, borderWidth: 0, borderRadius: RADIUS.xl, padding: 14 },
  kpiValue: {
    ...T.amountKpi,
    marginTop: 6,
  },
});
