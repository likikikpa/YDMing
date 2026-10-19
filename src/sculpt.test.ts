import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import {
  raiseIsland,
  raiseRange,
  resample,
  sculptAmount,
  sculptDab,
  simplify,
} from "./sculpt";
import { defaultSettings } from "./types";

const brush = { size: 60, strength: 55, biome: 6 };
function flatWorld(level = 0.5) {
  const map = createEmptyMap("world", { ...defaultSettings, seed: "SCULPT" });
  map.heights.fill(level);
  return map;
}
const at = (map: ReturnType<typeof flatWorld>, x: number, y: number) =>
  map.heights[Math.round(y / 5) * map.cols + Math.round(x / 5)];

describe("sculpting", () => {
  it("raises the ground softly: strongest in the middle, nothing outside the brush", () => {
    const map = flatWorld(),
      before = map.heights.slice(),
      dirty = sculptDab(map, "raise", { x: 600, y: 425 }, 0.2, 0, brush)!;
    expect(at(map, 600, 425)).toBeGreaterThan(0.69);
    expect(at(map, 600, 425)).toBeGreaterThan(at(map, 615, 425));
    expect(at(map, 615, 425)).toBeGreaterThan(at(map, 628, 425));
    expect(at(map, 700, 425)).toBe(0.5);
    // Every changed cell lies inside the reported dirty rectangle.
    map.heights.forEach((h, i) => {
      if (h !== before[i]) {
        const x = i % map.cols,
          y = Math.floor(i / map.cols);
        expect(x).toBeGreaterThanOrEqual(dirty.x0);
        expect(x).toBeLessThanOrEqual(dirty.x1);
        expect(y).toBeGreaterThanOrEqual(dirty.y0);
        expect(y).toBeLessThanOrEqual(dirty.y1);
      }
    });
  });
  it("lifts land out of the sea after about a second of holding the brush", () => {
    const map = flatWorld(0.3);
    for (let frame = 0; frame < 60; frame++)
      sculptDab(map, "raise", { x: 600, y: 425 }, sculptAmount(55, 1 / 60), 0, brush);
    expect(at(map, 600, 425)).toBeGreaterThan(map.settings.seaLevel);
  });
  it("digs back below the sea line and never leaves the 0–1 range", () => {
    const map = flatWorld(0.6);
    for (let i = 0; i < 400; i++)
      sculptDab(map, "dig", { x: 600, y: 425 }, 0.05, 0, brush);
    expect(at(map, 600, 425)).toBe(0);
    for (let i = 0; i < 400; i++)
      sculptDab(map, "raise", { x: 600, y: 425 }, 0.05, 0, brush);
    expect(at(map, 600, 425)).toBe(1);
  });
  it("smooths a spike and flattens towards the chosen level", () => {
    const map = flatWorld();
    map.heights[85 * map.cols + 120] = 0.95;
    sculptDab(map, "smooth", { x: 600, y: 425 }, 0.05, 0, brush);
    expect(map.heights[85 * map.cols + 120]).toBeLessThan(0.95);
    const hill = flatWorld(0.8);
    sculptDab(hill, "flatten", { x: 600, y: 425 }, 0.05, 0.5, brush);
    expect(at(hill, 600, 425)).toBeLessThan(0.8);
    expect(at(hill, 600, 425)).toBeGreaterThanOrEqual(0.5);
  });
  it("paints biomes without touching heights", () => {
    const map = flatWorld(),
      before = map.heights.slice();
    sculptDab(map, "biome", { x: 600, y: 425 }, 0, 0, brush);
    expect(map.biomes[85 * map.cols + 120]).toBe(6);
    expect(map.heights).toEqual(before);
  });
  it("raises ranges and islands out of the sea", () => {
    const sea = flatWorld(0.2);
    const range = raiseRange(
      sea,
      [
        { x: 300, y: 400 },
        { x: 500, y: 420 },
        { x: 700, y: 380 },
      ],
      brush,
    );
    expect(range).toBeDefined();
    expect(Math.max(...sea.heights)).toBeGreaterThan(sea.settings.seaLevel + 0.15);
    const water = flatWorld(0.2);
    raiseIsland(water, { x: 400, y: 300 }, { x: 600, y: 500 });
    expect(at(water, 500, 400)).toBeGreaterThan(water.settings.seaLevel);
    expect(at(water, 100, 100)).toBe(0.2);
  });
});

describe("freehand helpers", () => {
  it("simplify keeps corners and drops collinear points", () => {
    const line = Array.from({ length: 20 }, (_, i) => ({ x: i * 10, y: 0 }));
    expect(simplify(line, 1)).toHaveLength(2);
    const bent = [...line, ...Array.from({ length: 10 }, (_, i) => ({ x: 190, y: (i + 1) * 10 }))];
    expect(simplify(bent, 1)).toHaveLength(3);
  });
  it("resample spaces points evenly along the path", () => {
    const points = resample([{ x: 0, y: 0 }, { x: 100, y: 0 }], 10);
    expect(points).toHaveLength(11);
    expect(points[5].x).toBeCloseTo(50);
  });
});
