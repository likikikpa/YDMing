import type { MapData } from "./types";
const cache = new WeakMap<number[], Int32Array>();
/** Priority-flood drainage routes enclosed basins through their lowest spill point. */
export function drainage(map: MapData) {
  const cached = cache.get(map.heights);
  if (cached) return cached;
  const size = map.cols * map.rows,
    parent = new Int32Array(size).fill(-1),
    seen = new Uint8Array(size),
    heap: { i: number; h: number }[] = [];
  const push = (node: { i: number; h: number }) => {
    let p = heap.length;
    heap.push(node);
    while (p > 0) {
      const up = (p - 1) >> 1;
      if (heap[up].h <= node.h) break;
      heap[p] = heap[up];
      p = up;
    }
    heap[p] = node;
  };
  const pop = () => {
    const result = heap[0],
      last = heap.pop()!;
    if (heap.length) {
      let p = 0;
      while (p * 2 + 1 < heap.length) {
        let child = p * 2 + 1;
        if (child + 1 < heap.length && heap[child + 1].h < heap[child].h)
          child++;
        if (last.h <= heap[child].h) break;
        heap[p] = heap[child];
        p = child;
      }
      heap[p] = last;
    }
    return result;
  };
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++) {
      const i = y * map.cols + x;
      if (
        map.heights[i] < map.settings.seaLevel ||
        x === 0 ||
        y === 0 ||
        x === map.cols - 1 ||
        y === map.rows - 1
      ) {
        seen[i] = 1;
        push({ i, h: map.heights[i] });
      }
    }
  while (heap.length) {
    const current = pop(),
      x = current.i % map.cols,
      y = Math.floor(current.i / map.cols);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        if (
          (!dx && !dy) ||
          x + dx < 0 ||
          y + dy < 0 ||
          x + dx >= map.cols ||
          y + dy >= map.rows
        )
          continue;
        const i = (y + dy) * map.cols + x + dx;
        if (seen[i]) continue;
        seen[i] = 1;
        parent[i] = current.i;
        push({ i, h: Math.max(map.heights[i], current.h + 0.00001) });
      }
  }
  cache.set(map.heights, parent);
  return parent;
}
