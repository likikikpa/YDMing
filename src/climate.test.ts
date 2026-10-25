import { describe, expect, it } from "vitest";
import { Biome } from "./biomes";
import { biomeAt, climateAt, generateMap } from "./generator";
import { defaultSettings } from "./types";
import type { GeneratorSettings, MapData } from "./types";

const world = (seed: string, over: Partial<GeneratorSettings> = {}) =>
  generateMap("world", { ...defaultSettings, seed, ...over });
/** The same heights, with the biomes worked out by the old rules or the new. */
const withModel = (map: MapData, model: number | undefined): MapData => ({
  ...map,
  biomes: new Array(map.biomes.length).fill(0),
  settings: { ...map.settings, biomeModel: model },
});
const cells = (map: MapData) => {
  const out: { x: number; y: number; i: number; b: number }[] = [];
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const i = y * map.cols + x;
      if (map.heights[i] >= map.settings.seaLevel)
        out.push({ x, y, i, b: biomeAt(map, x, y) });
    }
  return out;
};
const share = (list: { b: number }[], biome: number) =>
  list.filter((c) => c.b === biome).length / (list.length || 1);
const SEEDS = ["c1", "c2", "c3"];

describe("saves from before the climate rules", () => {
  it("keep their biomes exactly", () => {
    const old = withModel(world("legacy"), undefined);
    for (let n = 0; n < 3000; n += 7) {
      const x = (n * 13) % old.cols,
        y = (n * 29) % old.rows,
        h = old.heights[y * old.cols + x],
        s = old.settings;
      let want: number;
      if (h < s.seaLevel) want = 12;
      else if (h < s.seaLevel + 0.025) want = 11;
      else {
        const { temp, moisture } = climateAt(old, x, y);
        want =
          temp < 0.12 || h > 0.87
            ? 1
            : h > 0.74
              ? 2
              : temp < 0.3
                ? moisture > 0.55
                  ? 4
                  : 3
                : temp > 0.65
                  ? moisture < 0.4
                    ? 8
                    : moisture > 0.8
                      ? 10
                      : 9
                  : h < s.seaLevel + 0.06 && moisture > 0.8
                    ? 7
                    : moisture > 0.61
                      ? 6
                      : 5;
      }
      expect(biomeAt(old, x, y)).toBe(want);
    }
  });
});

describe("climate biomes of a new map", () => {
  it("are a varied mix, not one biome", () => {
    for (const seed of SEEDS) {
      const land = cells(withModel(world(seed), 2)),
        forest = share(land, Biome.Forest),
        grass = share(land, Biome.Grassland);
      expect(forest).toBeGreaterThan(0.25);
      expect(forest).toBeLessThan(0.75);
      expect(grass).toBeGreaterThan(0.08);
      expect(share(land, Biome.Rock)).toBeGreaterThan(0.03);
    }
  });

  it("have more edges between biomes than the old rules, which are softer in a mix", () => {
    const edges = (map: MapData) => {
      const g = new Map(cells(map).map((c) => [c.i, c.b]));
      let n = 0;
      for (const [i, b] of g) {
        const left = g.get(i - 1),
          up = g.get(i - map.cols);
        if (left !== undefined && left !== b) n++;
        if (up !== undefined && up !== b) n++;
      }
      return n / g.size;
    };
    let before = 0,
      after = 0;
    for (const seed of SEEDS) {
      const m = world(seed);
      before += edges(withModel(m, undefined));
      after += edges(withModel(m, 2));
    }
    expect(after).toBeGreaterThan(before);
  });

  it("make snow of the high and the cold, never of low warm ground", () => {
    for (const seed of SEEDS) {
      const map = withModel(world(seed), 2);
      for (const c of cells(map))
        if (c.b === Biome.Snow)
          expect(
            map.heights[c.i] > 0.8 || climateAt(map, c.x, c.y).temp < 0.3,
          ).toBe(true);
    }
  });

  it("put rock on high ground and cliffs, not on the plain", () => {
    const map = withModel(world("c3"), 2),
      rock = cells(map).filter((c) => c.b === Biome.Rock);
    expect(rock.length).toBeGreaterThan(100);
    const high = rock.filter((c) => map.heights[c.i] > 0.7).length;
    expect(high / rock.length).toBeGreaterThan(0.7);
  });

  it("put desert in the rain shadow of ranges", () => {
    let desert = 0,
      shadow = 0,
      other = 0,
      otherN = 0;
    for (const seed of SEEDS) {
      const map = withModel(world(seed, { rainfall: 22 }), 2);
      const lee = (x: number, y: number) => {
        const ux = Math.max(
            0,
            Math.min(map.cols - 1, x + (map.settings.wind === "east" ? 8 : -8)),
          ),
          h = map.heights[y * map.cols + x];
        return Math.max(0, map.heights[y * map.cols + ux] - h);
      };
      for (const c of cells(map)) {
        if (c.b === Biome.Desert) {
          desert++;
          shadow += lee(c.x, c.y);
        } else {
          otherN++;
          other += lee(c.x, c.y);
        }
      }
    }
    expect(desert).toBeGreaterThan(100);
    expect(shadow / desert).toBeGreaterThan(other / otherN);
  });

  it("follow the temperature and the rain sliders", () => {
    const biomesOf = (over: Partial<GeneratorSettings>) =>
      cells(withModel(world("c2", over), 2));
    const cold = biomesOf({ temperature: -30 }),
      hot = biomesOf({ temperature: 30, rainfall: 90 }),
      dry = biomesOf({ temperature: 30, rainfall: 10 });
    expect(
      share(cold, Biome.Taiga) + share(cold, Biome.Tundra),
    ).toBeGreaterThan(0.1);
    expect(share(hot, Biome.Jungle)).toBeGreaterThan(0.05);
    expect(share(dry, Biome.Desert)).toBeGreaterThan(0.2);
    expect(share(hot, Biome.Taiga) + share(hot, Biome.Tundra)).toBeLessThan(
      0.02,
    );
  });

  it("are the same for the same seed", () => {
    const a = cells(withModel(world("same"), 2)).map((c) => c.b),
      b = cells(withModel(world("same"), 2)).map((c) => c.b);
    expect(a).toEqual(b);
  });
});
