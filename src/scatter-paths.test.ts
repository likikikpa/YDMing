import { describe, expect, it } from "vitest";
import { pathBlocker } from "./scatter-paths";
import type { MapPath } from "./types";

const path = (over: Partial<MapPath> = {}): MapPath => ({
  id: "p",
  kind: "river",
  width: 10,
  layer: "Water",
  points: [
    { x: 100, y: 100 },
    { x: 300, y: 100 },
  ],
  ...over,
});

describe("pathBlocker", () => {
  it("blocks the line, its width and the margin, and nothing farther", () => {
    const blocked = pathBlocker([path()], 6)!;
    expect(blocked({ x: 200, y: 100 })).toBe(true);
    expect(blocked({ x: 200, y: 110 })).toBe(true);
    expect(blocked({ x: 200, y: 112 })).toBe(false);
    expect(blocked({ x: 200, y: 90 })).toBe(true);
    expect(blocked({ x: 200, y: 88 })).toBe(false);
  });
  it("reaches round the ends and across grid cells", () => {
    const blocked = pathBlocker([path()], 6)!;
    expect(blocked({ x: 95, y: 100 })).toBe(true);
    expect(blocked({ x: 85, y: 100 })).toBe(false);
    expect(blocked({ x: 308, y: 100 })).toBe(true);
    expect(blocked({ x: 315, y: 100 })).toBe(false);
  });
  it("follows a bend and a slanted line", () => {
    const blocked = pathBlocker(
      [
        path({
          points: [
            { x: 0, y: 0 },
            { x: 100, y: 100 },
            { x: 100, y: 300 },
          ],
        }),
      ],
      2,
    )!;
    expect(blocked({ x: 50, y: 50 })).toBe(true);
    expect(blocked({ x: 50, y: 62 })).toBe(false);
    expect(blocked({ x: 100, y: 250 })).toBe(true);
    expect(blocked({ x: 130, y: 250 })).toBe(false);
  });
  it("keeps clear of a river that widens, by its wider end", () => {
    const wide = pathBlocker([path({ width: 4, widths: [4, 40] })], 0)!,
      narrow = pathBlocker([path({ width: 4, widths: [4, 4] })], 0)!;
    expect(wide({ x: 290, y: 115 })).toBe(true);
    expect(narrow({ x: 290, y: 115 })).toBe(false);
  });
  it("blocks rivers, roads, walls and corridors but not borders", () => {
    for (const kind of ["river", "road", "wall", "corridor"] as const)
      expect(pathBlocker([path({ kind })], 0)!({ x: 200, y: 100 })).toBe(true);
    expect(pathBlocker([path({ kind: "border" })], 0)).toBeUndefined();
  });
  it("is undefined with no paths, and lets a path-free map through", () => {
    expect(pathBlocker([], 5)).toBeUndefined();
    expect(
      pathBlocker([path({ points: [{ x: 1, y: 1 }] })], 5),
    ).toBeUndefined();
  });
  it("stays quick with thousands of segments", () => {
    const paths = Array.from({ length: 200 }, (_, i) =>
      path({
        id: `r${i}`,
        points: Array.from({ length: 40 }, (_, j) => ({
          x: j * 80,
          y: i * 16 + Math.sin(j) * 5,
        })),
      }),
    );
    const blocked = pathBlocker(paths, 4)!;
    const t = performance.now();
    let hits = 0;
    for (let n = 0; n < 20000; n++)
      if (blocked({ x: (n * 37) % 3200, y: (n * 91) % 3200 })) hits++;
    expect(performance.now() - t).toBeLessThan(500);
    expect(hits).toBeGreaterThan(0);
  });
});
