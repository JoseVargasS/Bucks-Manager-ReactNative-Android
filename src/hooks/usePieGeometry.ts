import { useMemo } from "react";
import type { PieSlice } from "@/domain/bucksLogic";
import type { MergedSlice } from "@/components/ui/PieChart";
import { PIE_GEOMETRY, pt } from "@/utils/pieGeometry";

export interface PieArc {
  slice: MergedSlice;
  a0: number;
  a1: number;
  mid: number;
}

export interface PieLabelPlacement {
  arc: PieArc;
  tickOuter: { x: number; y: number };
  isLeft: boolean;
  placedY: number;
}

export function usePieGeometry(data: PieSlice[]): {
  merged: MergedSlice[];
  arcs: PieArc[];
  labelPlacements: PieLabelPlacement[];
} {
  const merged = useMemo<MergedSlice[]>(
    () =>
      [...data]
        .sort((a, b) => b.value - a.value)
        .map((s, i) => ({ ...s, key: `${i}` })),
    [data],
  );

  const arcs = useMemo(() => {
    let a = 0;
    return merged.map((s) => {
      const sw = (s.percentage / 100) * 360;
      const a0 = a;
      const a1 = a + sw;
      a = a1;
      return { slice: s, a0, a1, mid: (a0 + a1) / 2 };
    });
  }, [merged]);

  const labelPlacements = useMemo(() => {
    const items = arcs
      .filter((a) => a.slice.percentage >= 5)
      .map((a) => {
        const tickOuter = pt(
          PIE_GEOMETRY.cx,
          PIE_GEOMETRY.cy,
          PIE_GEOMETRY.outerRadius + 12,
          a.mid,
        );
        return { arc: a, tickOuter, isLeft: tickOuter.x < PIE_GEOMETRY.cx };
      });

    const assign = (group: typeof items) => {
      const sorted = [...group].sort((a, b) => a.tickOuter.y - b.tickOuter.y);
      const result: (typeof sorted[0] & { placedY: number })[] = [];
      let lastY = -Infinity;
      for (const item of sorted) {
        const placedY = Math.max(item.tickOuter.y, lastY + PIE_GEOMETRY.rowHeight);
        result.push({ ...item, placedY });
        lastY = placedY;
      }
      return result;
    };

    const left = assign(items.filter((c) => c.isLeft));
    const right = assign(items.filter((c) => !c.isLeft));
    return [...left, ...right];
  }, [arcs]);

  return { merged, arcs, labelPlacements };
}
