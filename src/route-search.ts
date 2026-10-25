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

/** Cheapest walkable route between two cells: water is impassable, steep ground is costly. */
export function findRoute(
  map: MapData,
  from: number,
  to: number,
): number[] | null {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel + 0.012,
    cost = new Float32Array(cols * rows).fill(Infinity),
    before = new Int32Array(cols * rows).fill(-1),
    tx = to % cols,
    ty = Math.floor(to / cols),
    heap: [number, number][] = [];
  const push = (item: [number, number]) => {
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
  push([0, from]);
  while (heap.length) {
    const [, cell] = pop();
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
        push([total + Math.hypot(tx - nx, ty - ny) * 0.9, next]);
      }
    }
  }
  return null;
}
