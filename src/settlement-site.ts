import { Biome } from "./biomes";
import { biomeAt } from "./generator";
import type { Ground, NameSite } from "./names";
import type { MapData } from "./types";

/** The ground a biome gives a settlement, for naming. */
const GROUND: Partial<Record<number, Ground>> = {
  [Biome.Snow]: "snow",
  [Biome.Glacier]: "snow",
  [Biome.Tundra]: "snow",
  [Biome.Desert]: "desert",
  [Biome.Badlands]: "desert",
  [Biome.Rock]: "mountain",
  [Biome.Volcanic]: "mountain",
  [Biome.Forest]: "forest",
  [Biome.Taiga]: "forest",
  [Biome.AutumnWoods]: "forest",
  [Biome.Jungle]: "forest",
  [Biome.Swamp]: "swamp",
  [Biome.Mangrove]: "swamp",
};

/** How far from the shore a settlement still counts as coastal, in cells. */
const SHORE = 3;
/** How far from a river, in map pixels, a settlement counts as on it. */
const RIVER = 40;

/** What a settlement at a map point is like, so its name can fit: ground, shore and river. */
export function siteAt(
  map: MapData,
  x: number,
  y: number,
  size?: NameSite["size"],
): NameSite {
  const { cols, rows, heights } = map,
    gx = Math.min(cols - 1, Math.max(0, Math.floor((x / map.width) * cols))),
    gy = Math.min(rows - 1, Math.max(0, Math.floor((y / map.height) * rows))),
    sea = map.settings.seaLevel;
  let coast = false;
  for (let dy = -SHORE; dy <= SHORE && !coast; dy++)
    for (let dx = -SHORE; dx <= SHORE; dx++) {
      const cx = gx + dx,
        cy = gy + dy;
      if (cx < 0 || cy < 0 || cx >= cols || cy >= rows) continue;
      if (heights[cy * cols + cx] < sea) {
        coast = true;
        break;
      }
    }
  let river = false;
  for (const path of map.paths) {
    if (path.kind !== "river") continue;
    if (path.points.some((p) => Math.hypot(p.x - x, p.y - y) < RIVER)) {
      river = true;
      break;
    }
  }
  const high = heights[gy * cols + gx] > 0.6;
  return {
    ground: high ? "mountain" : (GROUND[biomeAt(map, gx, gy)] ?? "plain"),
    coast,
    river,
    size,
  };
}
