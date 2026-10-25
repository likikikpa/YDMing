import { Biome } from "./biomes";
import { distanceTo } from "./biome-placement";
import { biomeAt } from "./generator";
import { featureName } from "./names-features";
import type { Feature } from "./names-features";
import type { Culture } from "./names";
import type { MapData, MapObject } from "./types";

/** A named kingdom: where its capital stands and the culture that names it. */
export interface Seat {
  x: number;
  y: number;
  culture: Culture;
}

const MOUNTAIN_BIOMES: ReadonlySet<number> = new Set([
  Biome.Rock,
  Biome.Snow,
  Biome.Glacier,
  Biome.Volcanic,
]);
const FOREST_BIOMES: ReadonlySet<number> = new Set([
  Biome.Forest,
  Biome.Taiga,
  Biome.Jungle,
  Biome.AutumnWoods,
]);

/** An axis-aligned box on the map, in map pixels. */
interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}
/** How wide a name is drawn at a font size, about. */
const textWidth = (text: string, size: number) => text.length * size * 0.6;
/** The box around a label of this size and tilt, centred on a point. */
function boxOf(
  x: number,
  y: number,
  w: number,
  h: number,
  degrees: number,
): Box {
  const a = Math.abs((degrees * Math.PI) / 180),
    bw = w * Math.cos(a) + h * Math.sin(a),
    bh = w * Math.sin(a) + h * Math.cos(a);
  return {
    x0: x - bw / 2,
    y0: y - bh / 2 - h * 0.2,
    x1: x + bw / 2,
    y1: y + bh / 2,
  };
}
const overlaps = (a: Box, b: Box) =>
  a.x0 < b.x1 + 4 && a.x1 > b.x0 - 4 && a.y0 < b.y1 + 2 && a.y1 > b.y0 - 2;

/** A stretch of land or water, as a set of cells. */
interface Region {
  cells: number[];
  feature: Feature;
}

/** Connected groups of cells for which `is` holds, found by flood fill over the four neighbours. */
function groups(map: MapData, is: (i: number) => boolean) {
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
function largest(
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
function direction(map: MapData, cells: number[], cx: number, cy: number) {
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

/**
 * Names for the biggest mountain ranges, forests and seas of a world, in the
 * speech of the nearest kingdom, as labels placed on the feature: on the
 * land cell nearest a range's or forest's middle, and on the deepest water of
 * a sea. Names already in `taken` are not used again.
 */
export function featureLabels(
  map: MapData,
  seats: Seat[],
  r: () => number,
  taken: Set<string>,
  idPrefix = "region-feature",
): MapObject[] {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel,
    biome = new Uint8Array(cols * rows);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (heights[i] >= sea) biome[i] = biomeAt(map, x, y);
    }
  const land = (i: number) => heights[i] >= sea,
    high = (i: number) =>
      land(i) && (MOUNTAIN_BIOMES.has(biome[i]) || heights[i] > 0.72),
    wooded = (i: number) => land(i) && FOREST_BIOMES.has(biome[i]),
    water = (i: number) => !land(i),
    depth = distanceTo(map, land);
  const regions = [
    ...largest(groups(map, high), 30, 3, "mountains"),
    ...largest(groups(map, wooded), 110, 3, "forest"),
    ...largest(groups(map, water), 700, 2, "sea"),
  ];
  const out: MapObject[] = [],
    cellX = map.width / cols,
    cellY = map.height / rows;
  // What is already on the map that a name must keep clear of: the other
  // labels, and each settlement with the name under it.
  const taken_: Box[] = [];
  for (const o of map.objects)
    if (o.kind === "label")
      taken_.push(
        boxOf(o.x, o.y, textWidth(o.name, o.height), o.height, o.rotation),
      );
    else if (o.id.startsWith("settlement-"))
      taken_.push(
        boxOf(
          o.x,
          o.y + 6,
          Math.max(50, textWidth(o.name, 10)),
          o.height + 24,
          0,
        ),
      );
  regions.forEach((region, n) => {
    const { cells, feature } = region;
    let sx = 0,
      sy = 0;
    for (const c of cells) {
      sx += c % cols;
      sy += Math.floor(c / cols);
    }
    const cx = sx / cells.length,
      cy = sy / cells.length,
      at = (c: number) => ({
        x: ((c % cols) + 0.5) * cellX,
        y: (Math.floor(c / cols) + 0.5) * cellY,
      });
    // The nearest realm names it, in its own speech.
    const first = at(cells[0]);
    let culture: Culture = "human",
      near = Infinity;
    for (const seat of seats) {
      const d = Math.hypot(seat.x - first.x, seat.y - first.y);
      if (d < near) {
        near = d;
        culture = seat.culture;
      }
    }
    let name = featureName(r, culture, feature);
    for (let i = 0; i < 30 && taken.has(name.toLowerCase()); i++)
      name = featureName(r, culture, feature);
    const height = feature === "sea" ? 17 : 13,
      text = feature === "sea" ? name.toUpperCase() : name,
      width = Math.max(110, textWidth(text, height)),
      rotation = feature === "sea" ? 0 : direction(map, cells, cx, cy);
    // Deep water, but near the middle of the sea: the deepest point is often a far corner.
    const score = (c: number) =>
      Math.min(depth[c], 10) * 10 -
      Math.hypot((c % cols) - cx, Math.floor(c / cols) - cy);
    // Candidate spots: a land feature from its middle outward, a sea from
    // its deepest water; the first one inside the map and clear of other names wins.
    // Each cell's place in the order is worked out once, not in every comparison.
    const key = cells.map((c) =>
        feature === "sea"
          ? -score(c)
          : Math.hypot((c % cols) - cx, Math.floor(c / cols) - cy),
      ),
      ordered = cells
        .map((_, i) => i)
        .sort((a, b) => key[a] - key[b])
        .map((i) => cells[i]);
    let spot: { x: number; y: number } | undefined;
    for (const c of ordered.slice(0, 600)) {
      const p = at(c),
        box = boxOf(p.x, p.y, width, height, rotation);
      if (
        box.x0 < 24 ||
        box.y0 < 24 ||
        box.x1 > map.width - 24 ||
        box.y1 > map.height - 24
      )
        continue;
      if (taken_.some((t) => overlaps(t, box))) continue;
      spot = p;
      taken_.push(box);
      break;
    }
    if (!spot) return;
    taken.add(name.toLowerCase());
    out.push({
      id: `${idPrefix}-${n}`,
      kind: "label",
      x: spot.x,
      y: spot.y,
      name: text,
      width,
      height,
      rotation,
      layer: "Labels",
      color:
        feature === "sea"
          ? "#2d5871"
          : feature === "forest"
            ? "#476237"
            : "#6a5846",
    });
  });
  return out;
}
