import { Biome } from "./biomes";
import { biomeAt, climateAt } from "./generator";
import { fbm, hash } from "./random";
import { defaultSettings as DEFAULTS } from "./types";
import type { GeneratorSettings, MapData } from "./types";

/** The special biomes a generator slider sets, with the id each paints and the share of its eligible ground at full. */
export const SPECIAL_BIOMES = [
  { key: "volcanic", biome: Biome.Volcanic, label: "Volcanic activity" },
  { key: "glaciers", biome: Biome.Glacier, label: "Glaciers" },
  { key: "badlands", biome: Biome.Badlands, label: "Badlands" },
  { key: "blight", biome: Biome.Blighted, label: "Blight" },
  { key: "moorland", biome: Biome.Moorland, label: "Moorland" },
  { key: "autumnWoods", biome: Biome.AutumnWoods, label: "Autumn woods" },
  { key: "steppe", biome: Biome.Steppe, label: "Steppe" },
  { key: "mangroves", biome: Biome.Mangrove, label: "Mangroves" },
  { key: "reefs", biome: Biome.CoralReef, label: "Coral reefs" },
] as const;

export type SpecialBiomeKey = (typeof SPECIAL_BIOMES)[number]["key"];

/** How much of a special biome a map is set to have, 0 to 1; saves without the setting have the default. */
export const amountOf = (
  s: Partial<GeneratorSettings>,
  key: SpecialBiomeKey,
  fallback: GeneratorSettings,
) => Math.max(0, Math.min(100, s[key] ?? fallback[key] ?? 0)) / 100;

/** The most of its eligible ground each biome covers when its slider is at the top. */
const SHARE: Record<Exclude<SpecialBiomeKey, "volcanic">, number> = {
  glaciers: 0.85,
  badlands: 0.4,
  blight: 0.2,
  moorland: 0.5,
  autumnWoods: 0.6,
  steppe: 0.65,
  mangroves: 0.9,
  reefs: 0.75,
};

/** What the placer knows about each cell. */
interface Cell {
  i: number;
  x: number;
  y: number;
  h: number;
  temp: number;
  moisture: number;
  base: number;
  /** Cells to the nearest open sea (0 on the sea itself, capped). */
  sea: number;
  /** Cells to the nearest land (0 on land, capped). */
  land: number;
}

export const FAR = 99;

/** Cells to the nearest cell for which `is` holds, found with two passes over the grid. */
export function distanceTo(map: MapData, is: (i: number) => boolean) {
  const { cols, rows } = map,
    d = new Uint8Array(cols * rows).fill(FAR);
  for (let i = 0; i < d.length; i++) if (is(i)) d[i] = 0;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (x > 0) d[i] = Math.min(d[i], d[i - 1] + 1);
      if (y > 0) d[i] = Math.min(d[i], d[i - cols] + 1);
    }
  for (let y = rows - 1; y >= 0; y--)
    for (let x = cols - 1; x >= 0; x--) {
      const i = y * cols + x;
      if (x < cols - 1) d[i] = Math.min(d[i], d[i + 1] + 1);
      if (y < rows - 1) d[i] = Math.min(d[i], d[i + cols] + 1);
    }
  return d;
}

/** Marks the cells with the largest noise among `eligible`, as many as `share` of them. */
function pickByNoise(cells: Cell[], share: number, noise: (c: Cell) => number) {
  if (!cells.length || share <= 0) return [];
  const scored = cells.map((c) => [noise(c), c] as const);
  scored.sort((a, b) => b[0] - a[0]);
  return scored.slice(0, Math.round(scored.length * share)).map((p) => p[1]);
}

/**
 * Paints the special biomes of a world map into its biome grid: volcanic land
 * around the highest summits, glaciers on the cold and the high, badlands on
 * dry uplands, blight in patches, moorland on cool highland, autumn woods and
 * steppe at the edge of the forest and the grass, mangroves on warm shores and
 * coral on warm shallows. Each slider sets how much of the ground that suits
 * a biome it takes; 0 leaves it out. Cells already painted are kept.
 */
