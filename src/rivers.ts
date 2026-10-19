import { drainage, flowAccumulation } from "./drainage";
import type { MapData, MapPath, Point } from "./types";

const NEIGHBOURS = [
  [-1, -1],
  [0, -1],
  [1, -1],
  [-1, 0],
  [1, 0],
  [-1, 1],
  [0, 1],
  [1, 1],
];
/** Cells that drain directly into `cell`. */
function upstream(map: MapData, parent: Int32Array, cell: number) {
  const x = cell % map.cols,
    y = Math.floor(cell / map.cols),
    out: number[] = [];
  for (const [dx, dy] of NEIGHBOURS) {
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows) continue;
    const n = ny * map.cols + nx;
    if (parent[n] === cell) out.push(n);
  }
  return out;
}
// Height samples sit on grid corners (that is where coastlines are traced), so
// rivers follow the same coordinates instead of cell middles.
const centre = (map: MapData, i: number): Point => ({
  x: ((i % map.cols) * map.width) / map.cols,
  y: (Math.floor(i / map.cols) * map.height) / map.rows,
});
/** Water volume to on-screen width. Grows with the square root so big rivers stay in scale. */
export const riverWidth = (accumulation: number) =>
  Math.min(4.6, Math.max(0.9, 0.7 + 0.12 * Math.sqrt(accumulation)));

/** Moving average that leaves both ends where they are. */
function relax(points: Point[], radius: number, passes: number) {
  let current = points;
  for (let pass = 0; pass < passes; pass++) {
    const next: Point[] = [];
    for (let i = 0; i < current.length; i++) {
      const r = Math.min(radius, i, current.length - 1 - i);
      let x = 0,
        y = 0;
      for (let k = i - r; k <= i + r; k++) {
        x += current[k].x;
        y += current[k].y;
      }
      next.push({ x: x / (2 * r + 1), y: y / (2 * r + 1) });
    }
    current = next;
  }
  return current;
}
/** Corner-cutting subdivision: rounds the path while keeping its end points. */
function chaikin(points: Point[], widths: number[], rounds: number) {
  let p = points,
    w = widths;
  for (let round = 0; round < rounds && p.length > 2; round++) {
    const np: Point[] = [p[0]],
      nw: number[] = [w[0]];
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i],
        b = p[i + 1];
      np.push(
        { x: a.x * 0.75 + b.x * 0.25, y: a.y * 0.75 + b.y * 0.25 },
        { x: a.x * 0.25 + b.x * 0.75, y: a.y * 0.25 + b.y * 0.75 },
      );
      nw.push(w[i] * 0.75 + w[i + 1] * 0.25, w[i] * 0.25 + w[i + 1] * 0.75);
    }
    np.push(p[p.length - 1]);
    nw.push(w[w.length - 1]);
    p = np;
    w = nw;
  }
  return { points: p, widths: w };
}

/** Smooths a jagged grid path: averages neighbours, then rounds the corners. */
export function smoothLine(
  points: Point[],
  radius: number,
  passes: number,
  rounds: number,
): Point[] {
  if (points.length < 3) return points;
  return chaikin(relax(points, radius, passes), points.map(() => 0), rounds)
    .points;
}

/**
 * Turns a downhill cell path (source first) into a smooth, tapered river.
 * `snap` pins the final point, letting tributaries meet the exact bank of the
 * river they join.
 */
export function riverFromCells(
  map: MapData,
  cells: number[],
  options: { snap?: Point; id?: string } = {},
): MapPath & { relaxed: Point[] } {
  const acc = flowAccumulation(map),
    raw = cells.map((c) => centre(map, c));
  if (options.snap) raw[raw.length - 1] = options.snap;
  const relaxed = relax(raw, 3, 2),
    smooth = chaikin(
      relaxed,
      cells.map((c) => riverWidth(acc[c])),
      2,
    );
  return {
    id: options.id ?? "river",
    kind: "river",
    points: smooth.points,
    widths: smooth.widths,
    width: Math.max(...smooth.widths),
    layer: "Water",
    relaxed,
  };
}

/**
 * Stops a river where it runs into another one, ending exactly on the other
 * river's line, so two rivers never lie on top of each other. Returns null when
 * nothing independent is left (it would just duplicate an existing river).
 */
export function mergeRivers(river: MapPath, others: MapPath[]): MapPath | null {
  const pts = river.points,
    widths = river.widths;
  for (let i = 0; i < pts.length; i++) {
    const reach = Math.max(2.2, (widths?.[i] ?? river.width) * 0.9);
    let best: { d: number; at: Point } | null = null;
    for (const other of others) {
      if (other === river) continue;
      const q = other.points;
      for (let k = 1; k < q.length; k++) {
        const dx = q[k].x - q[k - 1].x,
          dy = q[k].y - q[k - 1].y,
          t = Math.max(
            0,
            Math.min(
              1,
              ((pts[i].x - q[k - 1].x) * dx + (pts[i].y - q[k - 1].y) * dy) /
                (dx * dx + dy * dy || 1),
            ),
          ),
          at = { x: q[k - 1].x + dx * t, y: q[k - 1].y + dy * t },
          d = Math.hypot(pts[i].x - at.x, pts[i].y - at.y);
        if (d < reach && (!best || d < best.d)) best = { d, at };
      }
    }
    if (!best) continue;
    if (i < 3) return null;
    const points = [...pts.slice(0, i), best.at];
    if (points.length < 4) return null;
    const kept = widths ? widths.slice(0, i + 1) : undefined;
    return {
      ...river,
      points,
      widths: kept,
      width: kept ? Math.max(...kept) : river.width,
    };
  }
  return river;
}

