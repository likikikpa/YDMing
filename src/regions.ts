import { hash, noise } from "./random";
import { smoothLine } from "./rivers";
import type { MapData, MapObject, MapPath, Point } from "./types";

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
function findRoute(map: MapData, from: number, to: number): number[] | null {
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
        push([
          total + Math.hypot(tx - nx, ty - ny) * 0.9,
          next,
        ]);
      }
    }
  }
  return null;
}

const cellOf = (map: MapData, p: Point) =>
  Math.min(map.rows - 1, Math.max(0, Math.round((p.y / map.height) * map.rows))) *
    map.cols +
  Math.min(map.cols - 1, Math.max(0, Math.round((p.x / map.width) * map.cols)));

/**
 * Roads link cities in a tree (nearest first) and hang every smaller place off
 * the closest city, following passable ground instead of cutting across seas.
 */
export function buildRoutes(
  map: MapData,
  settlements: MapObject[],
  idPrefix = "route",
): MapPath[] {
  const cities = settlements.filter((o) => o.kind === "city"),
    others = settlements.filter((o) => o.kind !== "city"),
    links: [MapObject, MapObject][] = [];
  const connected = cities.slice(0, 1);
  const rest = cities.slice(1);
  while (rest.length) {
    let best: [number, number] = [0, 0],
      distance = Infinity;
    rest.forEach((a, i) =>
      connected.forEach((b, j) => {
        const d = Math.hypot(a.x - b.x, a.y - b.y);
        if (d < distance) {
          distance = d;
          best = [i, j];
        }
      }),
    );
    links.push([rest[best[0]], connected[best[1]]]);
    connected.push(...rest.splice(best[0], 1));
  }
  for (const place of others) {
    const nearest = [...cities]
      .sort(
        (a, b) =>
          Math.hypot(a.x - place.x, a.y - place.y) -
          Math.hypot(b.x - place.x, b.y - place.y),
      )
      .slice(0, 2);
    // A place on another landmass may not reach the closest city; try the next.
    for (const city of nearest)
      if (Math.hypot(city.x - place.x, city.y - place.y) < 420) {
        links.push([place, city]);
        break;
      }
  }
  const paths: MapPath[] = [];
  for (const [a, b] of links) {
    const route = findRoute(map, cellOf(map, a), cellOf(map, b));
    if (!route || route.length < 3) continue;
    const points: Point[] = route.map((c) => ({
      x: ((c % map.cols) * map.width) / map.cols,
      y: (Math.floor(c / map.cols) * map.height) / map.rows,
    }));
    points[0] = { x: a.x, y: a.y };
    points[points.length - 1] = { x: b.x, y: b.y };
    paths.push({
      id: `${idPrefix}-${paths.length + 1}`,
      kind: "road",
      points: smoothLine(points, 2, 2, 1),
      width: a.kind === "city" ? 1.1 : 0.9,
      layer: "Objects",
    });
  }
  return paths;
}

/**
 * Kingdom borders: every land cell goes to the nearest capital (measured with
 * a little noise so frontiers wander), and the boundaries between realms are
 * traced into continuous, smoothed lines.
 */
export function buildBorders(
  map: MapData,
  capitals: MapObject[],
  seed: string,
): MapPath[] {
  const { cols, rows, heights } = map,
    sea = map.settings.seaLevel + 0.03,
    noiseSeed = hash(seed + "border"),
    owner = new Int16Array(cols * rows).fill(-1);
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      if (heights[y * cols + x] <= sea) continue;
      const wx = (x * map.width) / cols + (noise(x / 14, y / 14, noiseSeed) - 0.5) * 70,
        wy = (y * map.height) / rows + (noise(x / 14 + 40, y / 14, noiseSeed) - 0.5) * 70;
      let best = 0,
        distance = Infinity;
      capitals.forEach((o, n) => {
        const d = (o.x - wx) ** 2 + (o.y - wy) ** 2;
        if (d < distance) {
          distance = d;
          best = n;
        }
      });
      owner[y * cols + x] = best;
    }
  // A boundary edge sits between two neighbouring cells; vertices are the
  // corners where four cells meet, numbered row by row.
  const width = cols + 1,
    edges: [number, number][] = [],
    around = new Map<number, number[]>();
  const add = (a: number, b: number) => {
    const id = edges.push([a, b]) - 1;
    for (const v of [a, b]) (around.get(v) ?? around.set(v, []).get(v)!).push(id);
  };
  for (let y = 0; y < rows - 1; y++)
    for (let x = 0; x < cols - 1; x++) {
      const here = owner[y * cols + x];
      if (here < 0) continue;
      const right = owner[y * cols + x + 1],
        below = owner[(y + 1) * cols + x];
      if (right >= 0 && right !== here) add(y * width + x + 1, (y + 1) * width + x + 1);
      if (below >= 0 && below !== here) add((y + 1) * width + x, (y + 1) * width + x + 1);
    }
  const used = new Uint8Array(edges.length),
    toPoint = (v: number): Point => ({
      x: ((v % width) - 0.5) * (map.width / cols),
      y: (Math.floor(v / width) - 0.5) * (map.height / rows),
    });
  const follow = (start: number, first: number) => {
    const chain = [start];
    let vertex = start,
      edge = first;
    for (;;) {
      used[edge] = 1;
      vertex = edges[edge][0] === vertex ? edges[edge][1] : edges[edge][0];
      chain.push(vertex);
      const open = (around.get(vertex) ?? []).filter((e) => !used[e]);
      if (around.get(vertex)!.length !== 2 || !open.length) break;
      edge = open[0];
    }
    return chain;
  };
  const chains: number[][] = [];
  // Open lines first (they begin at a junction or a coast), then closed loops.
  for (const [vertex, list] of around)
    if (list.length !== 2)
      for (const e of list) if (!used[e]) chains.push(follow(vertex, e));
  edges.forEach((e, i) => {
    if (!used[i]) chains.push(follow(e[0], i));
  });
  const paths: MapPath[] = [];
  for (const chain of chains) {
    if (chain.length < 5) continue;
    paths.push({
      id: `border-${paths.length}`,
      kind: "border",
      points: smoothLine(chain.map(toPoint), 3, 2, 2),
      width: 0.9,
      layer: "Objects",
    });
  }
  return paths;
}
