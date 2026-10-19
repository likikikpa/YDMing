import type {
  MapData,
  TerrainData,
  TextureLayer,
  TexturePattern,
} from "./types";

export const PATTERNS: TexturePattern[] = [
  "grass",
  "dirt",
  "sand",
  "rock",
  "snow",
  "water",
  "mud",
  "cobble",
];
export const SHALLOW_WATER = "shallow-water";
export const DEEP_WATER = "deep-water";
/** Built-in materials: they can be retextured but not deleted. */
export const BUILTIN_MATERIALS = [
  DEEP_WATER,
  SHALLOW_WATER,
  "sand",
  "dirt",
  "grass",
  "rock",
  "snow",
];
/** Edge length of a generated tile in texels. */
export const TILE = 128;
/** Map pixels one tile covers at 100 % scale. */
export const WORLD_TILE = 48;

const NAMES: Record<string, string> = {
  [DEEP_WATER]: "Deep water",
  [SHALLOW_WATER]: "Shallow water",
  sand: "Sand",
  dirt: "Dirt",
  grass: "Grass",
  rock: "Rock",
  snow: "Snow",
};

/** The default list, lowest first: where two materials meet the later one wins the edge. */
export function defaultTextures(): TextureLayer[] {
  return BUILTIN_MATERIALS.map((id) => ({
    id,
    name: NAMES[id],
    pattern: (id.endsWith("water") ? "water" : id) as TexturePattern,
    scale: 100,
    strength: id.endsWith("water") ? 20 : 60,
    visible: true,
  }));
}

/** Ground material a biome paints when nothing was painted by hand. */
export function biomeMaterial(biome: number) {
  switch (biome) {
    case 1:
      return "snow";
    case 2:
      return "rock";
    case 3:
    case 13:
      return "dirt";
    case 8:
    case 11:
    case 12:
      return "sand";
    default:
      return "grass";
  }
}

/** The texture layer id painted by hand on cell `i`, if any. */
export function paintedMaterial(map: MapData, terrain: TerrainData, i: number) {
  const n = terrain.materials?.[i];
  return n ? map.materialKeys?.[n - 1] : undefined;
}

/** Paints texture layer `key` on cell `i`, or clears the cell back to its biome when `key` is null. */
export function setMaterial(
  map: MapData,
  terrain: TerrainData,
  i: number,
  key: string | null,
) {
  if (!key) {
    if (terrain.materials) terrain.materials[i] = 0;
    return;
  }
  const keys = (map.materialKeys ??= []);
  let n = keys.indexOf(key) + 1;
  if (!n) n = keys.push(key);
  (terrain.materials ??= new Array(map.cols * map.rows).fill(0))[i] = n;
}

/** Points every hand-painted cell of `from` at `to` instead (null clears them). */
export function replaceMaterial(map: MapData, from: string, to: string | null) {
  const keys = map.materialKeys;
  if (!keys?.includes(from)) return;
  const n = keys.indexOf(from) + 1;
  let m = to ? keys.indexOf(to) + 1 : 0;
  if (to && !m) {
    keys[n - 1] = to;
    return;
  }
  for (const terrain of [map, map.terrain])
    if (terrain?.materials)
      terrain.materials = terrain.materials.map((v) => (v === n ? m : v));
  keys[n - 1] = "";
}

