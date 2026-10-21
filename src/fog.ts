import type { FogData, MapData, Point, Room } from "./types";

/** The fog of one map as a flat grid: 1 where the map is hidden from players. */
export interface FogGrid {
  cell: number;
  cols: number;
  rows: number;
  hidden: Uint8Array;
}
type Size = Pick<MapData, "width" | "height">;

const MAX_CELLS = 40000;
const MIN_CELL = 8;

/** Map pixels per fog cell: 8 on a normal map, larger on a huge one so the grid stays small. */
export const fogCellSize = ({ width, height }: Size) =>
  Math.max(MIN_CELL, Math.ceil(Math.sqrt((width * height) / MAX_CELLS)));

/** A grid that is hidden everywhere, or revealed everywhere. */
export function newFogGrid(size: Size, hidden: boolean): FogGrid {
  const cell = fogCellSize(size),
    cols = Math.ceil(size.width / cell),
    rows = Math.ceil(size.height / cell);
  return {
    cell,
    cols,
    rows,
    hidden: new Uint8Array(cols * rows).fill(hidden ? 1 : 0),
  };
}

/** Run lengths of the grid, alternating hidden and revealed, hidden first. */
export function encodeFog(grid: FogGrid): FogData {
  const runs: number[] = [];
  let state = 1,
    n = 0;
  for (let i = 0; i < grid.hidden.length; i++) {
    const v = grid.hidden[i] ? 1 : 0;
    if (v === state) n++;
    else {
      runs.push(n);
      state = v;
      n = 1;
    }
  }
  runs.push(n);
  return { cell: grid.cell, cols: grid.cols, rows: grid.rows, runs };
}

// Drawing reads the same fog again and again; each saved object is decoded once.
const decoded = new WeakMap<FogData, Uint8Array>();

/** The grid of saved fog. Its `hidden` array is shared: use `copyFog` to change it. */
export function decodeFog(fog: FogData): FogGrid {
  let hidden = decoded.get(fog);
  if (!hidden) {
    hidden = new Uint8Array(fog.cols * fog.rows);
    let at = 0,
      state = 1;
    for (const run of fog.runs) {
      if (state) hidden.fill(1, at, at + run);
      at += run;
      state = state ? 0 : 1;
    }
    decoded.set(fog, hidden);
  }
  return { cell: fog.cell, cols: fog.cols, rows: fog.rows, hidden };
}

/** Whether the fog's grid covers exactly the map, so a resized map never uses stale fog. */
export const fogFits = (fog: FogData, size: Size) =>
  fog.cols === Math.ceil(size.width / fog.cell) &&
  fog.rows === Math.ceil(size.height / fog.cell);

/** The map's fog, or nothing when no part of the map is hidden. */
export const fogOf = (map: MapData): FogGrid | undefined =>
  map.fog && fogFits(map.fog, map) ? decodeFog(map.fog) : undefined;

/** A private copy that can be painted on; with no fog yet, one revealed everywhere. */
export function copyFog(map: MapData): FogGrid {
  const grid = fogOf(map);
  return grid
    ? { ...grid, hidden: grid.hidden.slice() }
    : newFogGrid(map, false);
}

/** Whether saved fog is well formed for this map; anything else is rejected on load. */
export function validFog(fog: unknown, size: Size): fog is FogData {
  const f = fog as FogData | null;
  if (
    !f ||
    typeof f !== "object" ||
    !Number.isInteger(f.cell) ||
    f.cell < 1 ||
    f.cell > 4096 ||
    !Number.isInteger(f.cols) ||
    !Number.isInteger(f.rows) ||
    f.cols < 1 ||
    f.rows < 1 ||
    f.cols * f.rows > 250000 ||
    !fogFits(f, size) ||
    !Array.isArray(f.runs) ||
    f.runs.length > f.cols * f.rows + 1
  )
    return false;
  let total = 0;
  for (const run of f.runs) {
    if (!Number.isInteger(run) || run < 0) return false;
    total += run;
  }
  return total === f.cols * f.rows;
}

