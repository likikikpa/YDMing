import type { MapPath, Point } from "./types";

/** The paths a stamp should not sit on: kingdom borders are lines on a map, not ground. */
const BLOCKING: ReadonlySet<MapPath["kind"]> = new Set([
  "river",
  "road",
  "wall",
  "corridor",
]);

/** Grid cell side, in map pixels: a few stamps wide, so a lookup tests only nearby segments. */
const CELL = 48;

interface Segment {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  /** How close a point may come: half the path's width there, plus the margin. */
  reach: number;
}

const key = (cx: number, cy: number) => cx * 4096 + cy;

/** The squared distance from a point to a segment. */
function distance2(s: Segment, x: number, y: number) {
  const dx = s.bx - s.ax,
    dy = s.by - s.ay,
    len2 = dx * dx + dy * dy,
    t = len2
      ? Math.max(0, Math.min(1, ((x - s.ax) * dx + (y - s.ay) * dy) / len2))
      : 0,
    px = s.ax + t * dx - x,
    py = s.ay + t * dy - y;
  return px * px + py * py;
}

/**
 * Tells whether a point lies on a river, road, wall or corridor, or within
 * `margin` of one. The segments are filed in a grid once, so asking about a
 * point costs the few segments near it, however many paths the map has.
 * Returns undefined when there is nothing to keep clear of.
 */
export function pathBlocker(
  paths: readonly MapPath[],
  margin: number,
): ((at: Point) => boolean) | undefined {
  const grid = new Map<number, Segment[]>();
  let any = false;
  for (const path of paths) {
    if (!BLOCKING.has(path.kind)) continue;
    const { points } = path;
    for (let i = 0; i + 1 < points.length; i++) {
      const a = points[i],
        b = points[i + 1],
        width = Math.max(
          path.widths?.[i] ?? path.width,
          path.widths?.[i + 1] ?? path.width,
        ),
        s: Segment = {
          ax: a.x,
          ay: a.y,
          bx: b.x,
          by: b.y,
          reach: width / 2 + margin,
        };
      const x0 = Math.floor((Math.min(a.x, b.x) - s.reach) / CELL),
        x1 = Math.floor((Math.max(a.x, b.x) + s.reach) / CELL),
        y0 = Math.floor((Math.min(a.y, b.y) - s.reach) / CELL),
        y1 = Math.floor((Math.max(a.y, b.y) + s.reach) / CELL);
      for (let cx = x0; cx <= x1; cx++)
        for (let cy = y0; cy <= y1; cy++) {
          const k = key(cx, cy),
            list = grid.get(k);
          if (list) list.push(s);
          else grid.set(k, [s]);
        }
      any = true;
    }
  }
  if (!any) return undefined;
  return ({ x, y }) => {
    const list = grid.get(key(Math.floor(x / CELL), Math.floor(y / CELL)));
    if (!list) return false;
    for (const s of list)
      if (distance2(s, x, y) <= s.reach * s.reach) return true;
    return false;
  };
}