export function placeSpecialBiomes(map: MapData, seed: string) {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel,
    land = (i: number) => heights[i] >= sea;
  const toSea = distanceTo(map, (i) => !land(i)),
    toLand = distanceTo(map, land),
    cells: Cell[] = [];
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x,
        c = climateAt(map, x, y);
      cells.push({
        i,
        x,
        y,
        h: c.h,
        temp: c.temp,
        moisture: c.moisture,
        base: biomeAt(map, x, y),
        sea: toSea[i],
        land: toLand[i],
      });
    }
  const free = (c: Cell) => map.biomes[c.i] === 0,
    paint = (list: Cell[], biome: number) => {
      for (const c of list) if (free(c)) map.biomes[c.i] = biome;
    },
    noiseFor = (key: string, scale: number) => {
      const n = hash(seed + key);
      return (c: Cell) => fbm(c.x / scale, c.y / scale, n, 3);
    },
    amount = (key: SpecialBiomeKey) => amountOf(map.settings, key, DEFAULTS);

  // Volcanic land rings the highest summits, spread apart.
  const volcanic = amount("volcanic");
  if (volcanic > 0) {
    const summits = cells
      .filter((c) => c.h > 0.62 && c.land === 0)
      .sort((a, b) => b.h - a.h);
    const count = Math.max(1, Math.round(volcanic * 4)),
      reach = 4 + volcanic * 9,
      spacing = Math.max(14, reach * 1.8),
      chosen: Cell[] = [],
      jag = noiseFor("volcano-edge", 4);
    for (const c of summits) {
      if (chosen.length >= count) break;
      if (chosen.every((o) => Math.hypot(o.x - c.x, o.y - c.y) > spacing))
        chosen.push(c);
    }
    for (const c of cells) {
      if (c.land !== 0) continue;
      for (const v of chosen)
        if (Math.hypot(c.x - v.x, c.y - v.y) < reach * (0.7 + jag(c) * 0.6))
          if (free(c)) {
            map.biomes[c.i] = Biome.Volcanic;
            break;
          }
    }
  }

  const eligible = (is: (c: Cell) => boolean) =>
    cells.filter((c) => free(c) && is(c));
  const by = (
    key: Exclude<SpecialBiomeKey, "volcanic">,
    scale: number,
    is: (c: Cell) => boolean,
    biome: number,
  ) =>
    paint(
      pickByNoise(eligible(is), amount(key) * SHARE[key], noiseFor(key, scale)),
      biome,
    );

  by(
    "glaciers",
    9,
    (c) =>
      c.land === 0 && (c.base === Biome.Snow || c.temp < 0.16 || c.h > 0.8),
    Biome.Glacier,
  );
  by(
    "badlands",
    11,
    (c) =>
      c.land === 0 &&
      c.h > sea + 0.1 &&
      c.h < 0.74 &&
      c.moisture < 0.45 &&
      c.temp > 0.4,
    Biome.Badlands,
  );
  by(
    "blight",
    7,
    (c) =>
      c.land === 0 &&
      c.sea > 4 &&
      c.h < 0.7 &&
      c.base !== Biome.Snow &&
      c.base !== Biome.Desert,
    Biome.Blighted,
  );
  by(
    "moorland",
    10,
    (c) =>
      c.land === 0 &&
      c.temp > 0.26 &&
      c.temp < 0.52 &&
      c.h > sea + 0.14 &&
      c.h < 0.72 &&
      c.moisture > 0.45,
    Biome.Moorland,
  );
  by(
    "autumnWoods",
    9,
    (c) => c.base === Biome.Forest && c.temp > 0.28 && c.temp < 0.56,
    Biome.AutumnWoods,
  );
  by(
    "steppe",
    12,
    (c) =>
      (c.base === Biome.Grassland || c.base === Biome.Savanna) &&
      c.moisture < 0.6,
    Biome.Steppe,
  );
  by(
    "mangroves",
    6,
    (c) => c.land === 0 && c.sea <= 2 && c.h < sea + 0.05 && c.temp > 0.55,
    Biome.Mangrove,
  );
  by(
    "reefs",
    7,
    (c) => c.land > 0 && c.land <= 7 && c.h > sea - 0.07 && c.temp > 0.5,
    Biome.CoralReef,
  );
}

/** Cells of the map painted with a biome, for tests and rerolls. */
export function countBiome(map: MapData, biome: number) {
  let n = 0;
  for (const b of map.biomes) if (b === biome) n++;
  return n;
}

/** Takes away the special biomes a map has, so they can be placed again. */
export function clearSpecialBiomes(map: MapData) {
  for (let i = 0; i < map.biomes.length; i++)
    if (map.biomes[i] >= Biome.Badlands) map.biomes[i] = 0;
}
