import type { CellRect } from "../terrain-render";
import type { MapData, Point } from "../types";
import type { Area } from "./types";

/** The box around `points`, grown by `pad` on every side. */
export function areaAround(points: Point[], pad: number): Area {
  const xs = points.map((q) => q.x),
    ys = points.map((q) => q.y),
    x = Math.floor(Math.min(...xs) - pad),
    y = Math.floor(Math.min(...ys) - pad);
  return {
    x,
    y,
    w: Math.ceil(Math.max(...xs) + pad) - x,
    h: Math.ceil(Math.max(...ys) + pad) - y,
  };
}
export const unionAreas = (a?: Area, b?: Area): Area | undefined =>
  !a || !b
    ? undefined
    : areaAround(
        [
          { x: a.x, y: a.y },
          { x: a.x + a.w, y: a.y + a.h },
          { x: b.x, y: b.y },
          { x: b.x + b.w, y: b.y + b.h },
        ],
        0,
      );

/** Map pixels a terrain edit of `dirty` cells can change, with room for coasts and symbols. */
export function dirtyArea(m: MapData, dirty: CellRect) {
  const cx = m.width / m.cols,
    cy = m.height / m.rows,
    x = Math.max(0, Math.floor((dirty.x0 - 3) * cx) - 72),
    y = Math.max(0, Math.floor((dirty.y0 - 3) * cy) - 72);
  return {
    x,
    y,
    w: Math.min(m.width, Math.ceil((dirty.x1 + 4) * cx) + 72) - x,
    h: Math.min(m.height, Math.ceil((dirty.y1 + 4) * cy) + 72) - y,
  };
}
