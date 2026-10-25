import { floodFill } from "./flood";
import { drawFog } from "./fog-render";
import type { ImageTable } from "./images";
import { terrainView } from "./terrain";
import {
  drawLandscape,
  seaColor,
  shallowWaterPattern,
} from "./terrain-render";
import { landRuns, trimEnd } from "./water";
import type { CellRect, TerrainDetail } from "./terrain-render";
import { hash } from "./random";
import { ornaments } from "./ornaments";
import { drawObject } from "./object-render";
import { drawSettlementNames } from "./settlement-labels";
import { path } from "./stamps";
import type { MapData, MapObject, MapPath, Point, Stroke } from "./types";
export { drawStamp, stampSvg } from "./stamps";
export interface RenderOptions {
  /** The world's imported pictures, for stamps that refer to one by `imageId`. */
  images?: ImageTable;
  player?: boolean;
  /** Dim the parts hidden by fog of war (the GM's view); players always get them covered. */
  fog?: boolean;
  contours?: boolean;
  grid?: boolean;
  transparent?: boolean;
  ornaments?: boolean;
  /** Terrain cells edited since the last draw; lets the landscape repaint only that area. */
  dirty?: CellRect;
  /** Id of a paint stroke that is still being drawn and must not be cached yet. */
  liveStroke?: string;
  /** Draw everything as vectors into the target, for scaled exports. */
  vector?: boolean;
  /** Terrain pixels already painted for this view, so a vector draw can skip that work. */
  terrainDetail?: TerrainDetail;
  /**
   * Only this part of the map has changed: drawing is clipped to it and
   * anything wholly outside it is skipped, so a brush stroke stays cheap.
   */
  clip?: { x: number; y: number; w: number; h: number };
}
export const imageCache = new Map<string, HTMLImageElement>();
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const known = imageCache.get(src);
    if (known?.complete) {
      resolve(known);
      return;
    }
    const image = new Image();
    image.onload = () => {
      imageCache.set(src, image);
      resolve(image);
    };
    image.onerror = reject;
    image.src = src;
  });
}
function bitmap(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}
function smoothPath(
  ctx: CanvasRenderingContext2D,
  points: { x: number; y: number }[],
) {
  if (!points.length) return;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length - 1; i++) {
    const a = points[i],
      b = points[i + 1];
    ctx.quadraticCurveTo(a.x, a.y, (a.x + b.x) / 2, (a.y + b.y) / 2);
  }
  const last = points.at(-1)!;
  ctx.lineTo(last.x, last.y);
}
/**
 * Rivers are drawn in two passes, all banks first and then all water, so a
 * river's bank line never cuts across another river where they join. Only the
 * stretches over land are drawn: where a river reaches a lake or the sea it
 * stops at the shoreline, and its water uses the same shallow-water texture as
 * the shore, so the two read as one body of water.
 */
