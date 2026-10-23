import { biomeAt } from "./generator";
import {
  biomeMaterial,
  DEEP_WATER,
  defaultTextures,
  paintedMaterial,
  SHALLOW_WATER,
  TILE,
} from "./materials";
import { hexBlend } from "./hex-tiling";
import { BIOME_GROUNDS } from "./biome-grounds";
import { Biome, FIRST_PAINTED_ONLY, MAX_BIOME } from "./biomes";
import { decodeTile } from "./tile-decode";
import {
  biomeGround,
  buildMaterial,
  covers,
  decodeCover,
  reefGround,
  uploads,
} from "./terrain-material";
import type { Cover, Material } from "./terrain-material";
export { seaColor, textureColour } from "./terrain-material";
import { hash, noise } from "./random";
import { decorRegion, drawDecor } from "./decor";
import { reliefOf, shadeAt } from "./relief";
import type { Relief } from "./relief";
import { coastLines } from "./style-coast";
import type { Erased, Rect } from "./decor";
import type { MapData, TextureLayer } from "./types";

/** Inclusive rectangle of terrain cells. */
export interface CellRect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

let textureLayers: TextureLayer[] = defaultTextures(),
  textureVersion = 0;
/**
 * Sets the project's texture layers. Uploaded tiles are decoded first; the
 * promise settles once the next draw will show the new textures.
 */
export async function setTextureLayers(layers: TextureLayer[]) {
  await Promise.all([
    ...layers
      .filter((l) => l.image && !uploads.has(l.image))
      .map(async (l) => {
        try {
          uploads.set(l.image!, await decodeTile(l.image!));
        } catch {
          // A broken image falls back to the generated pattern.
        }
      }),
    ...layers
      .filter((l) => l.cover && !covers.has(l.cover))
      .map(async (l) => {
        try {
          covers.set(l.cover!, await decodeCover(l.cover!));
        } catch {
          // A broken cover falls back to blended tiles.
        }
      }),
  ]);
  textureLayers = layers;
  textureVersion++;
  entries.clear();
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
  slope: Float32Array;
  /** How the style shades the land, or null for the faint diagonal shade. */
  relief: Relief;
  layers: Material[];
  /**
   * Where the slots after the project's layers begin: one for each biome's own
   * ground and one for the reef's coral. A slot holds a stand-in until it is
   * built, and keeps its index however the map was painted: the noise that
   * frays the border between two grounds is seeded by it.
   */
  firstSlot: number;
  /**
   * Index into `layers` of each biome's own ground, built the first time a
   * cell of that biome is classified: `UNBUILT` until then, -1 for a biome
   * drawn with a built-in layer.
   */
  biomeLayer: Int16Array;
  /** Index into `layers` of the coral drawn over the shallows of a reef: `UNBUILT` until a reef cell is classified. */
  reef: number;
  shallow: number;
  deep: number;
  base: HTMLCanvasElement;
  baseKey: string;
  /** The erased-decoration list the cached bitmap was drawn with. */
  decorErased?: Erased;
}
const entries = new Map<string, Entry>();
const UNBUILT = -2;

/**
 * The layer index of a biome's own ground, building it on first use. A town or
 * dungeon sits at one latitude whose biome is woods, so only a world map takes
 * the grounds of the biomes a generator places; the hand-painted ones apply
 * anywhere.
 */
function biomeLayer(map: MapData, entry: Entry, biome: number) {
  let layer = entry.biomeLayer[biome];
  if (layer === UNBUILT) {
    const recipe = BIOME_GROUNDS[biome],
      ground =
        recipe && (map.kind === "world" || biome >= FIRST_PAINTED_ONLY)
          ? biomeGround(
              map.settings.style,
              biome,
              textureLayers.find((l) => l.id === recipe.base),
            )
          : undefined;
    layer = ground ? entry.firstSlot + biome : -1;
    if (ground) entry.layers[layer] = ground;
    entry.biomeLayer[biome] = layer;
  }
  return layer;
}

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
        ),
      firstSlot = layers.length;
    for (let k = 0; k <= MAX_BIOME + 1; k++) layers.push(layers[0]);
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
      slope: new Float32Array(map.cols * map.rows),
      relief: reliefOf(map.settings.style),
      layers,
      firstSlot,
      biomeLayer: new Int16Array(MAX_BIOME + 1).fill(UNBUILT),
      reef: UNBUILT,
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

