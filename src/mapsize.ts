import type { MapData, Point } from "./types";

/** Map pixels per terrain cell on world and city maps. */
export const CELL = 5;
/**
 * 640 × 640 cells is 3200 × 3200 px: under the 4096 px texture limit every
 * WebGL device accepts, and about 41 MB per full-size canvas.
 */
export const MAX_CELLS = 640;
export const MIN_COLS = 120;
export const MIN_ROWS = 85;
export const SIZE_PRESETS = [
  { name: "Small", cols: 240, rows: 170 },
  { name: "Medium", cols: 400, rows: 280 },
  { name: "Large", cols: 560, rows: 400 },
] as const;

export const clampSize = (cols: number, rows: number) => ({
  cols: Math.round(Math.min(MAX_CELLS, Math.max(MIN_COLS, cols || MIN_COLS))),
  rows: Math.round(Math.min(MAX_CELLS, Math.max(MIN_ROWS, rows || MIN_ROWS))),
});

/** Where the old map sits inside the new one: 0 = left/top, 0.5 = centre, 1 = right/bottom. */
export interface Anchor {
  x: 0 | 0.5 | 1;
  y: 0 | 0.5 | 1;
}

/** Height given to new cells: open sea, a little below the sea line. */
const newSea = (map: MapData) => Math.max(0, map.settings.seaLevel - 0.12);

/**
 * Grows or shrinks a world or city map. The old map keeps its place at the
 * anchor; added cells are open sea, and everything drawn on it moves with it.
 */
export function resizeMap(
  map: MapData,
  cols: number,
  rows: number,
  anchor: Anchor,
): MapData {
  ({ cols, rows } = clampSize(cols, rows));
  const dx = Math.round((cols - map.cols) * anchor.x),
    dy = Math.round((rows - map.rows) * anchor.y),
    cell = map.width / map.cols,
    ox = dx * cell,
    oy = dy * cell,
    sea = newSea(map),
    grid = (values: number[] | undefined, fill: number) => {
      if (!values) return undefined;
      const out = new Array(cols * rows).fill(fill);
      for (let y = 0; y < map.rows; y++) {
        const ny = y + dy;
        if (ny < 0 || ny >= rows) continue;
        for (let x = 0; x < map.cols; x++) {
          const nx = x + dx;
          if (nx >= 0 && nx < cols)
            out[ny * cols + nx] = values[y * map.cols + x];
        }
      }
      return out;
    },
    move = <T extends Point>(p: T): T => ({ ...p, x: p.x + ox, y: p.y + oy });
  const next: MapData = {
    ...structuredClone(map),
    cols,
    rows,
    width: cols * cell,
    height: rows * cell,
    heights: grid(map.heights, sea)!,
    biomes: grid(map.biomes, 0)!,
    materials: grid(map.materials, 0),
    origin: { x: (map.origin?.x ?? 0) + ox, y: (map.origin?.y ?? 0) + oy },
  };
  next.objects = next.objects.map(move);
  next.paths = next.paths.map((p) => ({ ...p, points: p.points.map(move) }));
  next.strokes = next.strokes.map((s) => ({
    ...s,
    points: s.points.map(move),
  }));
  next.rooms = next.rooms.map(move);
  next.layers = next.layers.map((l) =>
    l.mask
      ? {
          ...l,
          mask: l.mask.map((s) => ({ ...s, points: s.points.map(move) })),
        }
      : l,
  );
  if (next.plan)
    next.plan = {
      ...next.plan,
      cx: next.plan.cx + ox,
      cy: next.plan.cy + oy,
      gates: next.plan.gates.map(move),
    };
  return next;
}

/** Child maps opened from `map` remember where they sit on it; this keeps them in step. */
export function shiftChildren(
  maps: MapData[],
  parentId: string,
  ox: number,
  oy: number,
) {
  for (const m of maps)
    if (m.parentId === parentId && m.parentPosition)
      m.parentPosition = {
        x: m.parentPosition.x + ox,
        y: m.parentPosition.y + oy,
      };
}
