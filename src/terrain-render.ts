import { biomeAt } from "./generator";
import {
  biomeMaterial,
  DEEP_WATER,
  defaultTextures,
  hexToRgb,
  mipChain,
  paintedMaterial,
  patternTile,
  SHALLOW_WATER,
  TILE,
  WORLD_TILE,
} from "./materials";
import { hash, noise, random } from "./random";
import { imageCache } from "./render";
import { DECOR_SPRITES } from "./symbols";
import type { MapData, TextureLayer } from "./types";

/** Inclusive rectangle of terrain cells. */
export interface CellRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const parchment = [
  [234, 232, 215],
  [226, 225, 213],
  [168, 164, 139],
  [183, 187, 159],
  [151, 165, 130],
  [190, 197, 151],
  [140, 159, 113],
  [142, 164, 139],
  [215, 198, 150],
  [191, 192, 128],
  [122, 153, 106],
  [222, 214, 178],
  [190, 210, 207],
  [190, 164, 118],
];
const painted = [
  [238, 244, 235],
  [206, 210, 193],
  [136, 147, 129],
  [169, 185, 152],
  [91, 139, 103],
  [148, 181, 109],
  [64, 127, 83],
  [69, 143, 117],
  [223, 194, 119],
  [181, 190, 99],
  [42, 117, 76],
  [224, 214, 162],
  [62, 122, 150],
  [172, 130, 88],
];
const atlas = [
  [241, 244, 236],
  [192, 188, 168],
  [142, 146, 123],
  [160, 176, 146],
  [111, 146, 117],
  [164, 184, 127],
  [99, 146, 106],
  [99, 152, 134],
  [217, 196, 140],
  [180, 187, 119],
  [78, 138, 103],
  [218, 214, 175],
  [94, 149, 164],
  [160, 128, 92],
];

// Every green biome shares one ground colour, the dark forest grass (index 6).
// Biomes still differ in what grows on them: pines, broadleaf trees, palms.
const GREEN_BIOMES = [4, 5, 7, 9, 10];
for (const palette of [parchment, painted, atlas])
  for (const b of GREEN_BIOMES) palette[b] = palette[6];

/** Open-water colour of a map style, so rivers can match the sea exactly. */
export function seaColor(style: string) {
  const [r, g, b] = paletteOf(style)[12];
  return `rgb(${r}, ${g}, ${b})`;
}

/** Ground colour of each built-in material per style, taken from the biome palette. */
const STYLE_COLOURS: Record<string, number> = {
  snow: 1,
  rock: 2,
  dirt: 13,
  grass: 6,
  sand: 11,
  [SHALLOW_WATER]: 12,
  [DEEP_WATER]: 12,
};
const paletteOf = (style: string) =>
  style === "parchment" ? parchment : style === "painted" ? painted : atlas;

let textureLayers: TextureLayer[] = defaultTextures(),
  textureVersion = 0;
/** Decoded uploaded tiles, keyed by their data URL. */
const uploads = new Map<string, Float32Array[]>();
/** Generated pattern tiles, shared by every style and colour. */
const patterns = new Map<string, Float32Array[]>();

/**
 * Sets the project's texture layers. Uploaded tiles are decoded first; the
 * promise settles once the next draw will show the new textures.
 */
export async function setTextureLayers(layers: TextureLayer[]) {
  await Promise.all(
    layers
      .filter((l) => l.image && !uploads.has(l.image))
      .map(async (l) => {
        try {
          uploads.set(l.image!, await decodeTile(l.image!));
        } catch {
          // A broken image falls back to the generated pattern.
        }
      }),
  );
  textureLayers = layers;
  textureVersion++;
  entries.clear();
}

async function decodeTile(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = TILE;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, TILE, TILE);
  const data = ctx.getImageData(0, 0, TILE, TILE).data,
    rgb = new Float32Array(TILE * TILE * 3);
  for (let i = 0; i < TILE * TILE; i++)
    for (let k = 0; k < 3; k++) rgb[i * 3 + k] = data[i * 4 + k];
  return mipChain(rgb, TILE, 3);
}

