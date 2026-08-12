/**
 * Pure geometry helpers for the donut chart. Kept in a standalone module so
 * the component stays focused on rendering and animation.
 */

const CX = 130;
const CY = 115;
const OR = 78;
const IR = 46;
const SVG_W = 260;
const SVG_H = 230;

export const PIE_GEOMETRY = {
  cx: CX,
  cy: CY,
  outerRadius: OR,
  innerRadius: IR,
  selectedGrow: 8,
  idleOpacity: 0.94,
  svgWidth: SVG_W,
  svgHeight: SVG_H,
  labelMargin: 35,
  rowHeight: 30,
} as const;

export interface Point {
  x: number;
  y: number;
}

/** Converts a polar position to cartesian coordinates relative to the donut center. */
export function pt(cx: number, cy: number, r: number, deg: number): Point {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

/** Builds the SVG path for a donut slice between two angles. */
export function arc(
  cx: number,
  cy: number,
  oR: number,
  iR: number,
  a0: number,
  a1: number,
): string {
  if (a1 - a0 >= 359.99) {
    const m = (a0 + a1) / 2;
    return [
      `M ${pt(cx, cy, oR, a0).x} ${pt(cx, cy, oR, a0).y}`,
      `A ${oR} ${oR} 0 0 0 ${pt(cx, cy, oR, m).x} ${pt(cx, cy, oR, m).y}`,
      `L ${pt(cx, cy, iR, m).x} ${pt(cx, cy, iR, m).y}`,
      `A ${iR} ${iR} 0 0 1 ${pt(cx, cy, iR, a0).x} ${pt(cx, cy, iR, a0).y} Z`,
      `M ${pt(cx, cy, oR, m).x} ${pt(cx, cy, oR, m).y}`,
      `A ${oR} ${oR} 0 0 0 ${pt(cx, cy, oR, a1).x} ${pt(cx, cy, oR, a1).y}`,
      `L ${pt(cx, cy, iR, a1).x} ${pt(cx, cy, iR, a1).y}`,
      `A ${iR} ${iR} 0 0 1 ${pt(cx, cy, iR, m).x} ${pt(cx, cy, iR, m).y} Z`,
    ].join(" ");
  }
  const s = pt(cx, cy, oR, a1),
    e = pt(cx, cy, oR, a0);
  const si = pt(cx, cy, iR, a1),
    ei = pt(cx, cy, iR, a0);
  const lg = a1 - a0 > 180 ? 1 : 0;
  return `M ${s.x} ${s.y} A ${oR} ${oR} 0 ${lg} 0 ${e.x} ${e.y} L ${ei.x} ${ei.y} A ${iR} ${iR} 0 ${lg} 1 ${si.x} ${si.y} Z`;
}

/** Truncates a label to a maximum character count, appending an ellipsis. */
export function trimLabel(text: string, max: number): string {
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1))}…`;
}
