import type { Feature } from "./names-features";
import type { MapData } from "./types";

/** A stretch of land or water, as a set of cells. */
export interface Region {
  cells: number[];
  feature: Feature;
}

/** Connected groups of cells for which `is` holds, found by flood fill over the four neighbours. */
export function groups(map: MapData, is: (i: number) => boolean) {
  const { cols, rows } = map,
    seen = new Uint8Array(cols * rows),
    out: number[][] = [];
  for (let start = 0; start < cols * rows; start++) {
    if (seen[start] || !is(start)) continue;
    const cells: number[] = [],
      stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const c = stack.pop()!,
        x = c % cols,
        y = Math.floor(c / cols);
      cells.push(c);
      for (const n of [
        x > 0 ? c - 1 : -1,
        x < cols - 1 ? c + 1 : -1,
        y > 0 ? c - cols : -1,
        y < rows - 1 ? c + cols : -1,
      ])
        if (n >= 0 && !seen[n] && is(n)) {
          seen[n] = 1;
          stack.push(n);
        }
    }
    out.push(cells);
  }
  return out;
}

/** The largest `count` regions of a feature at least `min` cells big. */
export function largest(
  list: number[][],
  min: number,
  count: number,
  feature: Feature,
) {
  return list
    .filter((c) => c.length >= min)
    .sort((a, b) => b.length - a.length)
    .slice(0, count)
    .map((cells): Region => ({ cells, feature }));
}

/** The angle, in degrees, along which a region is longest, kept gentle so a name stays readable. */
export function direction(
  map: MapData,
  cells: number[],
  cx: number,
  cy: number,
) {
  let xx = 0,
    yy = 0,
    xy = 0;
  for (const c of cells) {
    const dx = (c % map.cols) - cx,
      dy = Math.floor(c / map.cols) - cy;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }
  const angle = (Math.atan2(2 * xy, xx - yy) / 2) * (180 / Math.PI);
  return Math.max(-35, Math.min(35, angle));
}
