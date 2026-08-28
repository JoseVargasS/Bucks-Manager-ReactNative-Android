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
  mono: "monospace",
  condensed: "sans-serif-condensed",
  light: "sans-serif-light",
  casual: "casual",
  smallcaps: "sans-serif-smallcaps",
  inter: "Inter",
  fredoka: "Fredoka",
  jetbrainsmono: "JetBrainsMono",
  spacemono: "SpaceMono",
  orbitron: "Orbitron",
  playfair: "PlayfairDisplay",
  bebasneue: "BebasNeue",
  comicneue: "ComicNeue",
  sora: "Sora",
  patrickhand: "PatrickHand",
  plusjakartasans: "PlusJakartaSans",
  intervariable: "InterVariable",
  comicsansms: "ComicSansMS",
  proggysquare: "ProggySquare",

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

export const FONT_SIZE_SCALE: Partial<Record<FontPreference, number>> = {
  proggysquare: 1.4,
  comicsansms: 1.2,
};

export const FONT_ICONS: Record<FontPreference, MaterialIconName> = {
  dmsans: "format-font",
  serif: "format-letter-case",
  mono: "code-tags",
  condensed: "format-letter-spacing",
  light: "feather",
  casual: "draw",
  smallcaps: "format-letter-case-upper",
  inter: "format-font",
  intervariable: "format-font",
  jetbrainsmono: "code-tags",
  spacemono: "code-tags",
  orbitron: "rocket-launch",
  playfair: "format-letter-case",
  bebasneue: "format-letter-spacing",
  fredoka: "balloon",
  comicneue: "emoticon-happy",
  patrickhand: "draw",
  sora: "format-font",
  plusjakartasans: "format-font",
  comicsansms: "emoticon-happy",
  proggysquare: "code-tags",

};
