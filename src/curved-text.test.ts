import { describe, expect, it } from "vitest";
import { layoutLine } from "./curved-text";

// Three letters 10 px wide each.
const letters = ["A", "B", "C"],
  advances = [0, 10, 20, 30];

describe("laying out a line of text", () => {
  it("centres a straight line on the origin", () => {
    const { glyphs, squeeze } = layoutLine(letters, advances, 0, 0);
    expect(glyphs.map((g) => g.x)).toEqual([-10, 0, 10]);
    expect(glyphs.every((g) => g.y === 0 && g.angle === 0)).toBe(true);
    expect(squeeze).toBe(1);
  });

  it("adds the spacing between letters, not after the last", () => {
    const { glyphs } = layoutLine(letters, advances, 5, 0);
    expect(glyphs.map((g) => g.x)).toEqual([-15, 0, 15]);
  });

  it("squeezes a line wider than its box, as fillText does", () => {
    const { glyphs, squeeze } = layoutLine(letters, advances, 0, 0, 15);
    expect(squeeze).toBe(0.5);
    expect(glyphs.map((g) => g.x)).toEqual([-5, 0, 5]);
  });

  it("arches up for a positive curve and sags for a negative one", () => {
    const arch = layoutLine(letters, advances, 0, 0.5).glyphs,
      sag = layoutLine(letters, advances, 0, -0.5).glyphs;
    // The ends are lower than the middle (canvas y grows downward).
    expect(arch[0].y).toBeGreaterThan(arch[1].y);
    expect(arch[2].y).toBeCloseTo(arch[0].y);
    expect(sag[0].y).toBeLessThan(sag[1].y);
    // The letters lean with the arc.
    expect(arch[0].angle).toBeLessThan(0);
    expect(arch[2].angle).toBeGreaterThan(0);
    expect(sag[0].angle).toBeGreaterThan(0);
  });

  it("keeps the arc's height centred on the origin", () => {
    // 201 letters of 1 px on a half circle: the middle is as far above the
    // origin as the ends are below it.
    const many = Array.from({ length: 201 }, () => "i"),
      { glyphs } = layoutLine(many, many.map((_, i) => i).concat(201), 0, 1);
    expect(glyphs[100].y).toBeLessThan(0);
    expect(glyphs[0].y + glyphs[100].y).toBeCloseTo(0, 0);
  });

  it("keeps the length of the line along the arc", () => {
    const { glyphs } = layoutLine(letters, advances, 0, 1);
    // A half circle as long as the line: its ends are 2/π of it apart.
    expect(glyphs[2].x - glyphs[0].x).toBeLessThan(20);
    expect(
      Math.hypot(glyphs[1].x - glyphs[0].x, glyphs[1].y - glyphs[0].y),
    ).toBeCloseTo(
      Math.hypot(glyphs[2].x - glyphs[1].x, glyphs[2].y - glyphs[1].y),
    );
  });
});
