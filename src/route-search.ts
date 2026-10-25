import type { MapData } from "./types";

const STEPS = [
  [-1, -1, 1.414],
  [0, -1, 1],
  [1, -1, 1.414],
  [-1, 0, 1],
  [1, 0, 1],
  [-1, 1, 1.414],
  [0, 1, 1],
  [1, 1, 1.414],
];

/** The height below which a route cannot pass. */
const routeSea = (map: MapData) => map.settings.seaLevel + 0.012;

/**
 * Numbers each landmass a route can cross (1 and up; 0 is water and the map's
 * edge), so a search between two of them can be skipped: it would visit every
 * cell of the first before giving up.
 */
export function landmasses(map: MapData) {
  const { cols, rows, heights } = map,
    sea = routeSea(map),
    label = new Int32Array(cols * rows),
    stack: number[] = [];
  let next = 0;
  for (let y = 1; y < rows - 1; y++)
    for (let x = 1; x < cols - 1; x++) {
      const start = y * cols + x;
      if (label[start] || heights[start] < sea) continue;
      label[start] = ++next;
      stack.push(start);
      while (stack.length) {
        const cell = stack.pop()!,
          cx = cell % cols,
          cy = Math.floor(cell / cols);
        for (const [dx, dy] of STEPS) {
          const nx = cx + dx,
            ny = cy + dy;
          if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1) continue;
          const n = ny * cols + nx;
          if (label[n] || heights[n] < sea) continue;
          label[n] = next;
          stack.push(n);
        }
      }
    }
  return label;
}

/** Whether a route can get from one cell to another: its first step from `from` must land on `to`'s landmass. */
export function reachable(
  map: MapData,
  land: Int32Array,
  from: number,
  to: number,
) {
  if (from === to) return true;
  if (!land[to]) return false;
  const x = from % map.cols,
    y = Math.floor(from / map.cols);
  for (const [dx, dy] of STEPS) {
    const nx = x + dx,
      ny = y + dy;
    if (nx < 0 || ny < 0 || nx >= map.cols || ny >= map.rows) continue;
    if (land[ny * map.cols + nx] === land[to]) return true;
  }
  return false;
}

/** Cheapest walkable route between two cells: water is impassable, steep ground is costly. */
export function findRoute(
  map: MapData,
  from: number,
  to: number,
): number[] | null {
  const { cols, rows, heights } = map,
    sea = routeSea(map),
    cost = new Float32Array(cols * rows).fill(Infinity),
    before = new Int32Array(cols * rows).fill(-1),
    tx = to % cols,
    ty = Math.floor(to / cols),
    heap: [number, number, number][] = [];
  const push = (item: [number, number, number]) => {
    let i = heap.length;
    heap.push(item);
    while (i > 0) {
      const up = (i - 1) >> 1;
      if (heap[up][0] <= item[0]) break;
      heap[i] = heap[up];
      i = up;
    }
    heap[i] = item;
  };
  const pop = () => {
    const top = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let i = 0;
      for (;;) {
        let c = i * 2 + 1;
        if (c >= heap.length) break;
        if (c + 1 < heap.length && heap[c + 1][0] < heap[c][0]) c++;
        if (last[0] <= heap[c][0]) break;
        heap[i] = heap[c];
        i = c;
      }
      heap[i] = last;
    }
    return top;
  };
  cost[from] = 0;
  push([0, from, 0]);
  while (heap.length) {
    const [, cell, reached] = pop();
    // A cell already reached more cheaply has nothing new to offer.
    if (reached > cost[cell]) continue;
    if (cell === to) {
      const path = [cell];
      for (let c = cell; before[c] >= 0; c = before[c]) path.push(before[c]);
      return path.reverse();
    }
    const x = cell % cols,
      y = Math.floor(cell / cols);
    for (const [dx, dy, length] of STEPS) {
      const nx = x + dx,
        ny = y + dy;
      if (nx < 1 || ny < 1 || nx >= cols - 1 || ny >= rows - 1) continue;
      const next = ny * cols + nx,
        h = heights[next];
      if (h < sea) continue;
      // Roads avoid mountains and steep slopes, and hug the lowlands.
      const climb = Math.abs(h - heights[cell]) * 80,
        high = Math.max(0, h - 0.62) * 60,
        total = cost[cell] + length * (1 + climb + high);
      if (total < cost[next]) {
        cost[next] = total;
        before[next] = cell;
        push([total + Math.hypot(tx - nx, ty - ny) * 0.9, next, cost[next]]);
      }
    }
  }
  return null;
}
