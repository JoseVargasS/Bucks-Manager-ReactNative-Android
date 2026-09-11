import { StyleSheet, type TextStyle } from "react-native";

/**
 * Sistema tipográfico homogéneo — Quipu
 * Basado en impeccable/typeset + React Native Text docs:
 * - 5 tamaños core + 2 display, ratio 1.2-1.25 entre pasos
 * - Pesos: 400 body, 500 metadata, 600 label lista, 700 títulos/amounts
 * - App UI usa escala fija (rem-like), no clamp fluido
 * - tabular-nums para montos, lineHeight proporcional a fontSize
 */

export const TYPOGRAPHY = {
  caption: { fontSize: 11, fontWeight: "500" as const, lineHeight: 14 },
  tiny: { fontSize: 11, fontWeight: "700" as const, lineHeight: 14 },
  overline: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16, letterSpacing: 0.4, textTransform: "uppercase" as const },
  metadata: { fontSize: 12, fontWeight: "500" as const, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: "600" as const, lineHeight: 16 },
  labelMuted: { fontSize: 13, fontWeight: "400" as const, lineHeight: 18 },
  body: { fontSize: 15, fontWeight: "400" as const, lineHeight: 20 },
  bodyStrong: { fontSize: 15, fontWeight: "600" as const, lineHeight: 20 },
  input: { fontSize: 15, fontWeight: "500" as const, lineHeight: 20 },
  section: { fontSize: 17, fontWeight: "700" as const, lineHeight: 22 },
  title: { fontSize: 19, fontWeight: "700" as const, lineHeight: 24, letterSpacing: -0.2 },
  pageTitle: { fontSize: 26, fontWeight: "700" as const, lineHeight: 32, letterSpacing: 0 },
  pageSub: { fontSize: 13, fontWeight: "500" as const, lineHeight: 16 },
  amountList: { fontSize: 16, fontWeight: "700" as const, lineHeight: 20, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] } as TextStyle,
  amountHero: { fontSize: 20, fontWeight: "700" as const, lineHeight: 28, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] } as TextStyle,
  amountKpi: { fontSize: 24, fontWeight: "700" as const, lineHeight: 32, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] } as TextStyle,
  amountDisplay: { fontSize: 34, fontWeight: "700" as const, lineHeight: 40, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] } as TextStyle,
  amountStat: { fontSize: 17, fontWeight: "700" as const, lineHeight: 22, fontVariant: ["tabular-nums"] as TextStyle["fontVariant"] } as TextStyle,
  chartLabel: { fontSize: 10, fontWeight: "500" as const, lineHeight: 12 },
  chartValue: { fontSize: 9, fontWeight: "700" as const, lineHeight: 12 },
};

export const T = TYPOGRAPHY;

// Helper para Text con variante + tabular opcional
export const typographyStyles = StyleSheet.create({
  caption: TYPOGRAPHY.caption as TextStyle,
  tiny: TYPOGRAPHY.tiny as TextStyle,
  overline: TYPOGRAPHY.overline as TextStyle,
  metadata: TYPOGRAPHY.metadata as TextStyle,
  label: TYPOGRAPHY.label as TextStyle,
  labelMuted: TYPOGRAPHY.labelMuted as TextStyle,
  body: TYPOGRAPHY.body as TextStyle,
  bodyStrong: TYPOGRAPHY.bodyStrong as TextStyle,
  input: TYPOGRAPHY.input as TextStyle,
  section: TYPOGRAPHY.section as TextStyle,
  title: TYPOGRAPHY.title as TextStyle,
  pageTitle: TYPOGRAPHY.pageTitle as TextStyle,
  pageSub: TYPOGRAPHY.pageSub as TextStyle,
  amountList: TYPOGRAPHY.amountList as TextStyle,
  amountHero: TYPOGRAPHY.amountHero as TextStyle,
  amountKpi: TYPOGRAPHY.amountKpi as TextStyle,
  amountDisplay: TYPOGRAPHY.amountDisplay as TextStyle,
  amountStat: TYPOGRAPHY.amountStat as TextStyle,
  chartLabel: TYPOGRAPHY.chartLabel as TextStyle,
  chartValue: TYPOGRAPHY.chartValue as TextStyle,
});
