import { describe, expect, it } from "vitest";
import { Biome } from "./biomes";
import { coastMetrics } from "./coast-metrics";
import { biomeAt, createEmptyMap, generateMap } from "./generator";
import { defaultSettings } from "./types";
import type { MapData } from "./types";

/** A strip of shore: water, then land that rises by `slope` a cell. */
function shore(slope: number, model?: number): MapData {
  const map = createEmptyMap(
    "world",
    { ...defaultSettings, seed: "strip", biomeModel: model },
    "Strip",
    "strip",
    { cols: 40, rows: 12 },
  );
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++)
      map.heights[y * map.cols + x] =
        map.settings.seaLevel + (x - 10) * slope - 0.0001;
  return map;
}
/** Beach cells along the middle row, counting inland from the shore. */
const beachWidth = (map: MapData) => {
  let n = 0;
  for (let x = 10; x < map.cols; x++)
    if (biomeAt(map, x, 6) === Biome.Beach) n++;
  return n;
};

describe("beaches", () => {
  it("are wide on a gentle shore, narrow where it climbs, and absent on a cliff", () => {
    const gentle = beachWidth(shore(0.003, 2)),
      steady = beachWidth(shore(0.012, 2)),
      steep = beachWidth(shore(0.03, 2)),
      cliff = beachWidth(shore(0.06, 2));
    expect(gentle).toBeGreaterThanOrEqual(6);
    expect(gentle).toBeGreaterThan(steady);
    expect(steady).toBeGreaterThanOrEqual(1);
    expect(steep).toBeLessThanOrEqual(steady);
    expect(cliff).toBe(0);
  });

  it("are never narrower on flat ground than the old even ring, which the sand brush relies on", () => {
    expect(beachWidth(shore(0.0005, 2))).toBeGreaterThanOrEqual(
      beachWidth(shore(0.0005, undefined)),
    );
  });

  it("keep the even ring in saves from before the slope rule", () => {
    // Land less than 0.025 of height above the sea is beach, whatever the slope.
    expect(beachWidth(shore(0.003, undefined))).toBe(8);
    expect(beachWidth(shore(0.012, undefined))).toBe(2);
    expect(beachWidth(shore(0.06, undefined))).toBe(0);
  });

  it("are not drawn on the sea", () => {
    const map = shore(0.01, 2);
    for (let x = 0; x < 10; x++) expect(biomeAt(map, x, 6)).toBe(Biome.Sea);
  });

  it("vary in width along a coast", () => {
    const map = generateMap("world", { ...defaultSettings, seed: "vary" }),
      m = coastMetrics(map);
    expect(m.beachCV).toBeGreaterThan(0.7);
    // Some of the coast has no beach at all: cliffs.
    expect(m.noBeach).toBeGreaterThan(0.1);
  });
});

describe("coasts", () => {
  const seeds = ["m1", "m2", "m3", "m4"];
  const average = (
    template: string,
    key: keyof ReturnType<typeof coastMetrics>,
  ) =>
    seeds.reduce(
      (a, seed) =>
        a +
        coastMetrics(
          generateMap("world", { ...defaultSettings, seed, template }),
        )[key],
      0,
    ) / seeds.length;

  it("are rugged: far more shore than a smooth blob of the same area", () => {
    // A circle's shore is about 3.5 times the root of its area (in cells).
    for (const template of ["continents", "archipelago", "pangaea"])
      expect(average(template, "coastRatio")).toBeGreaterThan(9);
  });

  it("have small islands off the big ones", () => {
    for (const template of ["continents", "archipelago", "island", "pangaea"])
      expect(average(template, "small")).toBeGreaterThanOrEqual(3);
  });

  it("do not leave single-cell specks in the sea", () => {
    const map = generateMap("world", { ...defaultSettings, seed: "specks" });
    const { cols, rows, heights } = map,
      sea = map.settings.seaLevel;
    let specks = 0;
    for (let y = 1; y < rows - 1; y++)
      for (let x = 1; x < cols - 1; x++) {
        const i = y * cols + x;
        if (
          heights[i] >= sea &&
          heights[i - 1] < sea &&
          heights[i + 1] < sea &&
          heights[i - cols] < sea &&
          heights[i + cols] < sea
        )
          specks++;
      }
    expect(specks).toBe(0);
  });
});