/** Repaint a map's cached decoration on the next draw, once pictures it lacked have loaded. */
export function invalidateDecor(mapId: string) {
  const entry = entries.get(mapId);
  if (entry) entry.baseKey = "";
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
  const { cols, rows, heights } = map,
    index = new Map(textureLayers.map((l, i) => [l.id, i]));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * cols + x,
        b = biomeAt(map, x, y);
      entry.biomeGrid[i] = b;
      if (b === Biome.CoralReef && entry.reef === UNBUILT) {
        const coral = reefGround(
          map.settings.style,
          textureLayers.find((l) => l.id === "sand"),
        );
        entry.reef = coral ? entry.firstSlot + MAX_BIOME + 1 : -1;
        if (coral) entry.layers[entry.reef] = coral;
      }
      const painted = paintedMaterial(map, map, i);
      entry.cellMaterial[i] =
        (painted !== undefined ? index.get(painted) : undefined) ??
        (biomeLayer(map, entry, b) >= 0 ? entry.biomeLayer[b] : undefined) ??
        index.get(biomeMaterial(b)) ??
        0;
      entry.slope[i] = shadeAt(heights, cols, rows, x, y, entry.relief);
    }
}

/** Bilinear sample of a cover image at (`u`, `v`) in 0–1 map coordinates. */
function coverAt(c: Cover, u: number, v: number, out: number[]) {
  const x = Math.min(c.width - 1.001, Math.max(0, u * c.width - 0.5)),
    y = Math.min(c.height - 1.001, Math.max(0, v * c.height - 0.5)),
    ix = Math.floor(x),
    iy = Math.floor(y),
    fx = x - ix,
    fy = y - iy,
    p = (iy * c.width + ix) * 3,
    q = p + c.width * 3;
  for (let k = 0; k < 3; k++)
    out[k] =
      (c.rgb[p + k] * (1 - fx) + c.rgb[p + 3 + k] * fx) * (1 - fy) +
      (c.rgb[q + k] * (1 - fx) + c.rgb[q + 3 + k] * fx) * fy;
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
    slope = entry.slope,
    [tintR, tintG, tintB] = entry.relief.tint,
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
        turns: m.turns,
      };
    },
    tiles = entry.layers.map(pick),
    sample = (m: number, mx: number, my: number, out: number[], w: number) => {
      const t = tiles[m],
        mat = entry.layers[m];
      if (mat.tiling === "tiled") {
        const tx = ((Math.floor(mx * t.k) % t.size) + t.size) % t.size,
          ty = ((Math.floor(my * t.k) % t.size) + t.size) % t.size,
          p = (ty * t.size + tx) * 3;
        out[0] += t.rgb[p] * w;
        out[1] += t.rgb[p + 1] * w;
        out[2] += t.rgb[p + 2] * w;
        return;
      }
      hexBlend(t, mat.mean, (mx * t.k) / t.size, (my * t.k) / t.size, blended);
      if (mat.cover) {
        // Unveiled: the cover image spread over the whole map, with the
        // tile's fine detail as light and shade on top.
        coverAt(mat.cover, mx / map.width, my / map.height, covered);
        const lum = (c: number[]) => c[0] * 0.3 + c[1] * 0.59 + c[2] * 0.11,
          base = Math.max(1, lum(mat.mean)),
          f = 1 + ((lum(blended) - base) / base) * mat.detail;
        for (let k = 0; k < 3; k++) out[k] += covered[k] * f * w;
      } else for (let k = 0; k < 3; k++) out[k] += blended[k] * w;
    },
    blended = [0, 0, 0],
    covered = [0, 0, 0],
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
      if (h < sea) {
        // One water surface: shallow near every shore, deeper further out.
        const depth = Math.min(1, (sea - h) * 10);
        // A reef shows coral in the shallows, softly at its edge, and fades out in deep water.
        let reef = 0;
        if (entry.reef >= 0) {
          const grid = entry.biomeGrid,
            share =
              (grid[i] === Biome.CoralReef ? wa : 0) +
              (grid[i + 1] === Biome.CoralReef ? wb : 0) +
              (grid[i + cols] === Biome.CoralReef ? wc : 0) +
              (grid[i + cols + 1] === Biome.CoralReef ? wd : 0);
          reef = share * 0.92 * Math.max(0, 1 - depth * 1.3);
        }
        sample(entry.shallow, mx, my, colour, (1 - depth) * (1 - reef));
        sample(entry.deep, mx, my, colour, depth * (1 - reef));
        if (reef > 0) sample(entry.reef, mx, my, colour, reef);
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
      data[p] = colour[0] + shade * tintR;
      data[p + 1] = colour[1] + shade * tintG;
      data[p + 2] = colour[2] + shade * tintB;
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
    const reach = entry.relief.reach,
      bx0 = Math.max(0, dirty.x0 - 9),
      bx1 = Math.min(map.cols - 1, dirty.x1 + 9),
      by0 = Math.max(0, dirty.y0 - reach),
      by1 = Math.min(map.rows - 1, dirty.y1 + reach);
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
  detail?: TerrainDetail,
) {
  const t = ctx.getTransform(),
    scale = t.a;
  if (scale <= 1.05 || t.b || t.c || Math.abs(t.d - scale) > 1e-6) {
    ctx.drawImage(entry.texture, 0, 0, map.width, map.height);
    return;
  }
  // A view the detail was prepared for reuses those pixels; anything else
  // paints them now.
  const ready =
    detail?.done &&
    detail.entry === entry &&
    detail.heights === entry.heights &&
    detail.materials === entry.materials &&
    detail.version === textureVersion &&
    detail.key === viewKey(t, ctx.canvas)
      ? detail
      : prepareDetail(map, entry, t, ctx.canvas.width, ctx.canvas.height, Infinity);
  if (!ready) {
    ctx.drawImage(entry.texture, 0, 0, map.width, map.height);
    return;
  }
  while (!ready.done) ready.step(Infinity);
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(ready.canvas, ready.dx, ready.dy, ready.dw, ready.dh);
  ctx.restore();
}

