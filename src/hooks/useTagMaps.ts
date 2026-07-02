import { useMemo } from "react";
import { type Tag } from "@/types";

export function useTagMaps(tagsList: Tag[]) {
  const tagColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsList.forEach((t) => { map[t.id] = t.color; });
    return map;
  }, [tagsList]);

  const tagLabelMap = useMemo(() => {
    const map: Record<string, string> = {};
    tagsList.forEach((t) => { map[t.id] = t.label; });
    return map;
  }, [tagsList]);

  return { tagColorMap, tagLabelMap };
}
