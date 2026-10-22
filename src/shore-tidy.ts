import { DEEPEST_COAST_LINE } from "./style-coast";
import type { MapData } from "./types";

/**
 * Land smaller than this many cells is too small to hold a symbol or read as an
 * island: drawn as a few dark ticks in the sea, it looks like a speck of dirt.
 */
export const MIN_LAND = 6;

/** A bank with no land on it, up to this many cells, is not worth an outline. */
export const MAX_BANK = 64;

/**
 * The 8-connected groups of cells that pass `inside`, each as a list of cell
 * indices. Loops and an explicit stack, so a map of any size is safe.
 */
function groups(
  cols: number,
  rows: number,
  inside: (i: number) => boolean,
): number[][] {
  const seen = new Uint8Array(cols * rows),
    out: number[][] = [];
  for (let start = 0; start < seen.length; start++) {
    if (seen[start] || !inside(start)) continue;
    const cells: number[] = [],
      stack = [start];
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!,
        x = i % cols,
        y = (i - x) / cols;
      cells.push(i);
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx,
            ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
          const j = ny * cols + nx;
          if (seen[j] || !inside(j)) continue;
          seen[j] = 1;
          stack.push(j);
        }
    }
    out.push(cells);
  }
  return out;
}

/**
 * Takes the specks out of a generated coast. The noise that shapes the land
 * leaves single cells just above the sea far from any island, and low humps
 * just under it. Each one gets its own shore line and rings of shallows, so
 * the open sea fills with outlines around nothing.
 *
 * Land under MIN_LAND cells is sunk just below the surface, and a bank with
 * no land on it, up to MAX_BANK cells, is sunk below the deepest ring any
 * style draws. Islands, the shoals around them, and banks big enough to read as
 * reefs are left as they are. Run it again and nothing changes.
 */
export function tidyShore(map: MapData) {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel,
    floor = Math.max(0, sea - DEEPEST_COAST_LINE - 0.004);
  for (const cells of groups(cols, rows, (i) => heights[i] >= sea))
    if (cells.length < MIN_LAND)
      for (const i of cells) heights[i] = Math.min(heights[i], sea - 0.02);
  for (const cells of groups(
    cols,
    rows,
    (i) => heights[i] >= sea - DEEPEST_COAST_LINE,
  ))
    if (cells.length <= MAX_BANK && !cells.some((i) => heights[i] >= sea))
      for (const i of cells) heights[i] = Math.min(heights[i], floor);
}
