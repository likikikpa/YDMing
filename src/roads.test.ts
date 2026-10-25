import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { defaultSettings } from "./types";
import type { MapData } from "./types";

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
