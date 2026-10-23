import { Biome } from "./biomes";
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
  [Biome.Snow]: ["glacier"],
  [Biome.Rock]: ["moor"],
  [Biome.Tundra]: ["pine", "moor"],
  [Biome.Taiga]: ["pine"],
  [Biome.Grassland]: ["forest", "steppe"],
  [Biome.Forest]: ["forest", "pine"],
  [Biome.Swamp]: ["swamp"],
  [Biome.Desert]: ["desert"],
  [Biome.Savanna]: ["savanna"],
  [Biome.Jungle]: ["jungle"],
  [Biome.Dirt]: ["steppe", "moor"],
  [Biome.Badlands]: ["badlands"],
  [Biome.Glacier]: ["glacier"],
  [Biome.Steppe]: ["steppe"],
  [Biome.Moorland]: ["moor"],
  [Biome.AutumnWoods]: ["autumn"],
  [Biome.Volcanic]: ["volcanic"],
  [Biome.Blighted]: ["blight"],
  [Biome.Mangrove]: ["mangrove"],
};

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
  const kind = kindOf(src)?.key;
  // Mountains and stones stand on any land; only plants keep to their biomes.
  if (kind === "mountains" || kind === "rocks") return true;
  if (biome === Biome.Beach) return BEACH.test(src.slice(src.lastIndexOf("/")));
  const home = habitatsOf(src);
  // A picture no style scatters (a castle, a log) can stand on any land.
  if (!home) return true;
  return !!GROWS[biome]?.some((k) => home.has(k));
}

/** The pictures of the pool that grow on a biome. */
export const picturesFor = (pool: readonly ScatterPicture[], biome: number) =>
  pool.filter((p) => growsOn(p.sprite.src, biome));

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