function lattice(x: number, y: number, seed: number) {
  let h = Math.imul(x, 374761393) + Math.imul(y, 668265263) + seed;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
}
/** Value noise that repeats every `period` units, so tiles have no seams. */
function periodic(x: number, y: number, period: number, seed: number) {
  const ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    u = fx * fx * (3 - 2 * fx),
    v = fy * fy * (3 - 2 * fy),
    x0 = ((ix % period) + period) % period,
    y0 = ((iy % period) + period) % period,
    x1 = (x0 + 1) % period,
    y1 = (y0 + 1) % period,
    a = lattice(x0, y0, seed),
    b = lattice(x1, y0, seed),
    c = lattice(x0, y1, seed),
    d = lattice(x1, y1, seed);
  return (a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v;
}
/** Tileable noise over the unit square with `cells` features per side. */
const n = (u: number, v: number, cells: number, seed: number) =>
  periodic(u * cells, v * cells, cells, seed);

/** Distance to the nearest of a tileable grid of jittered points, for stones. */
function cellular(u: number, v: number, cells: number, seed: number) {
  const x = u * cells,
    y = v * cells,
    ix = Math.floor(x),
    iy = Math.floor(y);
  let best = 9,
    second = 9;
  for (let dy = -1; dy <= 1; dy++)
    for (let dx = -1; dx <= 1; dx++) {
      const cx = ix + dx,
        cy = iy + dy,
        wx = ((cx % cells) + cells) % cells,
        wy = ((cy % cells) + cells) % cells,
        px = cx + 0.15 + lattice(wx, wy, seed) * 0.7,
        py = cy + 0.15 + lattice(wx, wy, seed + 1) * 0.7,
        d = Math.hypot(px - x, py - y);
      if (d < best) {
        second = best;
        best = d;
      } else if (d < second) second = d;
    }
  return second - best;
}

/** Brightness offset of one texel of a pattern, roughly -1 to 1. */
function patternAt(pattern: TexturePattern, u: number, v: number, s: number) {
  switch (pattern) {
    case "grass": {
      const blades = n(u, v * 0.5, 48, s + 3);
      return (
        (n(u, v, 6, s) - 0.5) * 0.9 +
        (n(u, v, 24, s + 1) - 0.5) * 0.7 +
        (blades - 0.5) * 0.5 +
        (n(u, v, 64, s + 2) > 0.8 ? 0.35 : 0)
      );
    }
    case "dirt":
      return (
        (n(u, v, 5, s) - 0.5) * 1 +
        (n(u, v, 20, s + 1) - 0.5) * 0.6 +
        (n(u, v, 40, s + 2) > 0.8 ? 0.7 : 0) -
        (n(u, v, 40, s + 3) > 0.85 ? 0.5 : 0)
      );
    case "sand":
      return (
        (n(u, v, 64, s) - 0.5) * 0.7 +
        Math.sin((v * 8 + n(u, v, 4, s + 1) * 1.6) * Math.PI * 2) * 0.22 +
        (n(u, v, 8, s + 2) - 0.5) * 0.4
      );
    case "rock": {
      const ridge = 1 - Math.abs(n(u, v, 6, s) * 2 - 1),
        crack = Math.abs(n(u, v, 10, s + 1) * 2 - 1) < 0.06 ? -0.9 : 0;
      return (ridge - 0.6) * 1.2 + (n(u, v, 32, s + 2) - 0.5) * 0.6 + crack;
    }
    case "snow":
      return (n(u, v, 4, s) - 0.5) * 0.5 + (n(u, v, 16, s + 1) - 0.5) * 0.3;
    case "water":
      return (
        Math.sin((v * 6 + u * 2 + n(u, v, 3, s) * 2) * Math.PI * 2) * 0.25 +
        (n(u, v, 12, s + 1) - 0.5) * 0.4
      );
    case "mud":
      return (
        (n(u, v, 5, s) - 0.5) * 0.8 +
        (n(u, v, 24, s + 1) - 0.5) * 0.4 -
        (n(u, v, 4, s + 2) < 0.3 ? 0.6 : 0)
      );
    case "cobble": {
      const edge = cellular(u, v, 6, s);
      return (edge < 0.08 ? -1 : 0.1) + (n(u, v, 32, s + 1) - 0.5) * 0.5;
    }
  }
}

/**
 * A seamless tile of brightness offsets for a pattern, followed by smaller
 * copies (64, 32, 16, 8 texels) for drawing it far away without speckle.
 */
export function patternTile(pattern: TexturePattern, seed = 7) {
  const base = new Float32Array(TILE * TILE);
  for (let y = 0; y < TILE; y++)
    for (let x = 0; x < TILE; x++)
      base[y * TILE + x] = patternAt(pattern, x / TILE, y / TILE, seed);
  return mipChain(base, TILE);
}

/** Halves a square tile again and again by averaging 2 × 2 blocks. */
export function mipChain(base: Float32Array, size: number, channels = 1) {
  const levels = [base];
  while (size > 8) {
    const prev = levels[levels.length - 1],
      half = size / 2,
      next = new Float32Array(half * half * channels);
    for (let y = 0; y < half; y++)
      for (let x = 0; x < half; x++)
        for (let c = 0; c < channels; c++) {
          const i = (y * 2 * size + x * 2) * channels + c;
          next[(y * half + x) * channels + c] =
            (prev[i] +
              prev[i + channels] +
              prev[i + size * channels] +
              prev[i + (size + 1) * channels]) /
            4;
        }
    levels.push(next);
    size = half;
  }
  return levels;
}

export const hexToRgb = (hex: string): [number, number, number] => {
  const v = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
};
