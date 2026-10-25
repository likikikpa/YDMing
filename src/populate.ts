import { Biome } from "./biomes";
import { biomeAt } from "./generator";
import { detailSeed, GENERATED, mapPacks } from "./map-packs";
import { random } from "./random";
import { scatterObjects, scatterStroke } from "./scatter";
import { poolAtMap } from "./scatter-habitat";
import { kindPictures } from "./scatter-kinds";
import { pathBlocker } from "./scatter-paths";
import { defaultSettings } from "./types";
import type { MapData, MapObject } from "./types";

export { GENERATED } from "./map-packs";

/** The most stamps one world is given, whatever its size. */
const MAX_STAMPS = 4000;

/** How likely each biome is to grow a thing, from 0 (never) to 1 (the most). */
type Factor = Partial<Record<number, number>>;

const TREES: Factor = {
  [Biome.Forest]: 1,
  [Biome.Taiga]: 0.9,
  [Biome.Jungle]: 1,
  [Biome.AutumnWoods]: 1,
  [Biome.Mangrove]: 0.5,
  [Biome.Swamp]: 0.35,
  [Biome.Blighted]: 0.3,
  [Biome.Grassland]: 0.12,
  [Biome.Savanna]: 0.1,
  [Biome.Moorland]: 0.08,
  [Biome.Steppe]: 0.06,
  [Biome.Tundra]: 0.05,
};
const MOUNTAINS: Factor = {
  [Biome.Rock]: 1,
  [Biome.Volcanic]: 0.8,
  [Biome.Snow]: 0.6,
  [Biome.Glacier]: 0.6,
  [Biome.Badlands]: 0.5,
  [Biome.Tundra]: 0.2,
  [Biome.Moorland]: 0.15,
  [Biome.Desert]: 0.12,
  [Biome.Steppe]: 0.1,
  [Biome.Grassland]: 0.04,
};
const ROCKS: Factor = {
  [Biome.Desert]: 1,
  [Biome.Badlands]: 1,
  [Biome.Moorland]: 1,
  [Biome.Rock]: 0.6,
  [Biome.Steppe]: 0.6,
  [Biome.Volcanic]: 0.6,
  [Biome.Snow]: 0.3,
  [Biome.Tundra]: 0.5,
  [Biome.Grassland]: 0.3,
  [Biome.Forest]: 0.2,
  [Biome.Beach]: 0.2,
  [Biome.Dirt]: 0.5,
};
const UNDERGROWTH: Factor = {
  [Biome.Grassland]: 1,
  [Biome.Savanna]: 1,
  [Biome.Swamp]: 1,
  [Biome.Moorland]: 1,
  [Biome.Steppe]: 0.8,
  [Biome.Jungle]: 0.8,
  [Biome.Forest]: 0.6,
  [Biome.Desert]: 0.3,
  [Biome.Taiga]: 0.3,
};

/** One kind of detail: how often it starts a cluster, how big, how packed. */
interface Layer {
  kind: string;
  factor: Factor;
  /** Chance per cell at full detail and full suitability. */
  chance: number;
  radius: number;
  size: number;
  density: number;
  /** Ground lower than this above the sea gets none. */
  rise?: number;
}
const LAYERS: Layer[] = [
  {
    kind: "trees",
    factor: TREES,
    chance: 0.016,
    radius: 40,
    size: 30,
    density: 1.2,
  },
  {
    kind: "mountains",
    factor: MOUNTAINS,
    chance: 0.06,
    radius: 26,
    size: 52,
    density: 0.9,
    rise: 0.12,
  },
  {
    kind: "rocks",
    factor: ROCKS,
    chance: 0.006,
    radius: 6,
    size: 24,
    density: 1,
  },
  {
    kind: "undergrowth",
    factor: UNDERGROWTH,
    chance: 0.008,
    radius: 16,
    size: 22,
    density: 0.9,
  },
];

/** Whether a world has collections to place stamps from: Realistic has none of its own. */
export const hasStampSet = (map: MapData) => mapPacks(map.settings).length > 0;

/**
 * Fills the land of a world with stamps from its collections (`mapPacks`):
 * clusters of trees in the woods, rock and ranges on the high ground, stones
 * and undergrowth in the dry and open country. What each biome grows is what
 * the scatter brush's Follow biomes allows, and nothing lands on water, on a
 * river, road or wall, or on a settlement. The Land detail setting sets how
 * many clusters there are; stamps the generator placed before are replaced.
 */
export function populateWorld(map: MapData, seed: string) {
  map.objects = map.objects.filter((o) => !o.id.startsWith(GENERATED));
  const packs = mapPacks(map.settings),
    amount =
      Math.max(
        0,
        Math.min(100, map.settings.detail ?? defaultSettings.detail ?? 0),
      ) / 100;
  if (!packs.length || amount <= 0) return;
  const rand = random(seed + "detail"),
    { cols, rows, heights } = map,
    sea = map.settings.seaLevel,
    cellX = map.width / cols,
    cellY = map.height / rows,
    blocked = pathBlocker(map.paths, 8),
    seats = map.objects.filter((o) => o.id.startsWith("settlement-"));
  const biome = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++)
      if (heights[y * cols + x] >= sea)
        biome[y * cols + x] = biomeAt(map, x, y);
  const out: MapObject[] = [];
  let serial = 0;
  for (const layer of LAYERS) {
    const pool = packs.flatMap((pack) => kindPictures(pack, layer.kind));
    if (!pool.length) continue;
    const poolAt = poolAtMap(map, pool),
      options = {
        radius: layer.radius,
        size: layer.size,
        density: layer.density,
        scale: [0.75, 1.25] as const,
        flip: true,
        turn: 180,
        tint: 0.35,
      };
    for (let i = 0; i < cols * rows && out.length < MAX_STAMPS; i++) {
      const b = biome[i];
      if (!b || heights[i] < sea + (layer.rise ?? 0)) continue;
      const p = (layer.factor[b] ?? 0) * layer.chance * amount;
      if (p <= 0 || rand() >= p) continue;
      const at = {
        x: ((i % cols) + rand()) * cellX,
        y: (Math.floor(i / cols) + rand()) * cellY,
      };
      const placed = scatterStroke(
        undefined,
        at,
        pool,
        options,
        rand,
        poolAt,
      ).filter(
        (s) =>
          s.x > 8 &&
          s.y > 8 &&
          s.x < map.width - 8 &&
          s.y < map.height - 8 &&
          !blocked?.(s) &&
          !seats.some((o) => Math.hypot(o.x - s.x, o.y - s.y) < 26),
      );
      for (const o of scatterObjects(placed, layer.size, {
        layer: "Objects",
        color: "#344a39",
        cell: 0,
        id: () => `${GENERATED}${seed}-${serial++}`,
      }))
        out.push(o);
    }
  }
  for (const o of out) map.objects.push(o);
}

/**
 * A copy of a map that takes its land stamps from these collections. A world
 * whose land the generator filled is filled again from them with the seed it
 * had, so going back to the first collections gives back the same stamps; a
 * map with none of the generator's stamps only keeps the choice for its next
 * generation.
 */
export function withPacks(map: MapData, packs: string[]): MapData {
  const next = structuredClone(map),
    seed = detailSeed(map),
    filled = map.objects.some((o) => o.id.startsWith(GENERATED));
  next.settings = { ...next.settings, stampPacks: packs };
  if (map.kind === "world" && filled) populateWorld(next, seed);
  return next;
}