// Canvases keep their transform in single precision, so the key is rounded.
const viewKey = (
  t: { a: number; e: number; f: number },
  canvas: { width: number; height: number },
) =>
  [t.a.toFixed(4), t.e.toFixed(1), t.f.toFixed(1), canvas.width, canvas.height].join(",");

/**
 * The visible part of the terrain painted sharper than the cached 1x bitmap,
 * built a few rows at a time so a phone stays responsive while it is made.
 */
export interface TerrainDetail {
  entry: Entry;
  heights: number[];
  materials?: number[];
  version: number;
  key: string;
  canvas: HTMLCanvasElement;
  /** Where the pixels go on the target canvas, in its device pixels. */
  dx: number;
  dy: number;
  dw: number;
  dh: number;
  done: boolean;
  /** Paints more rows for about `budget` ms; returns whether it is finished. */
  step(budget: number): boolean;
}

function prepareDetail(
  map: MapData,
  entry: Entry,
  t: { a: number; e: number; f: number },
  width: number,
  height: number,
  maxPixels: number,
  pixelScale = t.a,
): TerrainDetail | undefined {
  const scale = t.a,
    x0 = Math.max(0, -t.e / scale),
    y0 = Math.max(0, -t.f / scale),
    x1 = Math.min(map.width, (width - t.e) / scale),
    y1 = Math.min(map.height, (height - t.f) / scale);
  // The terrain may be painted coarser than the target and scaled up.
  let ps = Math.min(scale, pixelScale);
  const area = (x1 - x0) * (y1 - y0);
  if (area * ps * ps > maxPixels) ps = Math.sqrt(maxPixels / area);
  const w = Math.ceil((x1 - x0) * ps),
    h = Math.ceil((y1 - y0) * ps);
  if (w <= 0 || h <= 0 || w * h > 40_000_000) return undefined;
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const c = canvas.getContext("2d")!,
    image = c.createImageData(w, h);
  let row = 0;
  const detail: TerrainDetail = {
    entry,
    heights: entry.heights,
    materials: entry.materials,
    version: textureVersion,
    key: viewKey(t, { width, height }),
    canvas,
    dx: Math.round(x0 * scale + t.e),
    dy: Math.round(y0 * scale + t.f),
    dw: Math.round((w * scale) / ps),
    dh: Math.round((h * scale) / ps),
    done: false,
    step(budget) {
      const start = performance.now();
      let rows = 8;
      while (row < h) {
        const end = Math.min(h, row + rows),
          before = performance.now();
        paintPixels(map, entry, image.data, w, x0, y0, ps, 0, row, w, end);
        row = end;
        const spent = performance.now() - before;
        if (performance.now() - start >= budget) break;
        // Aim for strips that each take about 4 ms.
        rows = Math.max(1, Math.round((rows * 4) / Math.max(0.5, spent)));
      }
      if (row >= h) {
        c.putImageData(image, 0, 0);
        detail.done = true;
      }
      return detail.done;
    },
  };
  return detail;
}