/** A material ready to sample: RGB mip levels for the current style. */
interface Material {
  levels: Float32Array[];
  /** Tile texels per map pixel at full size. */
  density: number;
}

/** The colour a texture layer starts from: its own tint, else the map style's. */
function baseColour(layer: TextureLayer, style: string) {
  return layer.tint
    ? hexToRgb(layer.tint)
    : (paletteOf(style)[
        STYLE_COLOURS[layer.id] ?? STYLE_COLOURS[layer.pattern] ?? 5
      ] as [number, number, number]);
}
/** `baseColour` as a hex string, for colour pickers. */
export const textureColour = (layer: TextureLayer, style: string) =>
  "#" +
  baseColour(layer, style)
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("");

function buildMaterial(layer: TextureLayer, style: string): Material {
  const density = TILE / ((WORLD_TILE * layer.scale) / 100),
    upload = layer.image ? uploads.get(layer.image) : undefined;
  if (upload) return { levels: upload, density };
  let detail = patterns.get(layer.pattern);
  if (!detail)
    patterns.set(layer.pattern, (detail = patternTile(layer.pattern)));
  const base = baseColour(layer, style),
    deep = layer.id === DEEP_WATER && !layer.tint,
    darken = deep ? (style === "parchment" ? 3 : 10) : 0,
    contrast = layer.visible ? (layer.strength / 100) * 0.3 : 0;
  return {
    density,
    levels: detail.map((level) => {
      const rgb = new Float32Array(level.length * 3);
      for (let i = 0; i < level.length; i++) {
        const f = 1 + level[i] * contrast;
        for (let k = 0; k < 3; k++) rgb[i * 3 + k] = (base[k] - darken) * f;
      }
      return rgb;
    }),
  };
}

interface Entry {
  heights: number[];
  biomes: number[];
  materials?: number[];
  signature: string;
  texture: HTMLCanvasElement;
  image: ImageData;
  biomeGrid: Uint8Array;
  /** Index into `layers` of each cell's ground material. */
  cellMaterial: Uint8Array;
  /** Hand-painted ground per cell: 0 none, 1 land, 2 shallow ocean, 3 deep ocean. */
  painted: Uint8Array;
  slope: Float32Array;
  layers: Material[];
  shallow: number;
  deep: number;
  base: HTMLCanvasElement;
  baseKey: string;
}
const entries = new Map<string, Entry>();

function signature(map: MapData) {
  const s = map.settings;
  return [
    s.style,
    s.seaLevel,
    s.seed,
    s.rainfall,
    s.latitude,
    s.temperature,
    s.wind,
    map.cols,
    map.rows,
    map.width,
    map.height,
    textureVersion,
  ].join("|");
}

function entryFor(map: MapData) {
  const sig = signature(map);
  let entry = entries.get(map.id);
  if (!entry || entry.signature !== sig) {
    // The cached bitmap holds one texel per map pixel.
    const texture = document.createElement("canvas");
    texture.width = map.width;
    texture.height = map.height;
    const base = document.createElement("canvas");
    base.width = map.width;
    base.height = map.height;
    const layers = textureLayers.map((l) =>
        buildMaterial(l, map.settings.style),
      ),
      find = (id: string) =>
        Math.max(
          0,
          textureLayers.findIndex((l) => l.id === id),
        );
    entry = {
      heights: [],
      biomes: [],
      signature: sig,
      texture,
      image: texture
        .getContext("2d")!
        .createImageData(texture.width, texture.height),
      biomeGrid: new Uint8Array(map.cols * map.rows),
      cellMaterial: new Uint8Array(map.cols * map.rows),
      painted: new Uint8Array(map.cols * map.rows),
      slope: new Float32Array(map.cols * map.rows),
      layers,
      shallow: find(SHALLOW_WATER),
      deep: find(DEEP_WATER),
      base,
      baseKey: "",
    };
    entries.delete(map.id);
    entries.set(map.id, entry);
    // Keep the memory held by cached landscapes bounded.
    while (entries.size > 4) entries.delete(entries.keys().next().value!);
  }
  return entry;
}

