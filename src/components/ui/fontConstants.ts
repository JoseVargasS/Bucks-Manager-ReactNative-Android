import type { FontPreference, MaterialIconName } from "@/types";

/**
 * Evaluación default para app financiera (legibilidad prolongada + números):
 * - DM Sans: geométrica amigable, buena en titulares pero 0/O y 1/l menos
 *   distintivos; tabular-nums OK pero menor hinting en OLED pequeño.
 * - Plus Jakarta Sans: moderna, ascendentes generosos, 0/O OK pero menos
 *   probada en data-dense UI; buen peso OLED.
 * - Sora: display con contraste moderado, excelente para títulos, pero
 *   0/O y 1/l más ambiguos en 12-14px; no ideal para lectura prolongada.
 * - Inter / InterVariable: diseñada para UI, x-height alto, 0 con barra
 *   sutil, 1 con serif base, l con curva, tabular-nums nativo. Hinting
 *   superior en OLED/AMOLED, peso visual equilibrado en dark (no se lava)
 *   y light (no pesa). Mantiene 0/O y 1/l/I claramente distintos.
 * Conclusión: Inter (InterVariable si se carga variable font) es el mejor
 * default financiero. Se mantiene DM Sans por compatibilidad pero el nuevo
 * default recomendado es inter.
 */
export const FONT_FAMILIES: Record<FontPreference, string> = {
  dmsans: "DMSans",
  serif: "serif",
  condensed: "sans-serif-condensed",
  light: "sans-serif-light",
  casual: "casual",
  smallcaps: "sans-serif-smallcaps",
  inter: "Inter",
  fredoka: "Fredoka",
  comicneue: "ComicNeue",
  sora: "Sora",
  patrickhand: "PatrickHand",
  plusjakartasans: "PlusJakartaSans",
  intervariable: "InterVariable",
  comicsansms: "ComicSansMS",
};

// Escala global de tamaño de texto (5 niveles). Se multiplica sobre el
// tamaño base de cada componente: 15px * 1.08 = 16px (L), 19px * 1.08 ≈ 21px.
// Rango 0.85-1.15 evita romper BottomNav/Header/modales/KPIs.
export const FONT_SIZE_SCALE_LEVELS = {
  xs: 0.85,
  s: 0.92,
  m: 1.0,
  l: 1.08,
  xl: 1.15,
} as const;
export type FontSizeScaleKey = keyof typeof FONT_SIZE_SCALE_LEVELS;
export type FontSizeScaleValue = (typeof FONT_SIZE_SCALE_LEVELS)[FontSizeScaleKey];
export const FONT_SIZE_SCALE_VALUES = Object.values(FONT_SIZE_SCALE_LEVELS) as FontSizeScaleValue[];
export const DEFAULT_FONT_SIZE_SCALE: FontSizeScaleValue = 1.0;

// Tope del producto prefScale * globalScale en AppText. Sin tope, el peor
// caso (p. ej. patrickhand 1.12 x nivel xl 1.15 = 1.29x) supera el 1.15 que
// toleran BottomNav/Header/modales/KPIs. En 1.2 no cambia ningún
// comportamiento actual (comicsansms x 1.0 = 1.2 queda igual).
export const MAX_COMBINED_FONT_SCALE = 1.2;

// Corrección óptica por familia (x-height y peso visual relativos a inter,
// que queda en el default 1.0 junto a intervariable). Se multiplica sobre el
// nivel global en AppText: prefScale * globalScale.
export const FONT_SIZE_SCALE: Partial<Record<FontPreference, number>> = {
  dmsans: 1.04,
  plusjakartasans: 1.03,
  sora: 1.06,
  fredoka: 0.94,
  comicneue: 1.03,
  patrickhand: 1.12,
  comicsansms: 1.2,
  serif: 1.08,
  condensed: 1.05,
  light: 1.06,
  casual: 1.1,
  smallcaps: 1.1,
};

export const FONT_ICONS: Record<FontPreference, MaterialIconName> = {
  dmsans: "format-font",
  serif: "format-letter-case",
  condensed: "format-letter-spacing",
  light: "feather",
  casual: "draw",
  smallcaps: "format-letter-case-upper",
  inter: "format-font",
  intervariable: "format-font",
  fredoka: "balloon",
  comicneue: "emoticon-happy",
  patrickhand: "draw",
  sora: "format-font",
  plusjakartasans: "format-font",
  comicsansms: "emoticon-happy",
};
