import { describe, expect, it } from "vitest";
import { reliefOf, shadeAt } from "./relief";

const relief = reliefOf("fantasy")!;
const grid = (
  cols: number,
  rows: number,
  f: (x: number, y: number) => number,
) =>
  Array.from({ length: cols * rows }, (_, i) =>
    f(i % cols, Math.floor(i / cols)),
  );

describe("relief", () => {
  it("shades only the styles that ask for it", () => {
    expect(reliefOf("fantasy")).not.toBeNull();
    expect(reliefOf("painted")).toBe(reliefOf("fantasy"));
    expect(reliefOf("ink")).not.toBeNull();
    expect(reliefOf("parchment")).toBeNull();
    expect(reliefOf("atlas")).toBeNull();
  });

  it("turns the shade of Old ink brown, and keeps it gentler than Painted fantasy", () => {
    const ink = reliefOf("ink")!;
    // Less of the blue and green channel moves than the red one.
    expect(ink.tint[0]).toBeGreaterThan(ink.tint[1]);
    expect(ink.tint[1]).toBeGreaterThan(ink.tint[2]);
    expect(ink.fine).toBeLessThan(reliefOf("fantasy")!.fine);
  });

  it("leaves flat ground unshaded", () => {
    const flat = grid(20, 20, () => 0.6);
    expect(shadeAt(flat, 20, 20, 10, 10, relief)).toBe(0);
  });

  it("lights ground that faces north-west and darkens ground that faces south-east", () => {
    const towardSouthEast = grid(20, 20, (x, y) => 0.5 + (x + y) * 0.005);
    const towardNorthWest = grid(20, 20, (x, y) => 0.7 - (x + y) * 0.005);
    expect(shadeAt(towardSouthEast, 20, 20, 10, 10, relief)).toBeGreaterThan(0);
    expect(shadeAt(towardNorthWest, 20, 20, 10, 10, relief)).toBeLessThan(0);
  });

  it("shades a ridge more than the same slope on low ground", () => {
    const slope = (base: number) =>
      grid(20, 20, (x, y) => base + (x + y) * 0.004);
    expect(shadeAt(slope(0.8), 20, 20, 10, 10, relief)).toBeGreaterThan(
      shadeAt(slope(0.4), 20, 20, 10, 10, relief),
    );
  });

  it("stays within limits on a cliff and at the edges of the grid", () => {
    const cliff = grid(10, 10, (x) => (x < 5 ? 0.3 : 1));
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < 10; x++) {
        const shade = shadeAt(cliff, 10, 10, x, y, relief);
        expect(Number.isFinite(shade)).toBe(true);
        expect(Math.abs(shade)).toBeLessThanOrEqual(40);
      }
  });

  it("depends on nothing farther than its reach", () => {
    const base = grid(
      30,
      30,
      (x, y) => 0.6 + Math.sin(x / 3) * 0.05 + y * 0.002,
    );
    const edited = base.slice();
    // Change a cell just outside the reach of cell 15, 15.
    edited[15 * 30 + 15 + relief.reach + 1] += 0.4;
    expect(shadeAt(edited, 30, 30, 15, 15, relief)).toBe(
      shadeAt(base, 30, 30, 15, 15, relief),
    );
  });
});