/**
 * Starts painting the visible terrain for a view (`scale`, offset `e`/`f` in
 * device pixels) on a `width` × `height` canvas. At most `pixelScale` terrain
 * pixels are painted per map pixel; the result is scaled up to fit.
 */
export function startTerrainDetail(
  map: MapData,
  view: { a: number; e: number; f: number },
  width: number,
  height: number,
  pixelScale: number,
) {
  const entry = entryFor(map);
  updateTexture(map, entry);
  if (view.a <= 1.05) return undefined;
  return prepareDetail(map, entry, view, width, height, 6_000_000, pixelScale);
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

function paintLandscape(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  entry: Entry,
  contours: boolean,
  vector: boolean,
  region?: CellRect,
  detail?: TerrainDetail,
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
  if (vector) drawTerrainImage(ctx, map, entry, detail);
  else ctx.drawImage(entry.texture, 0, 0, map.width, map.height);
  for (const line of coastLines(map.settings.style))
    coast(
      ctx,
      map,
      map.settings.seaLevel + line.offset,
      line.colour,
      line.width,
      region,
    );
  if (contours)
    for (let h = map.settings.seaLevel + 0.07; h < 1; h += 0.055)
      coast(ctx, map, h, "#6d725d44", 0.7, region);
  if (map.kind === "world") drawDecor(ctx, map, entry.biomeGrid, area);
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
  options: {
    dirty?: CellRect;
    vector?: boolean;
    /** Terrain pixels already painted for this view by `startTerrainDetail`. */
    terrainDetail?: TerrainDetail;
  } = {},
) {
  const entry = entryFor(map);
  let { changed, region } = updateTexture(map, entry, options.dirty);
  if (options.vector) {
    // Exports draw straight into the (possibly scaled) target for crisp lines.
    paintLandscape(
      ctx,
      map,
      entry,
      contours,
      true,
      undefined,
      options.terrainDetail,
    );
    return;
  }
  const key = String(contours);
  if (entry.decorErased !== map.decorErased) {
    // The eraser only ever appends circles, so usually just their area needs
    // repainting; anything else (an undo, say) repaints the whole sheet.
    const before = entry.decorErased ?? [],
      list = map.decorErased ?? [],
      appended =
        list.length > before.length &&
        (!before.length || list[before.length - 1] === before[before.length - 1]),
      erased = appended ? decorRegion(map, list.slice(before.length)) : undefined;
    entry.decorErased = map.decorErased;
    if (!erased) region = undefined;
    else if (!changed) region = erased;
    else if (region)
      region = {
        x0: Math.min(region.x0, erased.x0),
        y0: Math.min(region.y0, erased.y0),
        x1: Math.max(region.x1, erased.x1),
        y1: Math.max(region.y1, erased.y1),
      };
    changed = true;
  }
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
    layer.cover?.length,
    layer.cover?.slice(-32),
    layer.tiling,
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
    rgb = material.levels[0],
    cover = material.tiling === "unveil" ? material.cover : undefined;
  if (cover) {
    // An unveiled layer shows its map-wide image.
    const pixel = [0, 0, 0];
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        coverAt(cover, (x + 0.5) / size, (y + 0.5) / size, pixel);
        const q = (y * size + x) * 4;
        image.data.set([pixel[0], pixel[1], pixel[2], 255], q);
      }
    ctx.putImageData(image, 0, 0);
    url = canvas.toDataURL();
    previews.set(key, url);
    return url;
  }
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
