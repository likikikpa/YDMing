import type { MapData, Point } from "./types";

/** Ground height at a map point, blended between the four nearest samples. */
export function heightAt(map: MapData, x: number, y: number) {
  const { cols, rows, heights } = map,
    gx = Math.min(cols - 1.001, Math.max(0, (x / map.width) * cols)),
    gy = Math.min(rows - 1.001, Math.max(0, (y / map.height) * rows)),
    ix = Math.floor(gx),
    iy = Math.floor(gy),
    fx = gx - ix,
    fy = gy - iy,
    i = iy * cols + ix;
  return (
    (heights[i] * (1 - fx) + heights[i + 1] * fx) * (1 - fy) +
    (heights[i + cols] * (1 - fx) + heights[i + cols + 1] * fx) * fy
  );
}

export interface RiverRun {
  points: Point[];
  widths: number[];
  /** Whether the run starts or ends where the river meets a lake or the sea. */
  shoreStart: boolean;
  shoreEnd: boolean;
}

/** How far past the shoreline the river's water reaches, in map pixels, so no seam shows. */
const OVERLAP = 0.75;

/**
 * The parts of a river that run over land. Each part stops exactly at the
 * shoreline of the lake or sea it meets, so the river's water joins the open
 * water instead of being painted over it.
 */
export function landRuns(
  map: MapData,
  points: Point[],
  widths: number[],
): RiverRun[] {
  const sea = map.settings.seaLevel,
    land = (p: Point) => heightAt(map, p.x, p.y) >= sea,
    runs: RiverRun[] = [];
  let run: RiverRun | null = null;
  /** The shoreline point between a and b, pushed OVERLAP towards the water. */
  const shore = (
    a: Point,
    b: Point,
    wa: number,
    wb: number,
    toWater: boolean,
  ) => {
    let lo = 0,
      hi = 1;
    for (let k = 0; k < 12; k++) {
      const mid = (lo + hi) / 2,
        p = { x: a.x + (b.x - a.x) * mid, y: a.y + (b.y - a.y) * mid };
      if (land(p) === toWater) lo = mid;
      else hi = mid;
    }
    const length = Math.hypot(b.x - a.x, b.y - a.y) || 1,
      t = Math.max(
        0,
        Math.min(1, (lo + hi) / 2 + (toWater ? 1 : -1) * (OVERLAP / length)),
      );
    return {
      point: { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t },
      width: wa + (wb - wa) * t,
    };
  };
  for (let i = 0; i < points.length; i++) {
    const p = points[i],
      onLand = land(p);
    if (onLand && !run) {
      run = { points: [], widths: [], shoreStart: false, shoreEnd: false };
      if (i > 0) {
        const s = shore(points[i - 1], p, widths[i - 1], widths[i], false);
        run.points.push(s.point);
        run.widths.push(s.width);
        run.shoreStart = true;
      }
    }
    if (onLand && run) {
      run.points.push(p);
      run.widths.push(widths[i]);
    } else if (!onLand && run) {
      const s = shore(points[i - 1], p, widths[i - 1], widths[i], true);
      run.points.push(s.point);
      run.widths.push(s.width);
      run.shoreEnd = true;
      if (run.points.length > 1) runs.push(run);
      run = null;
    }
  }
  if (run && run.points.length > 1) runs.push(run);
  // A river that stops just short of a lake or the sea is led the last few
  // pixels to its shore, so it opens into the water instead of ending on a beach.
  for (const r of runs) {
    if (!r.shoreEnd) reachShore(r, false);
    if (!r.shoreStart) reachShore(r, true);
  }
  return runs;

  function reachShore(r: RiverRun, atStart: boolean) {
    const end = atStart ? r.points[0] : r.points[r.points.length - 1],
      prev = atStart ? r.points[1] : r.points[r.points.length - 2],
      width = atStart ? r.widths[0] : r.widths[r.widths.length - 1],
      heading = Math.atan2(end.y - prev.y, end.x - prev.x);
    let best: Point | null = null,
      bestDistance = Infinity;
    // Straight ahead is preferred; the river may bend up to 90° to find water.
    for (let k = -4; k <= 4; k++) {
      const angle = heading + (k * Math.PI) / 8;
      for (let d = 1; d <= REACH; d++) {
        const p = {
          x: end.x + Math.cos(angle) * d,
          y: end.y + Math.sin(angle) * d,
        };
        if (!land(p)) {
          const cost = d * (1 + Math.abs(k) * 0.15);
          if (cost < bestDistance) {
            bestDistance = cost;
            best = shore(end, p, width, width, true).point;
          }
          break;
        }
      }
    }
    if (!best) return;
    if (atStart) {
      r.points.unshift(best);
      r.widths.unshift(width);
      r.shoreStart = true;
    } else {
      r.points.push(best);
      r.widths.push(width);
      r.shoreEnd = true;
    }
  }
}
/** How far a river end may be led to reach open water, in map pixels. */
const REACH = 14;

/** Moves the end of a run back along itself by `distance` map pixels. */
export function trimEnd(points: Point[], distance: number) {
  const out = points.slice();
  while (out.length > 1 && distance > 0) {
    const a = out[out.length - 2],
      b = out[out.length - 1],
      length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length > distance) {
      const t = 1 - distance / length;
      out[out.length - 1] = {
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
      };
      return out;
    }
    distance -= length;
    out.pop();
  }
  return out;
}
