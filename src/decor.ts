import { biomeAt } from "./generator";
import { hash, random } from "./random";
import { imageCache } from "./render";
import { inClump, isWooded } from "./canopy";
import { decorSprite, drawPainted, wantSprite } from "./decor-sprites";
import { BIOME_DECOR } from "./biome-decor";
import { decorStep, nearTown, poolIndex, settlements } from "./decor-spots";
import { decorSetFor } from "./style-decor";
import type { DecorKind } from "./style-decor";
import type { CellRect } from "./terrain-render";
import type { MapData } from "./types";

interface DecorSpot {
  x: number;
  y: number;
  mw: number;
  mh: number;
  tw: number;
  th: number;
  n: number;
}
const decorTiles = new Map<string, DecorSpot[]>();
/** Decoration spots are laid out on 400 px tiles so any map size gets the same density. */
const DECOR_TILE = 400;
/** 3000 spots used to cover a 1140 × 790 px sheet. */
const DECOR_PER_TILE = Math.round(
  (3000 * DECOR_TILE * DECOR_TILE) / (1140 * 790),
);
function decorTile(seed: string, tx: number, ty: number) {
  const key = `${seed}:${tx}:${ty}`;
  let spots = decorTiles.get(key);
  if (!spots) {
    const r = random(`${seed}decor${tx},${ty}`);
    spots = Array.from({ length: DECOR_PER_TILE }, (_, n) => ({
      x: (tx + r()) * DECOR_TILE,
      y: (ty + r()) * DECOR_TILE,
      mw: 15 + r() * 19,
      mh: 19 + r() * 23,
      tw: 5 + r() * 4,
      th: 7 + r() * 5,
      n,
    }));
    if (decorTiles.size >= 400)
      decorTiles.delete(decorTiles.keys().next().value!);
    decorTiles.set(key, spots);
  }
  return spots;
}
/**
 * Decoration spots on the map, in map pixels, nearest last. They are fixed to
 * the land rather than the sheet, so resizing a map does not move the trees.
 */
export type Erased = NonNullable<MapData["decorErased"]>;
/** Erased circles bucketed by decoration tile, built once per list. */
const erasedIndexes = new WeakMap<Erased, Map<string, Erased>>();
function erasedIndex(list: Erased) {
  let index = erasedIndexes.get(list);
  if (!index) {
    index = new Map();
    for (const c of list)
      for (
        let ty = Math.floor((c.y - c.r) / DECOR_TILE);
        ty <= Math.floor((c.y + c.r) / DECOR_TILE);
        ty++
      )
        for (
          let tx = Math.floor((c.x - c.r) / DECOR_TILE);
          tx <= Math.floor((c.x + c.r) / DECOR_TILE);
          tx++
        ) {
          const key = `${tx},${ty}`;
          index.get(key)?.push(c) ?? index.set(key, [c]);
        }
    erasedIndexes.set(list, index);
  }
  return index;
}
const isErased = (index: Map<string, Erased>, x: number, y: number) =>
  !!index
    .get(`${Math.floor(x / DECOR_TILE)},${Math.floor(y / DECOR_TILE)}`)
    ?.some((c) => Math.hypot(c.x - x, c.y - y) < c.r);

/** Cells to repaint for newly erased circles, with room for sprites that reach past them. */
export function decorRegion(map: MapData, circles: Erased): CellRect {
  const ox = map.origin?.x ?? 0,
    oy = map.origin?.y ?? 0,
    cx = map.cols / map.width,
    cy = map.rows / map.height;
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const c of circles) {
    x0 = Math.min(x0, c.x + ox - c.r - 70);
    y0 = Math.min(y0, c.y + oy - c.r - 70);
    x1 = Math.max(x1, c.x + ox + c.r + 70);
    y1 = Math.max(y1, c.y + oy + c.r + 70);
  }
  return {
    x0: Math.max(0, Math.floor(x0 * cx)),
    y0: Math.max(0, Math.floor(y0 * cy)),
    x1: Math.min(map.cols - 1, Math.ceil(x1 * cx)),
    y1: Math.min(map.rows - 1, Math.ceil(y1 * cy)),
  };
}

