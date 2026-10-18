import { clamp, hash, noise } from "./random";
import { editableTerrain } from "./terrain";
import type { CellRect } from "./terrain-render";
import type { MapData, Point, Tool } from "./types";

export const SCULPT_TOOLS: Tool[] = [
  "raise",
  "dig",
  "smooth",
  "flatten",
  "roughen",
  "biome",
];
/** Height change per second at full strength, in height units (0–1 range). */
export const SCULPT_SPEED = 0.5;

export interface SculptBrush {
  /** Brush diameter in map pixels. */
  size: number;
  /** 5–100. */
  strength: number;
  biome: number;
}

export const unionRects = (
  a: CellRect | undefined,
  b: CellRect | undefined,
): CellRect | undefined =>
  !a
    ? b
    : !b
      ? a
      : {
          x0: Math.min(a.x0, b.x0),
          y0: Math.min(a.y0, b.y0),
          x1: Math.max(a.x1, b.x1),
          y1: Math.max(a.y1, b.y1),
        };

/** Smooth bump: 1 at the centre, 0 at the rim, with no hard edge. */
export const falloff = (d: number) => {
  const t = 1 - d;
  return t * t * (3 - 2 * t);
};

/**
 * Applies one soft round dab of a sculpt tool. `amount` is the height change
 * at the centre of the brush; the effect fades smoothly towards the rim.
 * Returns the cells that were touched, or null when nothing changed.
 */
export function sculptDab(
  m: MapData,
  tool: Tool,
  p: Point,
  amount: number,
  flat: number,
  brush: SculptBrush,
): CellRect | null {
  const terrain = editableTerrain(m),
    cx = (p.x / m.width) * m.cols,
    cy = (p.y / m.height) * m.rows,
    // Coarse dungeon grids still get a brush at least a cell and a half wide.
    rx = Math.max(1.5, ((brush.size / m.width) * m.cols) / 2),
    ry = Math.max(1.5, ((brush.size / m.height) * m.rows) / 2),
    x0 = Math.max(1, Math.floor(cx - rx)),
    x1 = Math.min(m.cols - 2, Math.ceil(cx + rx)),
    y0 = Math.max(1, Math.floor(cy - ry)),
    y1 = Math.min(m.rows - 2, Math.ceil(cy + ry));
  if (x1 < x0 || y1 < y0) return null;
  const heights = terrain.heights,
    seed = hash(m.settings.seed),
    bw = x1 - x0 + 3;
  let before: Float32Array | null = null;
  if (tool === "smooth") {
    // Smoothing averages the surface as it was before this dab.
    before = new Float32Array(bw * (y1 - y0 + 3));
    for (let y = y0 - 1; y <= y1 + 1; y++)
      for (let x = x0 - 1; x <= x1 + 1; x++)
        before[(y - y0 + 1) * bw + (x - x0 + 1)] = heights[y * m.cols + x];
  }
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const d = Math.hypot((x - cx) / rx, (y - cy) / ry);
      if (d >= 1) continue;
      const w = falloff(d),
        i = y * m.cols + x;
      if (tool === "raise") heights[i] = clamp(heights[i] + amount * w);
      else if (tool === "dig") heights[i] = clamp(heights[i] - amount * w);
      else if (tool === "flatten")
        heights[i] += (flat - heights[i]) * Math.min(1, amount * 14 * w);
      else if (tool === "roughen")
        heights[i] = clamp(
          heights[i] + (noise(x * 0.5, y * 0.5, seed) - 0.5) * amount * 3 * w,
        );
      else if (tool === "smooth" && before) {
        const k = (y - y0 + 1) * bw + (x - x0 + 1),
          avg =
            (before[k] * 2 +
              before[k - 1] +
              before[k + 1] +
              before[k - bw] +
              before[k + bw]) /
            6;
        heights[i] += (avg - heights[i]) * Math.min(1, amount * 16 * w);
      } else if (tool === "biome" && w > 0.2) terrain.biomes[i] = brush.biome;
    }
  return { x0: x0 - 1, y0: y0 - 1, x1: x1 + 1, y1: y1 + 1 };
}

/** Height change a single frame of `dt` seconds applies at the brush centre. */
export const sculptAmount = (strength: number, dt: number, pressure = 1) =>
  SCULPT_SPEED * (strength / 100) * dt * pressure;

