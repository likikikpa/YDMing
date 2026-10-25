import type { MapPath, Point } from "./types";

/**
 * Stops a river where it runs into another one, ending exactly on the other
 * river's line, so two rivers never lie on top of each other. Returns null when
 * nothing independent is left (it would just duplicate an existing river).
 */
export function mergeRivers(river: MapPath, others: MapPath[]): MapPath | null {
  const pts = river.points,
    widths = river.widths;
  // Each other river's bounds, so a point far from one skips all its segments.
  const near = others
    .filter((other) => other !== river)
    .map((other) => ({ q: other.points, box: bounds(other.points) }));
  for (let i = 0; i < pts.length; i++) {
    const reach = Math.max(2.2, (widths?.[i] ?? river.width) * 0.9),
      { x, y } = pts[i];
    let best: { d: number; at: Point } | null = null;
    for (const { q, box } of near) {
      if (
        x < box.x0 - reach ||
        x > box.x1 + reach ||
        y < box.y0 - reach ||
        y > box.y1 + reach
      )
        continue;
      for (let k = 1; k < q.length; k++) {
        // A segment whose box is out of reach is too far to join.
        const a = q[k - 1],
          b = q[k];
        if (
          (x < a.x - reach && x < b.x - reach) ||
          (x > a.x + reach && x > b.x + reach) ||
          (y < a.y - reach && y < b.y - reach) ||
          (y > a.y + reach && y > b.y + reach)
        )
          continue;
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

function bounds(points: Point[]) {
  let x0 = Infinity,
    y0 = Infinity,
    x1 = -Infinity,
    y1 = -Infinity;
  for (const p of points) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  return { x0, y0, x1, y1 };
}