function decorFor(map: MapData, area?: Rect) {
  const ox = map.origin?.x ?? 0,
    oy = map.origin?.y ?? 0,
    x0 = (area ? Math.max(0, area.x - 70) : 0) - ox,
    y0 = (area ? Math.max(0, area.y - 70) : 0) - oy,
    x1 = (area ? Math.min(map.width, area.x + area.w + 70) : map.width) - ox,
    y1 = (area ? Math.min(map.height, area.y + area.h + 70) : map.height) - oy,
    out: DecorSpot[] = [],
    erased = map.decorErased?.length ? erasedIndex(map.decorErased) : null;
  for (let ty = Math.floor(y0 / DECOR_TILE); ty * DECOR_TILE < y1; ty++)
    for (let tx = Math.floor(x0 / DECOR_TILE); tx * DECOR_TILE < x1; tx++)
      for (const spot of decorTile(map.settings.seed, tx, ty)) {
        if (erased && isErased(erased, spot.x, spot.y)) continue;
        const x = spot.x + ox,
          y = spot.y + oy;
        // Keep clear of the frame drawn around the sheet.
        if (x < 30 || y < 30 || x > map.width - 30 || y > map.height - 30)
          continue;
        out.push({ ...spot, x, y });
      }
  // Painter's algorithm: nearer (lower) symbols overlap the ones behind.
  return out.sort((a, b) => a.y - b.y || a.x - b.x);
}

export function drawDecor(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  biomes: Uint8Array | undefined,
  area?: Rect,
) {
  const { cols, rows, heights, width, height } = map,
    set = decorSetFor(map.settings.style),
    canopy = set.canopy,
    seed = hash(map.settings.seed),
    towns = set.trimmed || set.canopy ? settlements(map) : [];
  if (set.none) return;
  for (const spot of decorFor(map, area)) {
    // Sprites reach up to ~60 px beyond their centre.
    if (
      area &&
      (spot.x < area.x - 70 ||
        spot.x > area.x + area.w + 70 ||
        spot.y < area.y - 70 ||
        spot.y > area.y + area.h + 70)
    )
      continue;
    const cx = Math.floor((spot.x / width) * cols),
      cy = Math.floor((spot.y / height) * rows),
      i = cy * cols + cx,
      h = heights[i],
      b = biomes ? biomes[i] : biomeAt(map, cx, cy);
    // Nothing grows under water, whatever biome was painted there.
    if (h < map.settings.seaLevel) continue;
    let kind: DecorKind | null = null,
      size = 0;
    if (canopy && h <= 0.71 && isWooded(b)) {
      // Every spot may grow a tree, but only inside a clump.
      if (canopy.every && spot.n % canopy.every) continue;
      if (!inClump(canopy, spot.x, spot.y, seed)) continue;
      kind = BIOME_DECOR[b] ?? "forest";
      size = spot.tw * 2.8;
    } else if (spot.n % 3 === 0) {
      if (h > 0.71) {
        // Occasional volcano-like peaks stand out among the ranges.
        // Every other candidate: ranges stay readable instead of a solid scribble.
        if (spot.n % 2) continue;
        kind = h > 0.85 && spot.n % 18 === 0 ? "peak" : "mountain";
        size = spot.mw * 1.55;
      } else {
        const grown = BIOME_DECOR[b];
        kind = grown && spot.n % decorStep(grown) === 0 ? grown : null;
        size = spot.tw * 2.8;
      }
    }
    if (!kind) continue;
    if (nearTown(towns, spot.x, spot.y)) continue;
    const pool = set.pools[kind],
      src = pool[poolIndex(spot.n, kind, pool.length)];
    if (set.trimmed) {
      const sprite = decorSprite(src);
      if (sprite) drawPainted(ctx, sprite, spot, size * set.scale[kind]);
      else wantSprite(src);
      continue;
    }
    const img = imageCache.get(src);
    if (!img?.complete) continue;
    // The sprite's base sits on the spot, so symbols overlap like real terrain.
    ctx.globalAlpha = size > 20 && h > 0.71 ? 0.82 : 0.75;
    ctx.drawImage(img, spot.x - size / 2, spot.y - size * 0.72, size, size);
  }
  ctx.globalAlpha = 1;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
