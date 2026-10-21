import { describe, expect, it } from "vitest";
import { biomeAt, createEmptyMap } from "./generator";
import {
  DIRT,
  GRASS,
  SAND_TOP,
  raiseIsland,
  raiseRange,
  resample,
  sculptAmount,
  sculptDab,
  simplify,
} from "./sculpt";
import { paintedMaterial, setMaterial } from "./materials";
import { defaultSettings } from "./types";

const map0Sea = () => defaultSettings.seaLevel;
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
      dirty = sculptDab(map, "raise", { x: 600, y: 425 }, 0.5, 0, brush)!;
    expect(at(map, 600, 425)).toBeGreaterThan(0.6);
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
  it("digging peels a custom texture off first instead of sinking it into the sea", () => {
    const map = flatWorld(map0Sea() + 0.015),
      centre = Math.round(425 / 5) * map.cols + Math.round(600 / 5);
    setMaterial(map, map, centre, "mud");
    const height = map.heights[centre];
    sculptDab(map, "dig", { x: 600, y: 425 }, 0.5, 0, brush);
    expect(paintedMaterial(map, map, centre)).toBeUndefined();
    expect(map.heights[centre]).toBe(height);
    sculptDab(map, "dig", { x: 600, y: 425 }, 0.5, 0, brush);
    expect(map.heights[centre]).toBeLessThan(height);
  });
  describe("terrain paint builds ground", () => {
    const sea = defaultSettings.seaLevel,
      // One touch: a single dab with no time held.
      touch = (
        map: ReturnType<typeof flatWorld>,
        material: string,
        size = 60,
      ) =>
        sculptDab(map, "terrain", { x: 600, y: 425 }, 0, 0, {
          ...brush,
          size,
          material,
        }),
      row = Math.round(425 / 5),
      col = Math.round(600 / 5),
      centre = (map: ReturnType<typeof flatWorld>) => row * map.cols + col;
    it("one touch turns open sea into the chosen ground at once", () => {
      const heights: Record<string, number> = {};
      for (const m of ["sand", "dirt", "grass", "rock", "snow"]) {
        const map = flatWorld(sea - 0.1);
        touch(map, m);
        heights[m] = map.heights[centre(map)];
        expect(heights[m]).toBeGreaterThan(sea);
      }
      expect(heights.sand).toBeLessThan(heights.dirt);
      expect(heights.dirt).toBeLessThan(heights.grass);
      expect(heights.grass).toBeLessThan(heights.rock);
      expect(heights.rock).toBeLessThan(heights.snow);
      const map = flatWorld(sea - 0.1);
      touch(map, "snow");
      expect(biomeAt(map, col, row)).toBe(1);
      expect(biomeAt(map, col + 5, row)).toBe(1);
    });
    it("puts every lower layer around the chosen one, even with a small brush", () => {
      const map = flatWorld(sea - 0.1);
      touch(map, "snow", 30);
      const seen: number[] = [];
      for (let dx = 0; dx <= 20; dx++) {
        const b = biomeAt(map, col + dx, row);
        if (seen[seen.length - 1] !== b) seen.push(b);
        if (dx)
          expect(map.heights[centre(map) + dx]).toBeLessThanOrEqual(
            map.heights[centre(map) + dx - 1],
          );
      }
      // Snow, rock, grass, dirt, sand, then the sea, in that order.
      expect(seen).toEqual([1, 2, 5, 13, 11, 12]);
    });
    it("touching again changes nothing, and the skirt never cuts higher ground", () => {
      const map = flatWorld(sea - 0.1);
      touch(map, "snow");
      const once = map.heights.slice();
      touch(map, "snow");
      expect(map.heights).toEqual(once);
      const high = flatWorld(0.8);
      touch(high, "sand");
      expect(high.heights[centre(high) + 20]).toBe(0.8);
    });
    it("digging a painted peak cuts back down through the layers", () => {
      const map = flatWorld(sea - 0.1);
      touch(map, "snow");
      const seen = new Set<number>(),
        i = centre(map);
      for (let n = 0; n < 600 && map.heights[i] > sea; n++) {
        sculptDab(
          map,
          "dig",
          { x: 600, y: 425 },
          sculptAmount(55, 1 / 60, 1, "dig"),
          0,
          brush,
        );
        seen.add(biomeAt(map, col, row));
      }
      expect(map.heights[i]).toBeLessThanOrEqual(sea);
      for (const biome of [1, 2, 11]) expect(seen.has(biome)).toBe(true);
    });
    it("water digs a basin and Auto leaves heights alone", () => {
      const map = flatWorld(sea + 0.2);
      touch(map, "deep-water");
      expect(map.heights[centre(map)]).toBeLessThan(sea);
      const land = flatWorld(sea + 0.2);
      touch(land, "");
      expect(land.heights[centre(land)]).toBe(sea + 0.2);
    });
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
    expect(Math.max(...sea.heights)).toBeGreaterThan(
      sea.settings.seaLevel + 0.15,
    );
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
    const bent = [
      ...line,
      ...Array.from({ length: 10 }, (_, i) => ({ x: 190, y: (i + 1) * 10 })),
    ];
    expect(simplify(bent, 1)).toHaveLength(3);
  });
  it("resample spaces points evenly along the path", () => {
    const points = resample(
      [
        { x: 0, y: 0 },
        { x: 100, y: 0 },
      ],
      10,
    );
    expect(points).toHaveLength(11);
    expect(points[5].x).toBeCloseTo(50);
  });
  describe("pouring terrain", () => {
    const centre = (map: ReturnType<typeof flatWorld>) => 85 * map.cols + 120;
    const pour = (map: ReturnType<typeof flatWorld>, frames: number) => {
      for (let f = 0; f < frames; f++)
        sculptDab(
          map,
          "raise",
          { x: 600, y: 425 },
          sculptAmount(55, 1 / 60, 1, "raise"),
          0,
          brush,
        );
      return map.heights[centre(map)] - map.settings.seaLevel;
    };
    it("turns open water into sand at once, only where the brush is", () => {
      const map = flatWorld(0.2);
      sculptDab(
        map,
        "raise",
        { x: 600, y: 425 },
        sculptAmount(55, 0.01, 1, "raise"),
        0,
        brush,
      );
      const above = map.heights[centre(map)] - map.settings.seaLevel;
      expect(above).toBeGreaterThan(0);
      expect(above).toBeLessThan(SAND_TOP);
      expect(biomeAt(map, 120, 85)).toBe(11);
      expect(map.heights[85 * map.cols + 160]).toBe(0.2);
    });
    it("spends a quarter of a second in each material: sand, dirt, grass, rock, snow", () => {
      const map = flatWorld(0.2),
        stage = () => biomeAt(map, 120, 85);
      // Sampled in the middle of each quarter second (60 frames a second).
      pour(map, 8);
      expect(stage()).toBe(11);
      pour(map, 15);
      expect(stage()).toBe(DIRT);
      pour(map, 15);
      expect(stage()).toBe(GRASS);
      pour(map, 15);
      expect(stage()).toBe(2);
      pour(map, 15);
      expect(stage()).toBe(1);
    });
    it("pours faster at higher strength", () => {
      const slow = flatWorld(0.2),
        fast = flatWorld(0.2);
      for (let f = 0; f < 20; f++) {
        sculptDab(
          slow,
          "raise",
          { x: 600, y: 425 },
          sculptAmount(30, 1 / 60, 1, "raise"),
          0,
          brush,
        );
        sculptDab(
          fast,
          "raise",
          { x: 600, y: 425 },
          sculptAmount(90, 1 / 60, 1, "raise"),
          0,
          brush,
        );
      }
      expect(fast.heights[centre(fast)]).toBeGreaterThan(
        slow.heights[centre(slow)],
      );
    });
    it("lets digging lower the pile back through the same materials", () => {
      const map = flatWorld(0.2);
      pour(map, 40);
      for (let f = 0; f < 200 && biomeAt(map, 120, 85) !== 11; f++)
        sculptDab(
          map,
          "dig",
          { x: 600, y: 425 },
          sculptAmount(55, 1 / 60, 1, "dig"),
          0,
          brush,
        );
      expect(biomeAt(map, 120, 85)).toBe(11);
      expect(map.biomes[centre(map)]).toBe(0);
    });
    it("leaves biomes painted by hand alone", () => {
      const map = flatWorld(0.2);
      map.biomes[centre(map)] = 8;
      pour(map, 20);
      expect(map.biomes[centre(map)]).toBe(8);
    });
  });
});