/** Forget cached landscape pixels for a map, forcing the next draw to rebuild. */
export function invalidateTerrain(mapId?: string) {
  if (mapId) entries.delete(mapId);
  else entries.clear();
}

/** Recomputes biome, material and slope for a block of cells. */
function classifyCells(
  map: MapData,
  entry: Entry,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
) {
  const { cols, heights } = map,
    index = new Map(textureLayers.map((l, i) => [l.id, i]));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * cols + x,
        b = biomeAt(map, x, y);
      entry.biomeGrid[i] = b;
      const painted = paintedMaterial(map, map, i);
      entry.painted[i] =
        painted === undefined || !index.has(painted)
          ? 0
          : painted === SHALLOW_WATER
            ? 2
            : painted === DEEP_WATER
              ? 3
              : 1;
      entry.cellMaterial[i] =
        (painted !== undefined ? index.get(painted) : undefined) ??
        index.get(biomeMaterial(b)) ??
        0;
      entry.slope[i] =
        (heights[Math.max(0, i - cols - 1)] -
          heights[Math.min(heights.length - 1, i + cols + 1)]) *
        65;
    }
}

/**
 * Paints terrain pixels into `data` (`dataWidth` wide). Output pixel (u, v)
 * shows map point (ox + (u + 0.5) / scale, oy + (v + 0.5) / scale), so the same
 * code fills the cached 1x bitmap and sharp close-ups at any zoom.
 */
function paintPixels(
  map: MapData,
  entry: Entry,
  data: Uint8ClampedArray,
  dataWidth: number,
  ox: number,
  oy: number,
  scale: number,
  u0: number,
  v0: number,
  u1: number,
  v1: number,
) {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel,
    seed = hash(map.settings.seed),
    sx = map.width / cols,
    sy = map.height / rows,
    mats = entry.cellMaterial,
    paint = entry.painted,
    slope = entry.slope,
    // Pick the mip level whose texels are about one output pixel each.
    pick = (m: Material) => {
      const level = Math.max(
        0,
        Math.min(
          m.levels.length - 1,
          Math.floor(Math.log2(Math.max(1, m.density / scale))),
        ),
      );
      return {
        rgb: m.levels[level],
        size: TILE >> level,
        k: m.density / 2 ** level,
      };
    },
    tiles = entry.layers.map(pick),
    sample = (m: number, mx: number, my: number, out: number[], w: number) => {
      const t = tiles[m],
        tx = ((Math.floor(mx * t.k) % t.size) + t.size) % t.size,
        ty = ((Math.floor(my * t.k) % t.size) + t.size) % t.size,
        p = (ty * t.size + tx) * 3;
      out[0] += t.rgb[p] * w;
      out[1] += t.rgb[p + 1] * w;
      out[2] += t.rgb[p + 2] * w;
    },
    colour = [0, 0, 0],
    candidates = [0, 0, 0, 0],
    weights = [0, 0, 0, 0];
  for (let v = v0; v < v1; v++) {
    const my = oy + (v + 0.5) / scale,
      gy = Math.min(rows - 1.001, Math.max(0, my / sy)),
      iy = Math.floor(gy),
      fy = gy - iy;
    for (let u = u0; u < u1; u++) {
      const mx = ox + (u + 0.5) / scale,
        gx = Math.min(cols - 1.001, Math.max(0, mx / sx)),
        ix = Math.floor(gx),
        fx = gx - ix,
        i = iy * cols + ix,
        wa = (1 - fx) * (1 - fy),
        wb = fx * (1 - fy),
        wc = (1 - fx) * fy,
        wd = fx * fy,
        h =
          heights[i] * wa +
          heights[i + 1] * wb +
          heights[i + cols] * wc +
          heights[i + cols + 1] * wd;
      colour[0] = colour[1] = colour[2] = 0;
      let shade: number;
      // Painted ground sits on top of the land and the sea alike: land
      // ground covers open water, and ocean paint floods dry land.
      const pa = paint[i],
        pb = paint[i + 1],
        pc = paint[i + cols],
        pd = paint[i + cols + 1],
        share = (kind: number) =>
          (pa === kind ? wa : 0) +
          (pb === kind ? wb : 0) +
          (pc === kind ? wc : 0) +
          (pd === kind ? wd : 0),
        land = share(1),
        shallowPaint = share(2),
        deepPaint = share(3),
        floodPaint = shallowPaint + deepPaint,
        frayed = (noise(mx / 5, my / 5, seed + 977) - 0.5) * 0.3;
      let isWater = h < sea,
        depth = Math.min(1, Math.max(0, (sea - h) * 10));
      if (isWater && land >= 0.5 + frayed) isWater = false;
      else if (floodPaint >= 0.5 + frayed) isWater = true;
      if (isWater && floodPaint >= 0.5 + frayed)
        depth = deepPaint / floodPaint;
      if (isWater) {
        // One water surface: shallow near every shore, deeper further out.
        sample(entry.shallow, mx, my, colour, 1 - depth);
        sample(entry.deep, mx, my, colour, depth);
        shade = 0;
      } else {
        const a = mats[i],
          b = mats[i + 1],
          c = mats[i + cols],
          d = mats[i + cols + 1];
        let winner = a;
        if (a !== b || a !== c || a !== d) {
          // Where materials meet, noise frays the border and later layers win ties.
          let count = 0;
          for (const [m, w] of [
            [a, wa],
            [b, wb],
            [c, wc],
            [d, wd],
          ]) {
            let k = 0;
            while (k < count && candidates[k] !== m) k++;
            if (k === count) {
              candidates[count] = m;
              weights[count++] = 0;
            }
            weights[k] += w;
          }
          let best = -9;
          for (let k = 0; k < count; k++) {
            const m = candidates[k],
              score =
                weights[k] +
                (noise(mx / 5, my / 5, seed + m * 131) - 0.5) * 0.6 +
                (noise(mx / 1.5, my / 1.5, seed + m * 17) - 0.5) * 0.15 +
                m * 0.012;
            if (score > best) {
              best = score;
              winner = m;
            }
          }
        }
        sample(winner, mx, my, colour, 1);
        shade =
          slope[i] * wa +
          slope[i + 1] * wb +
          slope[i + cols] * wc +
          slope[i + cols + 1] * wd;
      }
      const p = (v * dataWidth + u) * 4;
      data[p] = colour[0] + shade;
      data[p + 1] = colour[1] + shade;
      data[p + 2] = colour[2] + shade;
      data[p + 3] = 255;
    }
  }
}

