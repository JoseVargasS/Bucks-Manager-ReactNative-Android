jest.mock("react", () => ({
  ...jest.requireActual("react"),
  useMemo: (fn: any) => fn(),
}));

import { useTagMaps } from "@/hooks/useTagMaps";

describe("useTagMaps", () => {
  test("returns tagColorMap and tagLabelMap from tagsList", () => {
    const tags = [
      { id: "t1", label: "Comida", color: "#ff0000" },
      { id: "t2", label: "Salud", color: "#00ff00" },
    ];
    const result = useTagMaps(tags as any);
    expect(result.tagColorMap).toEqual({ t1: "#ff0000", t2: "#00ff00" });
    expect(result.tagLabelMap).toEqual({ t1: "Comida", t2: "Salud" });
  });

  test("returns empty maps for empty tagsList", () => {
    const result = useTagMaps([]);
    expect(result.tagColorMap).toEqual({});
    expect(result.tagLabelMap).toEqual({});
  });
});
