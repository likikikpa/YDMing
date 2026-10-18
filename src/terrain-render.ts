import { biomeAt } from "./generator";
import { clamp, hash, noise, random } from "./random";
import { drawStamp } from "./stamps";
import type { MapData } from "./types";

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
];

/** Open-water colour of a map style, so rivers can match the sea exactly. */
export function seaColor(style: string) {
  const [r, g, b] = (style === "parchment" ? parchment : style === "painted" ? painted : atlas)[12];
  return `rgb(${r}, ${g}, ${b})`;
}

// One texel covers a third of a terrain cell, so coastlines and biome edges
// stay soft without storing a full-resolution height field.
const SUPER = 3;

interface Entry {
  heights: number[];
  biomes: number[];
  signature: string;
  texture: HTMLCanvasElement;
  image: ImageData;
  biomeGrid: Uint8Array;
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
  ].join("|");
}

function entryFor(map: MapData) {
  const sig = signature(map);
  let entry = entries.get(map.id);
  if (!entry || entry.signature !== sig) {
    const texture = document.createElement("canvas");
    texture.width = map.cols * SUPER;
    texture.height = map.rows * SUPER;
    const base = document.createElement("canvas");
    base.width = map.width;
    base.height = map.height;
    entry = {
      heights: [],
      biomes: [],
      signature: sig,
      texture,
      image: texture
        .getContext("2d")!
        .createImageData(texture.width, texture.height),
      biomeGrid: new Uint8Array(map.cols * map.rows),
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

function paintTexels(
  map: MapData,
  entry: Entry,
  cx0: number,
  cy0: number,
  cx1: number,
  cy1: number,
) {
  const { cols, rows, heights } = map,
    palette =
      map.settings.style === "parchment"
        ? parchment
        : map.settings.style === "painted"
          ? painted
          : atlas,
    seed = hash(map.settings.seed),
    data = entry.image.data,
    width = entry.texture.width,
    biomeGrid = entry.biomeGrid,
    waterDepth = map.settings.style === "parchment" ? 3 : 10,
    px0 = Math.max(0, cx0 * SUPER),
    py0 = Math.max(0, cy0 * SUPER),
    px1 = Math.min(width, (cx1 + 1) * SUPER),
    py1 = Math.min(entry.texture.height, (cy1 + 1) * SUPER);
  for (let py = py0; py < py1; py++) {
    const y = Math.min(rows - 2, py / SUPER),
      iy = Math.floor(y),
      fy = y - iy;
    for (let px = px0; px < px1; px++) {
      const x = Math.min(cols - 2, px / SUPER),
        ix = Math.floor(x),
        fx = x - ix,
        i = iy * cols + ix,
        water = heights[i] < map.settings.seaLevel,
        a = palette[biomeGrid[i]] || palette[5],
        b = palette[biomeGrid[i + 1]] || palette[5],
        c = palette[biomeGrid[i + cols]] || palette[5],
        d = palette[biomeGrid[i + cols + 1]] || palette[5],
        slope =
          (heights[Math.max(0, i - cols - 1)] -
            heights[Math.min(heights.length - 1, i + cols + 1)]) *
          65,
        shade = water
          ? noise(px / 8, py / 8, seed) * 3 - 1
          : slope + noise(px, py, seed) * 7 - 3,
        depth = water
          ? clamp((map.settings.seaLevel - heights[i]) * 10) * waterDepth
          : 0,
        p = (py * width + px) * 4;
      for (let k = 0; k < 3; k++) {
        const color =
          (a[k] * (1 - fx) + b[k] * fx) * (1 - fy) +
          (c[k] * (1 - fx) + d[k] * fx) * fy;
        data[p + k] = clamp(color + shade - depth, 0, 255);
      }
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
    entry.heights !== map.heights || entry.biomes !== map.biomes;
  const full = !dirty && (identityChanged || entry.heights.length === 0);
  let changed = full,
    region: CellRect | undefined;
  if (full || (dirty && entry.heights.length === 0)) {
    for (let y = 0; y < map.rows; y++)
      for (let x = 0; x < map.cols; x++)
        entry.biomeGrid[y * map.cols + x] = biomeAt(map, x, y);
    paintTexels(map, entry, 0, 0, map.cols - 1, map.rows - 1);
    entry.texture
      .getContext("2d")!
      .putImageData(entry.image, 0, 0);
    changed = true;
  } else if (dirty) {
    // Biome rules look eight cells upwind, so a height edit can recolour a
    // horizontal margin around the brush.
    const bx0 = Math.max(0, dirty.x0 - 9),
      bx1 = Math.min(map.cols - 1, dirty.x1 + 9),
      by0 = Math.max(0, dirty.y0 - 1),
      by1 = Math.min(map.rows - 1, dirty.y1 + 1);
    for (let y = by0; y <= by1; y++)
      for (let x = bx0; x <= bx1; x++)
        entry.biomeGrid[y * map.cols + x] = biomeAt(map, x, y);
    const x0 = Math.max(0, bx0 - 1),
      y0 = Math.max(0, by0 - 1),
      x1 = Math.min(map.cols - 1, bx1 + 1),
      y1 = Math.min(map.rows - 1, by1 + 1);
    paintTexels(map, entry, x0, y0, x1, y1);
    entry.texture
      .getContext("2d")!
      .putImageData(
        entry.image,
        0,
        0,
        x0 * SUPER,
        y0 * SUPER,
        (x1 - x0 + 1) * SUPER,
        (y1 - y0 + 1) * SUPER,
      );
    changed = true;
    region = { x0, y0, x1, y1 };
  }
  entry.heights = map.heights;
  entry.biomes = map.biomes;
  return { changed, region };
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
const decorSpots = new Map<string, DecorSpot[]>();
function decorFor(seed: string) {
  let spots = decorSpots.get(seed);
  if (!spots) {
    const r = random(seed + "decor");
    spots = Array.from({ length: 3000 }, (_, n) => ({
      x: 30 + r() * 1140,
      y: 30 + r() * 790,
      mw: 15 + r() * 19,
      mh: 19 + r() * 23,
      tw: 5 + r() * 4,
      th: 7 + r() * 5,
      n,
    }));
    // Painter's algorithm: nearer (lower) symbols overlap the ones behind.
    spots.sort((a, b) => a.y - b.y);
    if (decorSpots.size >= 6)
      decorSpots.delete(decorSpots.keys().next().value!);
    decorSpots.set(seed, spots);
  }
  return spots;
}

const sprites = new Map<string, HTMLCanvasElement>();
function sprite(
  kind: "mountain" | "pine" | "tree",
  w: number,
  h: number,
  color: string,
) {
  // Sizes are bucketed so a few dozen small bitmaps serve thousands of symbols.
  const qw = kind === "mountain" ? Math.round(w / 2) * 2 : Math.round(w),
    qh = kind === "mountain" ? Math.round(h / 3) * 3 : Math.round(h),
    key = `${kind}:${qw}:${qh}:${color}`;
  let canvas = sprites.get(key);
  if (!canvas) {
    canvas = document.createElement("canvas");
    canvas.width = Math.ceil(qw * 1.4) + 6;
    canvas.height = Math.ceil(qh * 1.5) + 6;
    const c = canvas.getContext("2d")!;
    c.translate(canvas.width / 2, canvas.height / 2);
    drawStamp(c, kind, qw, qh, color);
    sprites.set(key, canvas);
  }
  return canvas;
}

function drawDecor(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  entry: Entry | undefined,
  vector: boolean,
  area?: Rect,
) {
  const { cols, rows, heights, width, height } = map;
  for (const spot of decorFor(map.settings.seed)) {
    // Symbols reach up to ~40 px beyond their centre.
    if (
      area &&
      (spot.x < area.x - 40 ||
        spot.x > area.x + area.w + 40 ||
        spot.y < area.y - 40 ||
        spot.y > area.y + area.h + 40)
    )
      continue;
    const cx = Math.floor((spot.x / width) * cols),
      cy = Math.floor((spot.y / height) * rows),
      i = cy * cols + cx,
      h = heights[i],
      b = entry ? entry.biomeGrid[i] : biomeAt(map, cx, cy);
    let kind: "mountain" | "pine" | "tree" | null = null;
    if (h > 0.71 && spot.n % 3 === 0) kind = "mountain";
    else if ((b === 6 || b === 4 || b === 10) && spot.n % 2 === 0)
      kind = b === 4 ? "pine" : "tree";
    if (!kind) continue;
    const w = kind === "mountain" ? spot.mw : spot.tw,
      hh = kind === "mountain" ? spot.mh : spot.th,
      color = kind === "mountain" ? "#717258" : "#64704f";
    if (kind !== "mountain") ctx.globalAlpha = 0.7;
    if (vector) {
      ctx.save();
      ctx.translate(spot.x, spot.y);
      drawStamp(ctx, kind, w, hh, color);
      ctx.restore();
    } else {
      const s = sprite(kind, w, hh, color);
      ctx.drawImage(
        s,
        spot.x - s.width / 2,
        spot.y - s.height / 2,
        s.width,
        s.height,
      );
    }
    if (kind !== "mountain") ctx.globalAlpha = 1;
  }
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
  ctx.drawImage(entry.texture, 0, 0, map.width, map.height);
  coast(ctx, map, map.settings.seaLevel, "#657c69", 1.1, region);
  coast(ctx, map, map.settings.seaLevel - 0.015, "#93aaa1", 0.65, region);
  coast(ctx, map, map.settings.seaLevel - 0.035, "#aabbb0", 0.6, region);
  if (contours)
    for (let h = map.settings.seaLevel + 0.07; h < 1; h += 0.055)
      coast(ctx, map, h, "#6d725d44", 0.7, region);
  if (map.kind === "world") drawDecor(ctx, map, entry, vector, area);
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
    paintLandscape(base, map, entry, contours, false, partial ? region : undefined);
    entry.baseKey = key;
  }
  ctx.drawImage(entry.base, 0, 0, map.width, map.height);
}
