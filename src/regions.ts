import { hash, noise } from "./random";
import { findRoute, landmasses, reachable } from "./route-search";
import { smoothLine } from "./rivers";
import type { MapData, MapObject, MapPath, Point } from "./types";

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
    links: [MapObject, MapObject][] = [],
    land = landmasses(map),
    // Whether a road can join two places: a link across the sea gives none.
    joins = (a: MapObject, b: MapObject) =>
      reachable(map, land, cellOf(map, a), cellOf(map, b));
  const connected = cities.slice(0, 1);
  const rest = cities.slice(1);
  while (rest.length) {
    let best: [number, number] = [0, 0],
      distance = Infinity;
    rest.forEach((a, i) =>
      connected.forEach((b, j) => {
        // A city across the sea is only linked when no other is left.
        const d = Math.hypot(a.x - b.x, a.y - b.y) + (joins(a, b) ? 0 : 1e6);
        if (d < distance) {
          distance = d;
          best = [i, j];
        }
      }),
    );
    links.push([rest[best[0]], connected[best[1]]]);
    connected.push(...rest.splice(best[0], 1));
  }
  // Extra links give the cities loops to travel by, not only a tree of roads.
  const dist = (a: MapObject, b: MapObject) => Math.hypot(a.x - b.x, a.y - b.y),
    linkedAlready = (a: MapObject, b: MapObject) =>
      links.some(([p, q]) => (p === a && q === b) || (p === b && q === a));
  for (const a of cities) {
    const next = cities
      .filter(
        (b) =>
          b !== a && !linkedAlready(a, b) && dist(a, b) < 380 && joins(a, b),
      )
      .sort((p, q) => dist(a, p) - dist(a, q))[0];
    if (next) links.push([a, next]);
  }
  // Villages and towns join the nearest place already on the roads, so the
  // network grows outward from the cities and a hamlet is not a day's march
  // from the nearest road. Lairs and ruins are linked but never become hubs.
  // Only a hub a road can reach counts: one across the sea is passed over.
  const hubs: MapObject[] = [...cities],
    pending = others.filter((o) => o.kind !== "dungeon"),
    dungeons = others.filter((o) => o.kind === "dungeon");
  while (pending.length) {
    let pick = -1,
      hub: MapObject | undefined,
      distance = Infinity;
    pending.forEach((place, i) => {
      const near = nearestJoined(place, hubs, 330);
      if (near && dist(place, near) < distance) {
        pick = i;
        hub = near;
        distance = dist(place, near);
      }
    });
    // Nothing left can reach the roads (an island with no city, or a place
    // far from the rest): the first left, a town before a village, starts a
    // network of its own.
    if (!hub) {
      hubs.push(pending.shift()!);
      continue;
    }
    links.push([pending[pick], hub]);
    hubs.push(...pending.splice(pick, 1));
  }
  for (const place of dungeons) {
    const hub = nearestJoined(place, hubs, 420);
    if (hub) links.push([place, hub]);
  }
  function nearestJoined(place: MapObject, from: MapObject[], reach: number) {
    let best: MapObject | undefined,
      distance = reach;
    for (const hub of from) {
      const d = dist(place, hub);
      if (d < distance && joins(place, hub)) {
        best = hub;
        distance = d;
      }
    }
    return best;
  }
  const paths: MapPath[] = [];
  for (const [a, b] of links) {
    const from = cellOf(map, a),
      to = cellOf(map, b),
      route = reachable(map, land, from, to)
        ? findRoute(map, from, to)
        : null;
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