/** Hides or reveals the cells under a round brush. Returns whether any cell changed. */
export function paintDisc(
  grid: FogGrid,
  at: Point,
  radius: number,
  hide: boolean,
): boolean {
  const { cell, cols, rows } = grid,
    v = hide ? 1 : 0,
    x0 = Math.max(0, Math.floor((at.x - radius) / cell)),
    x1 = Math.min(cols - 1, Math.floor((at.x + radius) / cell)),
    y0 = Math.max(0, Math.floor((at.y - radius) / cell)),
    y1 = Math.min(rows - 1, Math.floor((at.y + radius) / cell)),
    ownX = Math.floor(at.x / cell),
    ownY = Math.floor(at.y / cell);
  let changed = false;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const dx = (x + 0.5) * cell - at.x,
        dy = (y + 0.5) * cell - at.y;
      // The cell under the pointer always counts, so a tiny brush still marks.
      if (dx * dx + dy * dy > radius * radius && !(x === ownX && y === ownY))
        continue;
      const i = y * cols + x;
      if (grid.hidden[i] !== v) {
        grid.hidden[i] = v;
        changed = true;
      }
    }
  return changed;
}

/** Paints a round brush along a line, close enough together that no gap is left. */
export function paintLine(
  grid: FogGrid,
  from: Point,
  to: Point,
  radius: number,
  hide: boolean,
): boolean {
  const step = Math.max(1, Math.min(radius, grid.cell) / 2),
    n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / step));
  let changed = false;
  for (let k = 0; k <= n; k++)
    if (
      paintDisc(
        grid,
        {
          x: from.x + ((to.x - from.x) * k) / n,
          y: from.y + ((to.y - from.y) * k) / n,
        },
        radius,
        hide,
      )
    )
      changed = true;
  return changed;
}

type Box = { x: number; y: number; w: number; h: number };

/** The grid cells a box touches, as cell numbers. */
function cellsOf(grid: FogGrid, box: Box) {
  return {
    x0: Math.max(0, Math.floor(box.x / grid.cell)),
    x1: Math.min(grid.cols - 1, Math.floor((box.x + box.w) / grid.cell)),
    y0: Math.max(0, Math.floor(box.y / grid.cell)),
    y1: Math.min(grid.rows - 1, Math.floor((box.y + box.h) / grid.cell)),
  };
}

/** Whether any cell the box touches is still hidden. */
export function anyHidden(grid: FogGrid, box: Box): boolean {
  const { x0, x1, y0, y1 } = cellsOf(grid, box);
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++)
      if (grid.hidden[y * grid.cols + x]) return true;
  return false;
}

/** Hides or reveals every cell the box touches. */
export function paintBox(grid: FogGrid, box: Box, hide: boolean): boolean {
  const { x0, x1, y0, y1 } = cellsOf(grid, box),
    v = hide ? 1 : 0;
  let changed = false;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const i = y * grid.cols + x;
      if (grid.hidden[i] !== v) {
        grid.hidden[i] = v;
        changed = true;
      }
    }
  return changed;
}

/** A room's floor with a margin for its walls, in map pixels. */
export const roomBox = (room: Room, margin: number): Box => ({
  x: room.x - margin,
  y: room.y - margin,
  w: room.w + margin * 2,
  h: room.h + margin * 2,
});

/** The room under a point, the topmost one when rooms overlap. */
export function roomAt(map: MapData, at: Point, margin: number) {
  for (let i = map.rooms.length - 1; i >= 0; i--) {
    const b = roomBox(map.rooms[i], margin);
    if (at.x >= b.x && at.x <= b.x + b.w && at.y >= b.y && at.y <= b.y + b.h)
      return map.rooms[i];
  }
  return undefined;
}

/**
 * The fog of `from` for the same sheet after it moved by (ox, oy) and changed
 * size. Added area is unexplored, so it starts hidden.
 */
export function shiftFog(
  from: MapData,
  to: Size,
  ox: number,
  oy: number,
): FogData | undefined {
  const old = fogOf(from);
  if (!old) return undefined;
  const { cell } = old,
    cols = Math.ceil(to.width / cell),
    rows = Math.ceil(to.height / cell),
    hidden = new Uint8Array(cols * rows).fill(1);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      // The old cell under the middle of this one.
      const px = (x + 0.5) * cell - ox,
        py = (y + 0.5) * cell - oy,
        fromX = Math.floor(px / cell),
        fromY = Math.floor(py / cell);
      if (px >= 0 && py >= 0 && fromX < old.cols && fromY < old.rows)
        hidden[y * cols + x] = old.hidden[fromY * old.cols + fromX];
    }
  return encodeFog({ cell, cols, rows, hidden });
}

/** Map pixels a change around these points can reach, with room for the soft edge. */
export const fogReach = (grid: FogGrid, radius: number) =>
  radius + grid.cell * 3;