/**
 * Brings the texture up to date. Returns whether anything changed and, for an
 * incremental update, the cell rectangle that was repainted.
 */
function updateTexture(
  map: MapData,
  entry: Entry,
  dirty?: CellRect,
): { changed: boolean; region?: CellRect } {
  const identityChanged =
    entry.heights !== map.heights ||
    entry.biomes !== map.biomes ||
    entry.materials !== map.materials;
  const full = !dirty && (identityChanged || entry.heights.length === 0);
  let changed = full,
    region: CellRect | undefined;
  const sx = map.width / map.cols,
    sy = map.height / map.rows;
  if (full || (dirty && entry.heights.length === 0)) {
    classifyCells(map, entry, 0, 0, map.cols - 1, map.rows - 1);
    paintPixels(
      map,
      entry,
      entry.image.data,
      map.width,
      0,
      0,
      1,
      0,
      0,
      map.width,
      map.height,
    );
    entry.texture.getContext("2d")!.putImageData(entry.image, 0, 0);
    changed = true;
  } else if (dirty) {
    // Biome rules look eight cells upwind, so a height edit can recolour a
    // horizontal margin around the brush.
    const bx0 = Math.max(0, dirty.x0 - 9),
      bx1 = Math.min(map.cols - 1, dirty.x1 + 9),
      by0 = Math.max(0, dirty.y0 - 1),
      by1 = Math.min(map.rows - 1, dirty.y1 + 1);
    classifyCells(map, entry, bx0, by0, bx1, by1);
    const x0 = Math.max(0, bx0 - 1),
      y0 = Math.max(0, by0 - 1),
      x1 = Math.min(map.cols - 1, bx1 + 1),
      y1 = Math.min(map.rows - 1, by1 + 1),
      u0 = Math.floor(x0 * sx),
      v0 = Math.floor(y0 * sy),
      u1 = Math.min(map.width, Math.ceil((x1 + 1) * sx)),
      v1 = Math.min(map.height, Math.ceil((y1 + 1) * sy));
    paintPixels(
      map,
      entry,
      entry.image.data,
      map.width,
      0,
      0,
      1,
      u0,
      v0,
      u1,
      v1,
    );
    entry.texture
      .getContext("2d")!
      .putImageData(entry.image, 0, 0, u0, v0, u1 - u0, v1 - v0);
    changed = true;
    region = { x0, y0, x1, y1 };
  }
  entry.heights = map.heights;
  entry.biomes = map.biomes;
  entry.materials = map.materials;
  return { changed, region };
}

