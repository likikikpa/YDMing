import { hitObject } from "./hit-test";
import type { MapData, MapPath, Point } from "./types";

/** Path kinds the eraser removes whole when it touches any part of them. */
export const ERASABLE_PATHS: MapPath["kind"][] = ["river", "road", "wall"];

/** Shortest distance from `p` to a polyline. */
export function distanceToPath(points: Point[], p: Point) {
  let best = Infinity;
  for (let i = 0; i < points.length; i++) {
    const a = points[i],
      b = points[Math.min(points.length - 1, i + 1)],
      dx = b.x - a.x,
      dy = b.y - a.y,
      length = dx * dx + dy * dy,
      t = length
        ? Math.max(
            0,
            Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length),
          )
        : 0;
    best = Math.min(best, Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y));
  }
  return best;
}

/**
 * Clears the generated mountains and forests under the eraser on a world map.
 * They are drawn from the map's seed rather than stored, so the erased area is
 * remembered instead. A step that barely moves from the last circle is skipped.
 */
export function eraseDecor(m: MapData, p: Point, radius: number) {
  if (m.kind !== "world") return false;
  const x = p.x - (m.origin?.x ?? 0),
    y = p.y - (m.origin?.y ?? 0),
    last = m.decorErased?.[m.decorErased.length - 1];
  if (
    last &&
    last.r === radius &&
    Math.hypot(last.x - x, last.y - y) < radius * 0.4
  )
    return false;
  m.decorErased = [...(m.decorErased ?? []), { x, y, r: radius }];
  return true;
}

/**
 * Removes stamps and labels under an eraser of `radius` at `p`, every river,
 * road or wall it touches, whole, and the generated mountains and forests there. Only layers that `editable` allows
 * are touched; a settlement linked to its own map is kept so its map is not
 * orphaned. Returns whether anything was removed.
 */
export function eraseAt(
  m: MapData,
  p: Point,
  radius: number,
  editable: (layer: string) => boolean,
) {
  const objects = m.objects.filter(
      (o) => o.linkedMap || !editable(o.layer) || !hitObject(o, p, radius),
    ),
    paths = m.paths.filter(
      (path) =>
        !ERASABLE_PATHS.includes(path.kind) ||
        !editable(path.layer) ||
        distanceToPath(path.points, p) >
          radius + Math.max(path.width, ...(path.widths ?? [])) / 2,
    );
  const decor = editable("Terrain") && eraseDecor(m, p, radius);
  if (objects.length === m.objects.length && paths.length === m.paths.length)
    return decor;
  m.objects = objects;
  m.paths = paths;
  return true;
}
