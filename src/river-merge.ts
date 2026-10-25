import type { MapPath, Point } from "./types";

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
