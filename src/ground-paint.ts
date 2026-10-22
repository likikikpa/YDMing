import {
  BUILTIN_MATERIALS,
  DEEP_WATER,
  SHALLOW_WATER,
  setMaterial,
} from "./materials";
import {
  DIRT,
  DIRT_TOP,
  GRASS,
  ROCK_FROM,
  SAND_START,
  SAND_TOP,
  SNOW_FROM,
} from "./sculpt";
import type { SculptBrush } from "./sculpt";
import { editableTerrain } from "./terrain";
import type { CellRect } from "./terrain-render";
import type { MapData, Point } from "./types";

/**
 * What the terrain paint tool builds for a ground: the height it brings the
 * land to and the biome that goes with it. These are the bands the raise tool
 * climbs through, so a snow peak stands on slopes of rock, grass, dirt and
 * sand, and digging it away cuts back down through each. Water digs a basin
 * below the sea line; any other (custom) texture stands on grass-height ground.
 */
export function groundTarget(material: string, sea: number) {
  const dirtTop = sea + DIRT_TOP,
    grass = dirtTop + Math.max(0.02, ROCK_FROM - dirtTop) * 0.35;
  switch (material) {
    case DEEP_WATER:
      return { height: Math.max(0, sea - 0.14), biome: 0 };
    case SHALLOW_WATER:
      return { height: Math.max(0, sea - 0.04), biome: 0 };
    case "sand":
      return { height: sea + (SAND_START + SAND_TOP) / 2, biome: 0 };
    case "dirt":
      return { height: sea + (SAND_TOP + DIRT_TOP) / 2, biome: DIRT };
    case "rock":
      return { height: (ROCK_FROM + SNOW_FROM) / 2, biome: 0 };
    case "snow":
      return { height: Math.min(1, SNOW_FROM + 0.06), biome: 0 };
    default:
      return { height: grass, biome: GRASS };
  }
}

/**
 * How wide, in cells, the sloped skirt around a ground brush is. A hard brush
 * keeps it to a single cell; a soft one spreads it over up to half the radius.
 */
export const skirtWidth = (radius: number, hardness = 85) =>
  1 + (1 - Math.min(100, Math.max(0, hardness)) / 100) * radius * 0.5;

/**
 * 0 inside a brush, 1 beyond its skirt and a smooth ramp between, by distance
 * from the dab's centre in cells. It depends on nothing but the distance, so
 * the shore a brush draws follows its circle, not the grid of cells.
 */
export function skirt(distance: number, radius: number, width: number) {
  const t = Math.min(1, Math.max(0, (distance - (radius - 0.5)) / width));
  return t * t * (3 - 2 * t);
}

/**
 * Terrain paint with a ground picked: everything under the brush becomes that
 * ground at once. The ground is raised (or lowered) to its own height, so the
 * layers below it are still there: digging it away cuts down through them.
 * Water digs a basin.
 *
 * The brush edge is a skirt that slopes from the ground's height down to open
 * sea (or up to high ground), set by Edge hardness. Cells take the higher of
 * their height and the skirt when raised, the lower when lowered, so a dab
 * repeated while dragging changes nothing more, and the shore of a stroke
 * stays smooth instead of creeping out to the cell grid.
 */
export function buildGround(
  m: MapData,
  p: Point,
  brush: SculptBrush,
): CellRect | null {
  const terrain = editableTerrain(m),
    heights = terrain.heights,
    sea = m.settings.seaLevel,
    material = brush.material!,
    g = groundTarget(material, sea),
    custom = !BUILTIN_MATERIALS.includes(material),
    cx = (p.x / m.width) * m.cols,
    cy = (p.y / m.height) * m.rows,
    r = Math.max(1.5, ((brush.size / m.width) * m.cols) / 2),
    width = skirtWidth(r, brush.hardness),
    reach = Math.ceil(r + width),
    // Open sea beside new land, and high ground beside a new basin.
    low = Math.max(0, sea - 0.12),
    high = Math.min(1, sea + 0.3),
    x0 = Math.max(1, Math.floor(cx - reach)),
    x1 = Math.min(m.cols - 2, Math.ceil(cx + reach)),
    y0 = Math.max(1, Math.floor(cy - reach)),
    y1 = Math.min(m.rows - 2, Math.ceil(cy + reach));
  if (x1 < x0 || y1 < y0) return null;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const s = skirt(Math.hypot(x - cx, y - cy), r, width);
      if (s >= 1) continue;
      const i = y * m.cols + x,
        old = heights[i];
      heights[i] =
        old < g.height
          ? Math.max(old, g.height - (g.height - low) * s)
          : Math.min(old, g.height + (high - g.height) * s);
      // The ground's own material belongs to the cells it mostly covers.
      if (s < 0.5) {
        terrain.biomes[i] = g.biome;
        // Built-in grounds follow from height; only custom textures are painted on.
        setMaterial(m, terrain, i, custom ? material : null);
      }
    }
  return { x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1 };
}
