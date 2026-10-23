import { Biome, MAX_BIOME } from "./biomes";
import { biomeAt } from "./generator";
import { clamp } from "./random";
import { kindOf } from "./scatter-kinds";
import { decorSetFor } from "./style-decor";
import { terrainView } from "./terrain";
import type { DecorKind } from "./style-decor";
import type { ScatterPicture } from "./scatter";
import type { MapData, Point } from "./types";

/**
 * The kinds of picture each biome grows, as the map styles scatter them
 * (`DecorKind` pools, see `biome-decor.ts`). A biome missing here, and the
 * sea and the reef, grows none of the restricted pictures.
 */
const GROWS: Partial<Record<number, readonly DecorKind[]>> = {
  [Biome.Snow]: ["glacier", "mountain"],
  [Biome.Rock]: ["moor", "mountain", "peak"],
  [Biome.Tundra]: ["pine", "moor", "mountain"],
  [Biome.Taiga]: ["pine", "mountain"],
  [Biome.Grassland]: ["forest", "steppe", "mountain"],
  [Biome.Forest]: ["forest", "pine", "mountain"],
  [Biome.Swamp]: ["swamp"],
  [Biome.Desert]: ["desert"],
  [Biome.Savanna]: ["savanna", "mountain"],
  [Biome.Jungle]: ["jungle"],
  [Biome.Dirt]: ["steppe", "moor", "mountain"],
  [Biome.Badlands]: ["badlands"],
  [Biome.Glacier]: ["glacier", "mountain"],
  [Biome.Steppe]: ["steppe", "mountain"],
  [Biome.Moorland]: ["moor", "mountain"],
  [Biome.AutumnWoods]: ["autumn", "mountain"],
  [Biome.Volcanic]: ["volcanic", "mountain"],
  [Biome.Blighted]: ["blight"],
  [Biome.Mangrove]: ["mangrove"],
};

/** Snowy pictures (peaks, ranges, firs) keep to the cold and the high ground. */
const SNOWY = /snow/i;
const COLD: readonly number[] = [
  Biome.Snow,
  Biome.Glacier,
  Biome.Tundra,
  Biome.Taiga,
  Biome.Rock,
];

/** On a beach only palms and stones grow, whatever else the style's pools hold. */
const BEACH = /(palm|rocks|boulders)/i;

/** Where each picture is used by the map styles: the decoration kinds whose pools hold it. */
let habitats: Map<string, Set<DecorKind>> | undefined;
function habitatsOf(src: string): ReadonlySet<DecorKind> | undefined {
  if (!habitats) {
    habitats = new Map();
    // Built on first use: the decoration sets sit in an import cycle with the renderer.
    for (const style of ["fantasy", "ink"]) {
      const { pools } = decorSetFor(style);
      for (const kind of Object.keys(pools) as DecorKind[])
        for (const url of pools[kind]) {
          const set = habitats.get(url) ?? new Set<DecorKind>();
          habitats.set(url, set.add(kind));
        }
    }
  }
  return habitats.get(src);
}

const isWater = (biome: number) =>
  biome === Biome.Sea || biome === Biome.CoralReef;

/** Whether a picture grows on a biome. Water grows nothing. */
export function growsOn(src: string, biome: number) {
  if (isWater(biome)) return false;
  const name = src.slice(src.lastIndexOf("/"));
  // Stones stand on any land; plants and mountains keep to their biomes.
  if (kindOf(src)?.key === "rocks") return true;
  if (SNOWY.test(name)) return COLD.includes(biome);
  if (biome === Biome.Beach) return BEACH.test(name);
  const home = habitatsOf(src);
  // A picture no style scatters (a castle, a log) can stand on any land.
  if (!home) return true;
  return !!GROWS[biome]?.some((k) => home.has(k));
}

/** The biomes with land to grow on: every id but Auto, the sea and the reef. */
export const LAND_BIOMES: readonly number[] = Array.from(
  { length: MAX_BIOME },
  (_, i) => i + 1,
).filter((b) => !isWater(b));

/** The biomes a picture grows on when nobody has chosen them. */
export const defaultBiomes = (src: string) =>
  LAND_BIOMES.filter((b) => growsOn(src, b));

/** Whether a pool picture grows on a biome: its own list if it has one, else the rules. */
export const pictureGrowsOn = (p: ScatterPicture, biome: number) =>
  !isWater(biome) &&
  (p.biomes ? p.biomes.includes(biome) : growsOn(p.sprite.src, biome));

/** The pictures of the pool that grow on a biome. */
export const picturesFor = (pool: readonly ScatterPicture[], biome: number) =>
  pool.filter((p) => pictureGrowsOn(p, biome));

/**
 * What the pool may place at a point of the map: the pictures that grow on
 * the biome under it, nothing on water. The answer per biome is kept.
 */
export function poolAtMap(map: MapData, pool: readonly ScatterPicture[]) {
  const view = terrainView(map),
    byBiome = new Map<number, ScatterPicture[]>();
  return (at: Point): readonly ScatterPicture[] => {
    const gx = clamp(
        Math.floor((at.x / map.width) * map.cols),
        0,
        map.cols - 1,
      ),
      gy = clamp(Math.floor((at.y / map.height) * map.rows), 0, map.rows - 1),
      biome = biomeAt(view, gx, gy);
    let list = byBiome.get(biome);
    if (!list) byBiome.set(biome, (list = picturesFor(pool, biome)));
    return list;
  };
}
