import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { buildRoutes } from "./regions";
import { defaultSettings } from "./types";
import type { MapData, MapObject } from "./types";

const world = (seed: string) =>
  generateMap("world", {
    ...defaultSettings,
    seed,
    template: "pangaea",
    cities: 6,
    towns: 8,
    villages: 14,
    dungeons: 4,
  });
const roads = (map: MapData) =>
  map.paths.filter((p) => p.kind === "road" && p.id.startsWith("route-"));
const settlements = (map: MapData) =>
  map.objects.filter((o) => o.id.startsWith("settlement-"));
const touches = (map: MapData, o: { x: number; y: number }) =>
  roads(map).some((r) =>
    [r.points[0], r.points[r.points.length - 1]].some(
      (p) => Math.hypot(p.x - o.x, p.y - o.y) < 6,
    ),
  );

describe("roads of a generated world", () => {
  it("reach nearly every settlement", () => {
    let total = 0,
      reached = 0;
    for (const seed of ["rd1", "rd2", "rd3", "rd4"]) {
      const map = world(seed);
      for (const o of settlements(map)) {
        total++;
        if (touches(map, o)) reached++;
      }
    }
    expect(total).toBeGreaterThan(80);
    expect(reached / total).toBeGreaterThan(0.85);
  });

  it("join the cities in loops, not only a tree", () => {
    let loops = 0;
    for (const seed of ["rd1", "rd2", "rd3", "rd4"]) {
      const map = world(seed),
        cities = settlements(map).filter((o) => o.kind === "city"),
        between = roads(map).filter((r) => {
          const ends = [r.points[0], r.points[r.points.length - 1]];
          return ends.every((p) =>
            cities.some((c) => Math.hypot(c.x - p.x, c.y - p.y) < 6),
          );
        });
      if (between.length >= cities.length) loops++;
    }
    expect(loops).toBeGreaterThanOrEqual(2);
  });

  it("run over land", () => {
    const map = world("rd2"),
      sea = map.settings.seaLevel;
    for (const r of roads(map))
      for (const p of r.points.slice(1, -1)) {
        const x = Math.min(
            map.cols - 1,
            Math.floor((p.x / map.width) * map.cols),
          ),
          y = Math.min(map.rows - 1, Math.floor((p.y / map.height) * map.rows));
        expect(map.heights[y * map.cols + x]).toBeGreaterThan(sea - 0.04);
      }
  });

  it("start from a village's nearest neighbour on the roads, so none is a long walk", () => {
    const map = world("rd3"),
      all = settlements(map);
    for (const r of roads(map)) {
      const a = r.points[0],
        b = r.points[r.points.length - 1],
        len = Math.hypot(a.x - b.x, a.y - b.y);
      expect(len).toBeLessThan(430);
    }
    expect(all.length).toBeGreaterThan(20);
  });
});

describe("roads on a map with a strait", () => {
  // Two islands of 10 px cells: the left one from x = 20 to 200, the right
  // one from x = 240 to 590, with sea between and around them.
  const cols = 60,
    rows = 20,
    heights = new Float32Array(cols * rows).fill(0.2);
  for (let y = 2; y < rows - 2; y++)
    for (let x = 2; x < cols - 1; x++)
      if (x <= 20 || x >= 24) heights[y * cols + x] = 0.6;
  const map = {
    cols,
    rows,
    width: cols * 10,
    height: rows * 10,
    heights,
    settings: { seaLevel: 0.4 },
  } as unknown as MapData;
  const place = (id: string, kind: MapObject["kind"], x: number) =>
    ({ id, kind, name: id, x, y: 100, width: 20, height: 20 }) as MapObject;

  it("join a village to its own island, not to a nearer city across the sea", () => {
    // The village is 100 px from the left city, across the strait, and
    // 334 px from its own island's city: it reaches that one by the next village.
    const west = place("west", "city", 150),
      east = place("east", "city", 584),
      village = place("village", "village", 250),
      next = place("next", "village", 420);
    const roads = buildRoutes(map, [west, east, village, next]),
      ends = roads.map((r) => [r.points[0], r.points[r.points.length - 1]]);
    const joined = (a: MapObject, b: MapObject) =>
      ends.some(
        (e) =>
          e.some((p) => p.x === a.x && p.y === a.y) &&
          e.some((p) => p.x === b.x && p.y === b.y),
      );
    expect(joined(village, next)).toBe(true);
    expect(joined(next, east)).toBe(true);
    expect(joined(village, west)).toBe(false);
  });

  it("give the villages of an island with no city roads of their own", () => {
    const west = place("west", "city", 150),
      a = place("a", "village", 300),
      b = place("b", "village", 450);
    const roads = buildRoutes(map, [west, a, b]);
    expect(roads).toHaveLength(1);
    expect(roads[0].points[0]).toMatchObject({ x: 450 });
  });
});
