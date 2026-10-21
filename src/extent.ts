import type { MapObject } from "./types";

/**
 * The smallest and largest of `values`. `Math.min(...values)` throws a
 * RangeError from about 120,000 values, which a map full of copied stamps
 * reaches; this has no such limit.
 */
export function extent(values: Iterable<number>) {
  let min = Infinity,
    max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  return { min, max };
}

/** The box around the objects, as the selection frame draws it (rotation ignored). */
export function objectBounds(objects: MapObject[]) {
  let left = Infinity,
    top = Infinity,
    right = -Infinity,
    bottom = -Infinity;
  for (const o of objects) {
    const l = o.x - o.width / 2,
      t = o.y - o.height / 2,
      r = o.x + o.width / 2,
      b = o.y + o.height / 2;
    if (l < left) left = l;
    if (t < top) top = t;
    if (r > right) right = r;
    if (b > bottom) bottom = b;
  }
  return { left, top, right, bottom };
}