/**
 * Draws the terrain into `ctx` at whatever zoom its transform has. Close up it
 * paints the visible part at screen resolution, so textures stay sharp.
 */
function drawTerrainImage(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  entry: Entry,
) {
  const t = ctx.getTransform(),
    scale = t.a;
  if (scale <= 1.05 || t.b || t.c || Math.abs(t.d - scale) > 1e-6) {
    ctx.drawImage(entry.texture, 0, 0, map.width, map.height);
    return;
  }
  const x0 = Math.max(0, -t.e / scale),
    y0 = Math.max(0, -t.f / scale),
    x1 = Math.min(map.width, (ctx.canvas.width - t.e) / scale),
    y1 = Math.min(map.height, (ctx.canvas.height - t.f) / scale),
    w = Math.ceil((x1 - x0) * scale),
    h = Math.ceil((y1 - y0) * scale);
  if (w <= 0 || h <= 0) return;
  if (w * h > 40_000_000) {
    ctx.drawImage(entry.texture, 0, 0, map.width, map.height);
    return;
  }
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!,
    image = c.createImageData(w, h);
  paintPixels(map, entry, image.data, w, x0, y0, scale, 0, 0, w, h);
  c.putImageData(image, 0, 0);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.drawImage(
    canvas,
    Math.round(x0 * scale + t.e),
    Math.round(y0 * scale + t.f),
  );
  ctx.restore();
}