function drawRivers(
  ctx: CanvasRenderingContext2D,
  rivers: MapPath[],
  map: MapData,
) {
  const water =
      (map.kind !== "dungeon" && shallowWaterPattern(ctx, map)) ||
      seaColor(map.settings.style),
    bank = "#93aaa1",
    runs = rivers.flatMap((p) =>
      landRuns(
        map,
        p.points,
        p.widths && p.widths.length === p.points.length
          ? p.widths
          : p.points.map(() => p.width),
      ),
    );
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const [color, extra] of [
    [bank, 1.6],
    [water, 0],
  ] as const) {
    ctx.strokeStyle = color;
    for (const run of runs) {
      let pts = run.points;
      // A bank stops short of the shore, so its round end does not poke into open water.
      if (extra) {
        const cap = (Math.max(...run.widths) + extra) / 2;
        if (run.shoreEnd) pts = trimEnd(pts, cap);
        if (run.shoreStart) pts = trimEnd(pts.slice().reverse(), cap).reverse();
        if (pts.length < 2) continue;
      }
      // Rivers widen towards the mouth: runs of similar width share one stroke.
      const groups: { from: number; to: number; width: number }[] = [];
      for (let i = 1; i < pts.length; i++) {
        const w = Math.max(
            0.6,
            Math.round(
              (((run.widths[i - 1] ?? run.widths.at(-1)!) +
                (run.widths[i] ?? run.widths.at(-1)!)) /
                2) *
                3,
            ) / 3,
          ),
          last = groups.at(-1);
        if (last && last.width === w) last.to = i;
        else groups.push({ from: i - 1, to: i, width: w });
      }
      for (const group of groups) {
        smoothPath(ctx, pts.slice(group.from, group.to + 1));
        ctx.lineWidth = group.width + extra;
        ctx.stroke();
      }
    }
  }
  ctx.restore();
}
function drawPath(ctx: CanvasRenderingContext2D, p: MapPath, map: MapData) {
  if (p.kind === "corridor") return;
  ctx.save();
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  if (p.kind === "wall") {
    path(ctx, p.points);
    ctx.strokeStyle = "#594f3d";
    ctx.lineWidth = p.width + 2;
    ctx.stroke();
    ctx.strokeStyle = "#b4ac91";
    ctx.lineWidth = p.width;
    ctx.stroke();
    p.points
      .filter((_, n) => n % 2 === 0)
      .forEach((v) => {
        ctx.fillStyle = "#cfc5a7";
        ctx.strokeStyle = "#665c46";
        ctx.lineWidth = 1.3;
        ctx.beginPath();
        ctx.arc(v.x, v.y, p.width * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      });
  } else {
    if (p.kind === "road" && p.points.length > 2) smoothPath(ctx, p.points);
    else path(ctx, p.points);
    ctx.strokeStyle =
      p.kind === "border"
        ? "#8a6c4a99"
        : map.kind === "city"
          ? "#dfd1aa"
          : "#837d5d";
    ctx.lineWidth = p.width;
    ctx.setLineDash(
      p.kind === "border" ? [6, 4] : map.kind === "world" ? [3, 5] : [],
    );
    ctx.stroke();
  }
  ctx.restore();
}
function drawStroke(ctx: CanvasRenderingContext2D, s: Stroke) {
  if (!s.points.length) return;
  ctx.save();
  ctx.globalAlpha *= s.opacity;
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.lineWidth = s.size;
  ctx.lineCap = s.tool === "pencil" ? "square" : "round";
  ctx.lineJoin = "round";
  if (s.tool === "eraser") ctx.globalCompositeOperation = "destination-out";
  const a = s.points[0],
    b = s.points[s.points.length - 1];
  if (s.tool === "fill") {
    // Pixels are device pixels; scaled export targets need scaled seed points.
    const k = ctx.getTransform().a;
    const img = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const rgb = s.color.match(/[a-f0-9]{2}/gi)!.map((c) => parseInt(c, 16));
    floodFill(img.data, img.width, img.height, a.x * k, a.y * k, [
      rgb[0],
      rgb[1],
      rgb[2],
      Math.round(s.opacity * 255),
    ]);
    ctx.putImageData(img, 0, 0);
  } else if (s.tool === "rectangle") {
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
  } else if (s.tool === "ellipse") {
    ctx.beginPath();
    ctx.ellipse(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      Math.abs(b.x - a.x) / 2,
      Math.abs(b.y - a.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
    ctx.stroke();
  } else {
    if (s.hardness < 0.9 && s.tool === "brush") {
      ctx.shadowColor = s.color;
      ctx.shadowBlur = (1 - s.hardness) * s.size * 0.5;
    }
    if (s.points.length === 1) {
      ctx.beginPath();
      ctx.arc(a.x, a.y, s.size / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      if (s.tool === "pencil" || s.points.length === 2) path(ctx, s.points);
      else smoothPath(ctx, s.points);
      ctx.stroke();
    }
  }
  ctx.restore();
}

interface PaintCache {
  ids: string[];
  canvas: HTMLCanvasElement;
  /** Reused surface for the committed strokes plus the one being drawn. */
  scratch?: HTMLCanvasElement;
}
const paintCaches = new Map<string, PaintCache>();
/**
 * Committed strokes are rasterised once per layer and extended incrementally,
 * so redrawing the map never replays the whole stroke history.
 */
function layerPaint(
  map: MapData,
  layerId: string,
  strokes: Stroke[],
  liveId?: string,
  clip?: { x: number; y: number; w: number; h: number },
) {
  const live = liveId ? strokes.find((s) => s.id === liveId) : undefined,
    stable = live ? strokes.filter((s) => s !== live) : strokes,
    key = `${map.id}:${layerId}:${map.width}x${map.height}`;
  let cache = paintCaches.get(key);
  let common = 0;
  if (cache)
    while (
      common < cache.ids.length &&
      common < stable.length &&
      cache.ids[common] === stable[common].id
    )
      common++;
  if (!cache) {
    cache = { ids: [], canvas: bitmap(map.width, map.height) };
    paintCaches.set(key, cache);
    while (paintCaches.size > 24)
      paintCaches.delete(paintCaches.keys().next().value!);
  } else if (common < cache.ids.length) {
    cache.canvas.getContext("2d")!.clearRect(0, 0, map.width, map.height);
    cache.ids = [];
    common = 0;
  }
  const c = cache.canvas.getContext("2d")!;
  for (let i = common; i < stable.length; i++) {
    drawStroke(c, stable[i]);
    cache.ids.push(stable[i].id);
  }
  if (!live) return cache.canvas;
  // The stroke being drawn goes on a reused copy, so an eraser stroke still
  // cuts only this layer; with a clip just that part is copied and drawn.
  const scratch = (cache.scratch ??= bitmap(map.width, map.height)),
    sc = scratch.getContext("2d")!;
  sc.save();
  if (clip) {
    sc.beginPath();
    sc.rect(clip.x, clip.y, clip.w, clip.h);
    sc.clip();
  }
  sc.clearRect(0, 0, map.width, map.height);
  sc.drawImage(cache.canvas, 0, 0);
  drawStroke(sc, live);
  sc.restore();
  return scratch;
}
/** Draws the map, then the fog of war over it. */
export function drawMap(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  options: RenderOptions = {},
) {
  drawMapLayers(ctx, map, options);
  drawFog(ctx, map, options);
}
function drawMapLayers(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  options: RenderOptions = {},
) {
  if (map.layers.some((l) => l.mask?.length)) {
    const base = bitmap(map.width, map.height);
    const bc = base.getContext("2d")!;
    bc.fillStyle = "#e5dfc5";
    bc.fillRect(0, 0, map.width, map.height);
    for (const layer of map.layers) {
      if (!layer.visible || (options.player && layer.id === "GM-only"))
        continue;
      const part = bitmap(map.width, map.height);
      const pc = part.getContext("2d")!;
      const copy = {
        ...map,
        layers: map.layers.map((l) => ({
          ...l,
          mask: undefined,
          opacity: 1,
          blend: "source-over" as GlobalCompositeOperation,
          visible: l.id === layer.id,
        })),
      };
      drawMapLayers(pc, copy, {
        ...options,
        transparent: true,
        ornaments: false,
        vector: false,
      });
      if (layer.mask?.length) {
        const mask = bitmap(map.width, map.height);
        const mc = mask.getContext("2d")!;
        mc.fillStyle = "#ffffff";
        mc.fillRect(0, 0, mask.width, mask.height);
        for (const stroke of layer.mask)
          drawStroke(mc, {
            ...stroke,
            tool: stroke.tool === "eraser" ? "brush" : "eraser",
            color: "#ffffff",
          });
        pc.globalCompositeOperation = "destination-in";
        pc.drawImage(mask, 0, 0);
      }
      bc.save();
      bc.globalAlpha = layer.opacity;
      bc.globalCompositeOperation = layer.blend;
      bc.drawImage(part, 0, 0);
      bc.restore();
    }
    if (options.ornaments !== false) ornaments(bc, map);
    ctx.save();
    ctx.clearRect(0, 0, map.width, map.height);
    ctx.drawImage(base, 0, 0, map.width, map.height);
    ctx.restore();
    return;
  }
  ctx.save();
  const clip = options.clip;
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.w, clip.h);
    ctx.clip();
  }
  // Whether something within `reach` of these points can show inside the clip.
  const inClip = (points: Point[], reach: number) =>
    !clip ||
    points.some(
      (q) =>
        q.x > clip.x - reach &&
        q.x < clip.x + clip.w + reach &&
        q.y > clip.y - reach &&
        q.y < clip.y + clip.h + reach,
    ) ||
    // A long segment can cross the clip with both ends outside it.
    (points.length > 1 &&
      Math.min(...points.map((q) => q.x)) < clip.x + clip.w + reach &&
      Math.max(...points.map((q) => q.x)) > clip.x - reach &&
      Math.min(...points.map((q) => q.y)) < clip.y + clip.h + reach &&
      Math.max(...points.map((q) => q.y)) > clip.y - reach);
  const objectInClip = (o: MapObject) =>
    inClip([o], Math.hypot(o.width, o.height) / 2 + 80);
  ctx.clearRect(0, 0, map.width, map.height);
  if (!options.transparent) {
    ctx.fillStyle = "#e5dfc5";
    ctx.fillRect(0, 0, map.width, map.height);
  }
  const layer = (id: string) => map.layers.find((l) => l.id === id);
  const visible = (id: string) =>
    layer(id)?.visible !== false && !(options.player && id === "GM-only");
  if (visible("Terrain")) {
    ctx.save();
    ctx.globalAlpha = layer("Terrain")?.opacity ?? 1;
    ctx.globalCompositeOperation = layer("Terrain")?.blend || "source-over";
    if (map.kind === "dungeon") drawDungeon(ctx, map, options);
    else drawLandscape(ctx, map, options.contours, options);
    ctx.restore();
  }
  // A separate compositing surface ensures an eraser cannot punch through terrain.
  for (const l of map.layers) {
    if (!visible(l.id) || l.id === "Terrain" || l.id === "Grid") continue;
    ctx.save();
    ctx.globalAlpha = l.opacity;
    ctx.globalCompositeOperation = l.blend;
    const paths = map.paths.filter(
        (p) =>
          p.layer === l.id &&
          inClip(p.points, Math.max(p.width, ...(p.widths ?? [])) + 20),
      ),
      borders = paths.filter((p) => p.kind === "border");
    const rivers = paths.filter((p) => p.kind === "river");
    if (rivers.length) drawRivers(ctx, rivers, map);
    paths
      .filter((p) => p.kind !== "border" && p.kind !== "river")
      .forEach((p) => drawPath(ctx, p, map));
    if (borders.length) {
      // Kingdom borders share one style, so they are stroked in a single pass.
      ctx.save();
      ctx.strokeStyle = "#8a6c4a99";
      ctx.lineWidth = borders[0].width;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      for (const b of borders) {
        ctx.moveTo(b.points[0].x, b.points[0].y);
        for (let i = 1; i < b.points.length; i++)
          ctx.lineTo(b.points[i].x, b.points[i].y);
      }
      ctx.stroke();
      ctx.restore();
    }
    const strokes = map.strokes.filter((s) => s.layer === l.id);
    if (strokes.length) {
      if (options.vector) {
        const paint = bitmap(ctx.canvas.width, ctx.canvas.height),
          pc = paint.getContext("2d")!;
        pc.setTransform(ctx.getTransform());
        strokes.forEach((s) => drawStroke(pc, s));
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.drawImage(paint, 0, 0);
        ctx.restore();
      } else
        ctx.drawImage(
          layerPaint(map, l.id, strokes, options.liveStroke, clip),
          0,
          0,
          map.width,
          map.height,
        );
    }
    const base = ctx.getTransform();
    map.objects
      .filter((o) => o.layer === l.id)
      .forEach(
        (o, i) =>
          objectInClip(o) &&
          drawObject(ctx, o, i, options.images, map.settings.style, base),
      );
    ctx.restore();
  }
  if (map.kind === "world" && visible("Labels")) {
    ctx.save();
    ctx.globalAlpha = layer("Labels")?.opacity ?? 1;
    drawSettlementNames(ctx, map.objects, objectInClip);
    ctx.restore();
  }
  if (map.kind === "dungeon" && visible("Labels")) {
    ctx.save();
    ctx.font = "bold 13px Georgia";
    ctx.textAlign = "center";
    map.rooms.forEach((room) => {
      const x = room.x + room.w / 2,
        y = room.y + room.h / 2;
      ctx.fillStyle = "#eee5cd";
      ctx.strokeStyle = "#86795f";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x, y, 11, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = "#4f4738";
      ctx.fillText(String(room.number), x, y + 4);
    });
    ctx.restore();
  }
  if (visible("Grid") && (options.grid || map.settings.grid !== "none"))
    drawGrid(ctx, map, layer("Grid")?.opacity ?? 0.35);
  if (options.ornaments !== false) ornaments(ctx, map);
  ctx.restore();
}

let stone: HTMLCanvasElement | undefined;
function stoneTexture(map: MapData) {
  if (stone && stone.width === map.width && stone.height === map.height)
    return stone;
  stone = bitmap(map.width, map.height);
  const ctx = stone.getContext("2d")!;
  ctx.fillStyle = "#807664";
  ctx.fillRect(0, 0, map.width, map.height);
  ctx.strokeStyle = "#5d564b33";
  ctx.lineWidth = 0.6;
  ctx.beginPath();
  for (let y = 0; y < map.height; y += 12) {
    ctx.moveTo(0, y);
    ctx.lineTo(map.width, y);
    for (let x = ((y / 12) % 2) * 18; x < map.width; x += 36) {
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 12);
    }
  }
  ctx.stroke();
  return stone;
}
function paintFloors(ctx: CanvasRenderingContext2D, map: MapData) {
  const cell = map.width / map.cols,
    ch = map.height / map.rows,
    seed = hash(map.settings.seed + "stone");
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const i = y * map.cols + x;
      if (!map.heights[i]) continue;
      // Tile tone depends on position, so editing one room never repaints another.
      ctx.fillStyle =
        hash(`${seed}:${x}:${y}`) % 2 ? "#e0d6b9" : "#ddd2b3";
      ctx.fillRect(x * cell, y * ch, cell + 0.3, ch + 0.3);
      ctx.strokeStyle = "#eae0c6";
      ctx.lineWidth = 1;
      ctx.strokeRect(x * cell + 3, y * ch + 3, cell - 6, ch - 6);
    }
  ctx.strokeStyle = "#453f33";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const i = y * map.cols + x;
      if (!map.heights[i]) continue;
      const x0 = x * cell,
        y0 = y * ch;
      if (x === 0 || !map.heights[i - 1]) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0, y0 + ch);
      }
      if (x === map.cols - 1 || !map.heights[i + 1]) {
        ctx.moveTo(x0 + cell, y0);
        ctx.lineTo(x0 + cell, y0 + ch);
      }
      if (y === 0 || !map.heights[i - map.cols]) {
        ctx.moveTo(x0, y0);
        ctx.lineTo(x0 + cell, y0);
      }
      if (y === map.rows - 1 || !map.heights[i + map.cols]) {
        ctx.moveTo(x0, y0 + ch);
        ctx.lineTo(x0 + cell, y0 + ch);
      }
    }
  ctx.stroke();
}
const floorCache = new Map<
  string,
  { heights: number[]; seed: string; canvas: HTMLCanvasElement }
