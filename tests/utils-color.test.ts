import { shiftColor } from "@/utils/color";

describe("shiftColor", () => {
  test("shifts all channels by positive amount", () => {
    expect(shiftColor("#000000", 10)).toBe("#0a0a0a");
  });

  test("shifts all channels by negative amount", () => {
    expect(shiftColor("#ffffff", -10)).toBe("#f5f5f5");
  });

  test("clamps to 255 when overflow", () => {
    expect(shiftColor("#fffffe", 10)).toBe("#ffffff");
  });

  test("clamps to 0 when underflow", () => {
    expect(shiftColor("#000005", -10)).toBe("#000000");
  });

  test("returns hex unchanged if too short", () => {
    expect(shiftColor("#fff", 10)).toBe("#fff");
  });

  test("returns hex unchanged if no # prefix", () => {
    expect(shiftColor("000000", 10)).toBe("000000");
  });

  test("returns hex unchanged if empty", () => {
    expect(shiftColor("", 10)).toBe("");
  });

  test("shifts a mid-range color", () => {
    expect(shiftColor("#808080", 20)).toBe("#949494");
  });

  test("zero shift returns same color", () => {
    expect(shiftColor("#aabbcc", 0)).toBe("#aabbcc");
  });

  test("handles large negative shift", () => {
    expect(shiftColor("#101010", -100)).toBe("#000000");
  });
});
