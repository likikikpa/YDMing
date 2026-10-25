import { Biome } from "./biomes";
import { hash, noise } from "./random";
import type { MapData } from "./types";

const seedHashes = new Map<string, number>();
/** A number from the map's seed, kept so a lookup per cell does not hash the text each time. */
function seedOf(map: MapData, salt: number) {
  let seed = seedHashes.get(map.settings.seed);
  if (seed === undefined) {
    seed = hash(map.settings.seed);
    seedHashes.set(map.settings.seed, seed);
  }
  return seed + salt;
}

/** How steeply the ground rises from a cell, as the largest height step to a neighbour. */
export function steepAt(map: MapData, x: number, y: number) {
  const { cols, rows, heights } = map,
    i = y * cols + x,
    h = heights[i];
  return Math.max(
    Math.abs(h - heights[x > 0 ? i - 1 : i]),
    Math.abs(h - heights[x < cols - 1 ? i + 1 : i]),
    Math.abs(h - heights[y > 0 ? i - cols : i]),
    Math.abs(h - heights[y < rows - 1 ? i + cols : i]),
  );
}

/**
 * How far above the sea a beach reaches at a cell: as far as the old even
 * ring (0.025) or further on flat ground, less as the shore climbs, none on a
 * cliff, and ragged along the coast.
 */
export function beachRise(map: MapData, x: number, y: number) {
  const flat = Math.max(0, 1 - steepAt(map, x, y) / 0.04);
  return 0.025 * flat * (1 + noise(x / 5, y / 5, seedOf(map, 31)) * 0.5);
}

/**
 * The land biome of a cell from its warmth and wetness. Both are nudged by
 * smooth noise at two scales, so the edge between two biomes wanders and
 * mixes instead of following one contour, and the cell's slope decides rock:
 * cliffs and high ground are rock, only the highest or the coldest is snow.
 */
export function landBiome(
  map: MapData,
  x: number,
  y: number,
  temp: number,
  moisture: number,
) {
  const s = map.settings,
    h = map.heights[y * map.cols + x],
    wobble = noise(x / 8, y / 8, seedOf(map, 71)) - 0.5,
    fine = noise(x / 3, y / 3, seedOf(map, 97)) - 0.5,
    wet = moisture + wobble * 0.22 + fine * 0.08,
    warm = temp + wobble * 0.12 + fine * 0.05,
    steep = steepAt(map, x, y);
  // High ground and cliff faces are rock; only the highest, or the really cold, is snow.
  if (h > 0.86 || (warm < 0.1 && h > s.seaLevel + 0.1)) return Biome.Snow;
  if (h > 0.74 || (steep > 0.05 && h > s.seaLevel + 0.2)) return Biome.Rock;
  if (warm < 0.3) return wet > 0.5 ? Biome.Taiga : Biome.Tundra;
  if (warm > 0.7)
    return wet < 0.32
      ? Biome.Desert
      : wet < 0.66
        ? Biome.Savanna
        : wet > 0.82
          ? Biome.Jungle
          : Biome.Forest;
  if (h < s.seaLevel + 0.07 && wet > 0.75) return Biome.Swamp;
  if (warm > 0.5 && wet < 0.2) return Biome.Desert;
  return wet > (warm > 0.5 ? 0.64 : 0.56) ? Biome.Forest : Biome.Grassland;
}