>();
export function drawDungeon(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  options: RenderOptions = {},
) {
  if (map.terrain)
    drawLandscape(ctx, terrainView(map), options.contours, options);
  else ctx.drawImage(stoneTexture(map), 0, 0, map.width, map.height);
  if (options.vector) {
    paintFloors(ctx, map);
    return;
  }
  let cached = floorCache.get(map.id);
  if (
    !cached ||
    cached.heights !== map.heights ||
    cached.seed !== map.settings.seed
  ) {
    const canvas = cached?.canvas ?? bitmap(map.width, map.height);
    const c = canvas.getContext("2d")!;
    c.clearRect(0, 0, map.width, map.height);
    paintFloors(c, map);
    cached = { heights: map.heights, seed: map.settings.seed, canvas };
    floorCache.delete(map.id);
    floorCache.set(map.id, cached);
    while (floorCache.size > 6)
      floorCache.delete(floorCache.keys().next().value!);
  }
  ctx.drawImage(cached.canvas, 0, 0, map.width, map.height);
}
function drawGrid(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  opacity: number,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = map.kind === "dungeon" ? "#5e5747" : "#536854";
  ctx.lineWidth = 0.6;
  const step = map.kind === "dungeon" ? map.width / map.cols : 50;
  ctx.beginPath();
  if (map.settings.grid === "hex") {
    const h = step * 0.866;
    for (let y = 0; y < map.height / h; y++)
      for (let x = 0; x < map.width / (step * 1.5); x++) {
        const cx = x * step * 1.5,
          cy = y * h * 2 + (x % 2) * h;
        for (let k = 0; k <= 6; k++) {
          const a = (k * Math.PI) / 3,
            px = cx + Math.cos(a) * step,
            py = cy + Math.sin(a) * step;
          if (k === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
      }
  } else {
    for (let x = 0; x < map.width; x += step) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, map.height);
    }
    for (
      let y = 0;
      y < map.height;
      y += map.kind === "dungeon" ? map.height / map.rows : step
    ) {
      ctx.moveTo(0, y);
      ctx.lineTo(map.width, y);
    }
  }
  ctx.stroke();
  ctx.restore();
}
