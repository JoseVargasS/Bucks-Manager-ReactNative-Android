/**
 * Sistema de tokens de radio — 5 niveles + pill.
 * Mantiene identidad visual y evita magic numbers.
 * Todos los componentes deben importar desde aquí o desde constants.RADII.
 */
export const RADIUS = {
  sm: 8, // botones pequeños, chips, cancel/save
  md: 10, // inputs, selects, addTag
  lg: 12, // cards, line items, closeBtn
  xl: 14, // StatCards, modales, grupos settings
  "2xl": 20, // modal principal transacción
  pill: 999, // circular
} as const;

export type RadiusToken = keyof typeof RADIUS;
