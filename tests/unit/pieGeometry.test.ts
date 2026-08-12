import { arc, pt, trimLabel } from "@/utils/pieGeometry";

describe("pieGeometry", () => {
  describe("pt", () => {
    it("computes points for cardinal angles relative to the donut center", () => {
      const cx = 0;
      const cy = 0;
      const r = 10;

      const at0 = pt(cx, cy, r, 0);
      expect(at0.x).toBeCloseTo(0);
      expect(at0.y).toBeCloseTo(-10);

      const at90 = pt(cx, cy, r, 90);
      expect(at90.x).toBeCloseTo(10);
      expect(at90.y).toBeCloseTo(0);

      const at180 = pt(cx, cy, r, 180);
      expect(at180.x).toBeCloseTo(0);
      expect(at180.y).toBeCloseTo(10);

      const at270 = pt(cx, cy, r, 270);
      expect(at270.x).toBeCloseTo(-10);
      expect(at270.y).toBeCloseTo(0);

      const at360 = pt(cx, cy, r, 360);
      expect(at360.x).toBeCloseTo(0);
      expect(at360.y).toBeCloseTo(-10);
    });

    it("offsets by the provided center", () => {
      const p = pt(100, 50, 10, 0);
      expect(p.x).toBeCloseTo(100);
      expect(p.y).toBeCloseTo(40);
    });
  });

  describe("arc", () => {
    it("builds a 90 degree slice path", () => {
      const path = arc(0, 0, 10, 5, 0, 90);
      expect(path.startsWith("M ")).toBe(true);
      expect(path).toContain("A 10 10 0 0 0");
      expect(path).toContain("A 5 5 0 0 1");
      expect(path.endsWith("Z")).toBe(true);
    });

    it("sets large-arc-flag for sweeps over 180 degrees", () => {
      const path = arc(0, 0, 10, 5, 0, 270);
      expect(path).toContain("A 10 10 0 1 0");
      expect(path).toContain("A 5 5 0 1 1");
    });

    it("builds a full circle path with two halves", () => {
      const path = arc(0, 0, 10, 5, 0, 360);
      expect(path).toContain("A 10 10 0 0 0");
      expect(path).toContain("A 5 5 0 0 1");
      expect(path.split("M ").length).toBeGreaterThanOrEqual(3);
    });
  });

  describe("trimLabel", () => {
    it("returns the label unchanged when it fits", () => {
      expect(trimLabel("Food", 10)).toBe("Food");
      expect(trimLabel("Food", 4)).toBe("Food");
    });

    it("truncates and appends an ellipsis when too long", () => {
      expect(trimLabel("Groceries", 4)).toBe("Gro…");
      expect(trimLabel("Transport", 6)).toBe("Trans…");
    });

    it("keeps at least one character before the ellipsis", () => {
      expect(trimLabel("Hello", 1)).toBe("H…");
    });
  });
});