/** Ramer–Douglas–Peucker: keeps the shape of a freehand line with far fewer points. */
export function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  const a = points[0],
    b = points[points.length - 1],
    dx = b.x - a.x,
    dy = b.y - a.y,
    length = Math.hypot(dx, dy);
  let far = 0,
    index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i],
      distance = length
        ? Math.abs(dy * p.x - dx * p.y + b.x * a.y - b.y * a.x) / length
        : Math.hypot(p.x - a.x, p.y - a.y);
    if (distance > far) {
      far = distance;
      index = i;
    }
  }
  if (far <= epsilon) return [a, b];
  return [
    ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
    ...simplify(points.slice(index), epsilon),
  ];
}

/** Points spaced `step` apart along a polyline. */
export function resample(points: Point[], step: number): Point[] {
  const out: Point[] = [points[0]];
  let carry = 0;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1],
      b = points[i],
      length = Math.hypot(b.x - a.x, b.y - a.y);
    for (let at = step - carry; at <= length; at += step)
      out.push({
        x: a.x + ((b.x - a.x) * at) / length,
        y: a.y + ((b.y - a.y) * at) / length,
      });
    carry = (carry + length) % step;
  }
  return out;
}

/** Raises a mountain range along a freehand line. */
export function raiseRange(
  m: MapData,
  trail: Point[],
  brush: SculptBrush,
): CellRect | undefined {
  const terrain = editableTerrain(m),
    seed = hash(m.settings.seed + "range"),
    radius = Math.max(2.5, ((brush.size / m.width) * m.cols) / 2),
    peak = 0.12 + (brush.strength / 100) * 0.4,
    points = resample(trail, 3);
  let dirty: CellRect | undefined;
  points.forEach((point, n) => {
    const previous = points[Math.max(0, n - 1)],
      next = points[Math.min(points.length - 1, n + 1)],
      length = Math.hypot(next.x - previous.x, next.y - previous.y) || 1,
      // The crest wanders sideways so ranges do not look ruler-straight.
      wander = (noise(n * 0.12, 3, seed) - 0.5) * radius * 4.5,
      cx = (point.x - ((next.y - previous.y) / length) * wander) / (m.width / m.cols),
      cy = (point.y + ((next.x - previous.x) / length) * wander) / (m.height / m.rows),
      local = radius * (0.75 + noise(n * 0.2, 9, seed) * 0.6),
      top = peak * (0.7 + noise(n * 0.25, 5, seed) * 0.6),
      x0 = Math.max(1, Math.floor(cx - local)),
      x1 = Math.min(m.cols - 2, Math.ceil(cx + local)),
      y0 = Math.max(1, Math.floor(cy - local)),
      y1 = Math.min(m.rows - 2, Math.ceil(cy + local));
    for (let y = y0; y <= y1; y++)
      for (let x = x0; x <= x1; x++) {
        const d = Math.hypot(x - cx, y - cy) / local;
        if (d < 1) {
          const i = y * m.cols + x;
          terrain.heights[i] = Math.max(
            terrain.heights[i],
            m.settings.seaLevel + top * Math.pow(1 - d, 1.4),
          );
        }
      }
    dirty = unionRects(dirty, { x0, y0, x1, y1 });
  });
  return dirty;
}

/** Raises an island with a naturally ragged shoreline inside the dragged box. */
export function raiseIsland(m: MapData, a: Point, z: Point): CellRect {
  const terrain = editableTerrain(m),
    seed = hash(m.settings.seed + "island" + Math.round(a.x + a.y)),
    cx = ((a.x + z.x) / 2 / m.width) * m.cols,
    cy = ((a.y + z.y) / 2 / m.height) * m.rows,
    rx = Math.max(1.5, (Math.abs(z.x - a.x) / 2 / m.width) * m.cols),
    ry = Math.max(1.5, (Math.abs(z.y - a.y) / 2 / m.height) * m.rows),
    x0 = Math.max(0, Math.floor(cx - rx * 1.3)),
    x1 = Math.min(m.cols - 1, Math.ceil(cx + rx * 1.3)),
    y0 = Math.max(0, Math.floor(cy - ry * 1.3)),
    y1 = Math.min(m.rows - 1, Math.ceil(cy + ry * 1.3));
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const ragged = 1 + (noise(x * 0.35, y * 0.35, seed) - 0.5) * 0.7,
        d = Math.hypot((x - cx) / rx, (y - cy) / ry) * ragged;
      if (d < 1) {
        const i = y * m.cols + x;
        terrain.heights[i] = Math.max(
          terrain.heights[i],
          m.settings.seaLevel + 0.03 + 0.3 * Math.pow(1 - d, 0.9),
        );
      }
    }
  return { x0, y0, x1, y1 };
}