function coast(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  level: number,
  color: string,
  width: number,
  area?: CellRect,
) {
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  const { cols, rows, heights } = map,
    sx = map.width / cols,
    sy = map.height / rows,
    px = new Float64Array(4),
    py = new Float64Array(4),
    yStart = area ? Math.max(0, area.y0) : 0,
    yEnd = area ? Math.min(rows - 1, area.y1 + 1) : rows - 1,
    xStart = area ? Math.max(0, area.x0) : 0,
    xEnd = area ? Math.min(cols - 1, area.x1 + 1) : cols - 1;
  for (let y = yStart; y < yEnd; y++)
    for (let x = xStart; x < xEnd; x++) {
      const i = y * cols + x,
        a = heights[i],
        b = heights[i + 1],
        c = heights[i + cols + 1],
        d = heights[i + cols],
        ma = a >= level,
        mb = b >= level,
        mc = c >= level,
        md = d >= level;
      if (ma === mb && mb === mc && mc === md) continue;
      let n = 0;
      if (ma !== mb) {
        px[n] = (x + (level - a) / (b - a)) * sx;
        py[n++] = y * sy;
      }
      if (mb !== mc) {
        px[n] = (x + 1) * sx;
        py[n++] = (y + (level - b) / (c - b)) * sy;
      }
      if (mc !== md) {
        px[n] = (x + 1 - (level - c) / (d - c)) * sx;
        py[n++] = (y + 1) * sy;
      }
      if (md !== ma) {
        px[n] = x * sx;
        py[n++] = (y + 1 - (level - d) / (a - d)) * sy;
      }
      for (let k = 1; k < n; k += 2) {
        ctx.moveTo(px[k - 1], py[k - 1]);
        ctx.lineTo(px[k], py[k]);
      }
    }
  ctx.stroke();
}

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
const DECOR_PER_TILE = Math.round((3000 * DECOR_TILE * DECOR_TILE) / (1140 * 790));
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
function decorFor(map: MapData, area?: Rect) {
  const ox = map.origin?.x ?? 0,
    oy = map.origin?.y ?? 0,
    x0 = (area ? Math.max(0, area.x - 70) : 0) - ox,
    y0 = (area ? Math.max(0, area.y - 70) : 0) - oy,
    x1 = (area ? Math.min(map.width, area.x + area.w + 70) : map.width) - ox,
    y1 = (area ? Math.min(map.height, area.y + area.h + 70) : map.height) - oy,
    out: DecorSpot[] = [];
  for (let ty = Math.floor(y0 / DECOR_TILE); ty * DECOR_TILE < y1; ty++)
    for (let tx = Math.floor(x0 / DECOR_TILE); tx * DECOR_TILE < x1; tx++)
      for (const spot of decorTile(map.settings.seed, tx, ty)) {
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

function drawDecor(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  entry: Entry | undefined,
  area?: Rect,
) {
  const { cols, rows, heights, width, height } = map;
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
      b = entry ? entry.biomeGrid[i] : biomeAt(map, cx, cy);
    let pool: readonly string[] | null = null,
      size = 0;
    if (spot.n % 3 === 0) {
      if (h > 0.71) {
        // Occasional volcano-like peaks stand out among the ranges.
        // Every other candidate: ranges stay readable instead of a solid scribble.
        if (spot.n % 2) continue;
        pool =
          h > 0.85 && spot.n % 18 === 0
            ? DECOR_SPRITES.peak
            : DECOR_SPRITES.mountain;
        size = spot.mw * 1.55;
      } else {
        pool =
          b === 4
            ? DECOR_SPRITES.pine
            : b === 6
              ? DECOR_SPRITES.forest
              : b === 10
                ? DECOR_SPRITES.jungle
                : b === 8 && spot.n % 9 === 0
                  ? DECOR_SPRITES.desert
                  : b === 9 && spot.n % 9 === 0
                    ? DECOR_SPRITES.savanna
                    : null;
        size = spot.tw * 2.8;
      }
    }
    if (!pool) continue;
    const img = imageCache.get(pool[((spot.n / 3) % pool.length) | 0]);
    if (!img?.complete) continue;
    // The sprite's base sits on the spot, so symbols overlap like real terrain.
    ctx.globalAlpha = size > 20 && h > 0.71 ? 0.82 : 0.75;
    ctx.drawImage(img, spot.x - size / 2, spot.y - size * 0.72, size, size);
  }
  ctx.globalAlpha = 1;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
function paintLandscape(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  entry: Entry,
  contours: boolean,
  vector: boolean,
  region?: CellRect,
) {
  let area: Rect | undefined;
  if (region) {
    // Repaint just this part: the clip keeps every other pixel as it was, and
    // the margins cover lines and symbols that straddle the edge.
    const cx = map.width / map.cols,
      cy = map.height / map.rows,
      x0 = Math.max(0, Math.floor((region.x0 - 2) * cx)),
      y0 = Math.max(0, Math.floor((region.y0 - 2) * cy)),
      x1 = Math.min(map.width, Math.ceil((region.x1 + 3) * cx)),
      y1 = Math.min(map.height, Math.ceil((region.y1 + 3) * cy));
    area = { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
    ctx.save();
    ctx.beginPath();
    ctx.rect(area.x, area.y, area.w, area.h);
    ctx.clip();
    region = {
      x0: region.x0 - 3,
      y0: region.y0 - 3,
      x1: region.x1 + 3,
      y1: region.y1 + 3,
    };
  }
  if (vector) drawTerrainImage(ctx, map, entry);
  else ctx.drawImage(entry.texture, 0, 0, map.width, map.height);
  coast(ctx, map, map.settings.seaLevel, "#657c69", 1.1, region);
  coast(ctx, map, map.settings.seaLevel - 0.015, "#93aaa1", 0.65, region);
  coast(ctx, map, map.settings.seaLevel - 0.035, "#aabbb0", 0.6, region);
  if (contours)
    for (let h = map.settings.seaLevel + 0.07; h < 1; h += 0.055)
      coast(ctx, map, h, "#6d725d44", 0.7, region);
  if (map.kind === "world") drawDecor(ctx, map, entry, area);
  if (area) ctx.restore();
}

/**
 * Draws the landscape. Pass `dirty` while sculpting to repaint only the cells
 * that changed; unchanged landscapes are blitted from a cached bitmap.
 */
export function drawLandscape(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  contours = false,
  options: { dirty?: CellRect; vector?: boolean } = {},
) {
  const entry = entryFor(map),
    { changed, region } = updateTexture(map, entry, options.dirty);
  if (options.vector) {
    // Exports draw straight into the (possibly scaled) target for crisp lines.
    paintLandscape(ctx, map, entry, contours, true);
    return;
  }
  const key = String(contours);
  if (changed || entry.baseKey !== key) {
    const base = entry.base.getContext("2d")!;
    // A partial texture update can be blitted into the cached bitmap in place,
    // provided that bitmap already shows the same contour setting.
    const partial = !!region && entry.baseKey === key;
    if (!partial) base.clearRect(0, 0, map.width, map.height);
    paintLandscape(
      base,
      map,
      entry,
      contours,
      false,
      partial ? region : undefined,
    );
    entry.baseKey = key;
  }
  ctx.drawImage(entry.base, 0, 0, map.width, map.height);
}

const previews = new Map<string, string>();
/** A small picture of a texture layer for swatches, as a data URL. */
export function texturePreview(layer: TextureLayer, style: string, size = 48) {
  const key = [
    layer.pattern,
    layer.image?.length,
    layer.image?.slice(-32),
    layer.tint,
    layer.scale,
    layer.strength,
    layer.visible,
    layer.id,
    style,
    textureVersion,
  ].join("|");
  let url = previews.get(key);
  if (url) return url;
  const material = buildMaterial(layer, style),
    canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d")!,
    image = ctx.createImageData(size, size),
    rgb = material.levels[0];
  // The swatch shows one tile squeezed into the square, a little larger than on the map.
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const p =
          (Math.floor((y / size) * TILE) * TILE +
            Math.floor((x / size) * TILE)) *
          3,
        q = (y * size + x) * 4;
      image.data[q] = rgb[p];
      image.data[q + 1] = rgb[p + 1];
      image.data[q + 2] = rgb[p + 2];
      image.data[q + 3] = 255;
    }
  ctx.putImageData(image, 0, 0);
  url = canvas.toDataURL();
  if (previews.size > 200) previews.clear();
  previews.set(key, url);
  return url;
}

const waterTiles = new WeakMap<Entry, HTMLCanvasElement>();
/**
 * A fill that paints exactly what the terrain paints at the shore of a lake
 * or the sea, so rivers drawn with it join open water without a seam.
 */
export function shallowWaterPattern(
  ctx: CanvasRenderingContext2D,
  map: MapData,
) {
  const entry = entryFor(map),
    material = entry.layers[entry.shallow];
  let tile = waterTiles.get(entry);
  if (!tile) {
    tile = document.createElement("canvas");
    tile.width = tile.height = TILE;
    const c = tile.getContext("2d")!,
      image = c.createImageData(TILE, TILE),
      rgb = material.levels[0];
    for (let i = 0; i < TILE * TILE; i++) {
      image.data[i * 4] = rgb[i * 3];
      image.data[i * 4 + 1] = rgb[i * 3 + 1];
      image.data[i * 4 + 2] = rgb[i * 3 + 2];
      image.data[i * 4 + 3] = 255;
    }
    c.putImageData(image, 0, 0);
    waterTiles.set(entry, tile);
  }
  const pattern = ctx.createPattern(tile, "repeat");
  pattern?.setTransform(new DOMMatrix().scale(1 / material.density));
  return pattern;
}
