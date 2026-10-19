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

/** How close (in map pixels) a clicked point must be to a river to join it. */
export const RIVER_JOIN_DISTANCE = 12;

/** The nearest point on any of `rivers` to `p`, or null when none is within `reach`. */
export function snapToRiver(
  p: Point,
  rivers: MapPath[],
  reach = RIVER_JOIN_DISTANCE,
): Point | null {
  let best: { d: number; at: Point } | null = null;
  for (const river of rivers) {
    const q = river.points;
    for (let k = 1; k < q.length; k++) {
      const dx = q[k].x - q[k - 1].x,
        dy = q[k].y - q[k - 1].y,
        t = Math.max(
          0,
          Math.min(
            1,
            ((p.x - q[k - 1].x) * dx + (p.y - q[k - 1].y) * dy) /
              (dx * dx + dy * dy || 1),
          ),
        ),
        at = { x: q[k - 1].x + dx * t, y: q[k - 1].y + dy * t },
        d = Math.hypot(p.x - at.x, p.y - at.y);
      if (d <= reach && (!best || d < best.d)) best = { d, at };
    }
  }
  return best?.at ?? null;
}

/**
 * Centripetal Catmull–Rom spline through `points`: a smooth curve that bends
 * at every point and passes exactly through it, without loops or overshoot.
 * Samples are about `step` apart.
 */
export function curveThrough(points: Point[], step: number): Point[] {
  if (points.length < 3) {
    const [a, b] = points;
    if (!b) return [...points];
    const count = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    return Array.from({ length: count + 1 }, (_, i) => ({
      x: a.x + ((b.x - a.x) * i) / count,
      y: a.y + ((b.y - a.y) * i) / count,
    }));
  }
  const first = points[0],
    last = points[points.length - 1],
    p = [
      { x: 2 * first.x - points[1].x, y: 2 * first.y - points[1].y },
      ...points,
      {
        x: 2 * last.x - points[points.length - 2].x,
        y: 2 * last.y - points[points.length - 2].y,
      },
    ],
    out: Point[] = [first],
    knot = (a: Point, b: Point) => Math.max(1e-3, Math.hypot(b.x - a.x, b.y - a.y) ** 0.5),
    mix = (a: Point, b: Point, wa: number, wb: number): Point => ({
      x: a.x * wa + b.x * wb,
      y: a.y * wa + b.y * wb,
    });
  for (let i = 1; i < p.length - 2; i++) {
    const [p0, p1, p2, p3] = [p[i - 1], p[i], p[i + 1], p[i + 2]],
      t1 = knot(p0, p1),
      t2 = t1 + knot(p1, p2),
      t3 = t2 + knot(p2, p3),
      count = Math.max(2, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / step));
    for (let k = 1; k <= count; k++) {
      const t = t1 + ((t2 - t1) * k) / count,
        a1 = mix(p0, p1, (t1 - t) / t1, t / t1),
        a2 = mix(p1, p2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1)),
        a3 = mix(p2, p3, (t3 - t) / (t3 - t2), (t - t2) / (t3 - t2)),
        b1 = mix(a1, a2, (t2 - t) / t2, t / t2),
        b2 = mix(a2, a3, (t3 - t) / (t3 - t1), (t - t1) / (t3 - t1));
      out.push(mix(b1, b2, (t2 - t) / (t2 - t1), (t - t1) / (t2 - t1)));
    }
  }
  return out;
}

/**
 * A river drawn by hand through the points the person placed, in order. It
 * curves smoothly at each point and is not random. The first and last point
 * join a neighbouring river when they lie within a small gap of it; all other
 * points are used exactly as given. Returns null when there is nothing to draw.
 */
export function riverThrough(
  placed: Point[],
  others: MapPath[],
  id: string,
): MapPath | null {
  // A double-click would otherwise leave two points on top of each other.
  const points = placed.filter(
    (p, i) => i === 0 || Math.hypot(p.x - placed[i - 1].x, p.y - placed[i - 1].y) >= 2,
  );
  if (points.length < 2) return null;
  points[0] = snapToRiver(points[0], others) ?? points[0];
  points[points.length - 1] =
    snapToRiver(points[points.length - 1], others) ?? points[points.length - 1];
  const line = curveThrough(points, 6);
  let length = 0;
  const along = line.map((p, i) => {
    if (i) length += Math.hypot(p.x - line[i - 1].x, p.y - line[i - 1].y);
    return length;
  });
  if (length < 4) return null;
  // Thin at the source, wider towards the mouth.
  const widths = along.map((d) => 1 + 1.4 * (d / length));
  return {
    id,
    kind: "river",
    points: line,
    widths,
    width: Math.max(...widths),
    layer: "Water",
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
