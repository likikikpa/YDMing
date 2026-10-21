import type { MapPath, Point } from "./types";

/** Distance from `p` to the segment a–b. */
function segmentDistance(p: Point, a: Point, b: Point) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    length = dx * dx + dy * dy;
  const t = length
    ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length))
    : 0;
  return Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
}

/** How far `point` is from the edge of the path's line (0 or less is on it). */
export function pathDistance(path: MapPath, point: Point) {
  const pts = path.points;
  if (pts.length === 1)
    return Math.hypot(point.x - pts[0].x, point.y - pts[0].y);
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    const half = Math.max(path.widths?.[i - 1] ?? path.width, path.width) / 2;
    best = Math.min(best, segmentDistance(point, pts[i - 1], pts[i]) - half);
  }
  return best;
}

/** Whether `point` is on the path's line, within half its width plus `padding`. */
export const hitPath = (path: MapPath, point: Point, padding = 6) =>
  pathDistance(path, point) <= padding;

/**
 * The path nearest to `point` within `padding`, of those `can` allows.
 * Nearest, not topmost: generated rivers are several paths that meet, and a
 * click on the main river must not pick a short piece joining it.
 */
export function nearestPath(
  paths: MapPath[],
  point: Point,
  padding: number,
  can: (path: MapPath) => boolean,
) {
  let best: MapPath | undefined,
    distance = padding;
  for (const path of paths) {
    const d = pathDistance(path, point);
    if (d <= distance && can(path)) {
      best = path;
      distance = d;
    }
  }
  return best;
}

/** Whether every point of the path lies inside the box. */
export const pathInBox = (
  path: MapPath,
  box: { left: number; top: number; right: number; bottom: number },
) =>
  path.points.every(
    (p) =>
      p.x >= box.left &&
      p.x <= box.right &&
      p.y >= box.top &&
      p.y <= box.bottom,
  );

/** The path moved by dx, dy from where it was (`before`). */
export const movedPath = (before: MapPath, dx: number, dy: number) =>
  before.points.map((p) => ({ x: p.x + dx, y: p.y + dy }));
