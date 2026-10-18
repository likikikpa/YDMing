import type { MapData } from "./types";
interface Model {
  parent: Int32Array;
  /** Cells in the order the flood reached them: every cell follows its downstream neighbour. */
  order: Int32Array;
  seaLevel: number;
  accumulation?: Float32Array;
}
const cache = new WeakMap<number[], Model>();
function model(map: MapData): Model {
  const cached = cache.get(map.heights);
  if (cached && cached.seaLevel === map.settings.seaLevel) return cached;
  const size = map.cols * map.rows,
    parent = new Int32Array(size).fill(-1),
    order = new Int32Array(size),
    visited: number[] = [],
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
    const current = pop();
    visited.push(current.i);
    const x = current.i % map.cols,
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
  order.set(visited);
  const result = { parent, order, seaLevel: map.settings.seaLevel };
  cache.set(map.heights, result);
  return result;
}
/** Downstream neighbour of every cell (-1 for outlets). */
export function drainage(map: MapData) {
  return model(map).parent;
}
/** Number of land cells whose water passes through each cell, itself included. */
export function flowAccumulation(map: MapData) {
  const m = model(map);
  if (m.accumulation) return m.accumulation;
  const acc = new Float32Array(m.parent.length);
  for (let i = 0; i < acc.length; i++)
    acc[i] = map.heights[i] >= map.settings.seaLevel ? 1 : 0;
  for (let k = m.order.length - 1; k >= 0; k--) {
    const cell = m.order[k],
      down = m.parent[cell];
    if (down >= 0) acc[down] += acc[cell];
  }
  m.accumulation = acc;
  return acc;
}