interface Branch {
  /** Cells from the source down to (and including) the confluence or mouth. */
  cells: number[];
  joinsAt?: { stem: Branch; index: number };
}

/**
 * Builds up to `count` river systems. Each begins at a coast where a big
 * catchment drains away, follows the heaviest flow upstream, and gains
 * tributaries wherever a second large stream joins. Rivers that meet merge
 * instead of running side by side.
 */
export function buildRiverNetwork(
  map: MapData,
  count: number,
  r: () => number,
  idPrefix = "river",
): MapPath[] {
  if (count <= 0) return [];
  const parent = drainage(map),
    acc = flowAccumulation(map),
    sea = map.settings.seaLevel,
    mouths: number[] = [];
  for (let i = 0; i < parent.length; i++) {
    if (map.heights[i] < sea || acc[i] < 40) continue;
    const down = parent[i];
    if (down < 0 || map.heights[down] < sea) mouths.push(i);
  }
  mouths.sort((a, b) => acc[b] - acc[a] || a - b);
  const chosen: number[] = [],
    spacing = 9;
  // Large catchments are favoured but not guaranteed, so rerolling water
  // gives a different set of rivers over the same land.
  while (chosen.length < count && mouths.length) {
    const window = Math.min(mouths.length, count * 2 + 4),
      pick = Math.floor(r() ** 1.6 * window),
      m = mouths.splice(pick, 1)[0],
      mx = m % map.cols,
      my = Math.floor(m / map.cols);
    if (
      chosen.every((c) => {
        const cx = c % map.cols,
          cy = Math.floor(c / map.cols);
        return Math.hypot(cx - mx, cy - my) >= spacing;
      })
    )
      chosen.push(m);
  }
  const SOURCE = 12 + Math.floor(r() * 10),
    out: MapPath[] = [];
  let serial = 0;
  const climb = (start: number) => {
    // Follow the largest upstream neighbour until the stream peters out.
    const cells = [start],
      side: { at: number; cell: number }[] = [];
    for (let cur = start; ; ) {
      const ups = upstream(map, parent, cur)
        .filter((u) => acc[u] >= SOURCE && map.heights[u] >= sea)
        .sort((a, b) => acc[b] - acc[a] || a - b);
      if (!ups.length) break;
      // Tributaries must carry real volume and meet the stem some distance
      // apart, otherwise flat ground produces rake-like fans of streams.
      const at = cells.length - 1;
      for (const u of ups.slice(1))
        if (
          acc[u] >= Math.max(55, acc[cur] * 0.22) &&
          side.every((t) => Math.abs(t.at - at) >= 7) &&
          r() < 0.85
        )
          side.push({ at, cell: u });
      cur = ups[0];
      cells.push(cur);
    }
    return { cells, side };
  };
  const build = (
    start: number,
    depth: number,
    snap: Point | undefined,
    name: string,
  ) => {
    const { cells, side } = climb(start);
    if (cells.length < (depth === 0 ? 5 : 4)) return;
    const river = riverFromCells(map, [...cells].reverse(), {
      snap,
      id: name,
    });
    const { relaxed, ...path } = river;
    // The mouth reaches into open water so the river visibly ends at the sea.
    const down = parent[start];
    if (depth === 0 && down >= 0) {
      const end = centre(map, down),
        last = path.points[path.points.length - 1];
      path.points.push({ x: (last.x + end.x) / 2, y: (last.y + end.y) / 2 });
      path.widths!.push(path.widths![path.widths!.length - 1] * 1.05);
    }
    out.push(path);
    if (depth >= 2) return;
    // Cells were reversed, so `at` (counted from the mouth) maps to this index.
    let used = 0;
    for (const s of side.sort((a, b) => acc[b.cell] - acc[a.cell])) {
      if (used >= (depth === 0 ? 3 : 2)) break;
      const index = relaxed.length - 1 - s.at;
      build(
        s.cell,
        depth + 1,
        relaxed[index],
        `${name}-t${++serial}`,
      );
      used++;
    }
  };
  chosen.forEach((m, n) => build(m, 0, undefined, `${idPrefix}-${n}`));
  // Parents come before their tributaries; each river is trimmed where it
  // meets one that is already placed.
  const kept: MapPath[] = [];
  for (const river of out) {
    const merged = mergeRivers(river, kept);
    if (merged) kept.push(merged);
  }
  return kept;
}
