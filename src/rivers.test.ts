import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { buildRiverNetwork, riverFromCells } from "./rivers";
import { traceRiver } from "./generator";
import { random } from "./random";
import { defaultSettings } from "./types";
import { worldWater } from "./generation-parts";

const seaDistance = (map: ReturnType<typeof generateMap>, p: { x: number; y: number }) => {
  const cx = (p.x / map.width) * map.cols,
    cy = (p.y / map.height) * map.rows;
  let best = Infinity;
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++)
      if (map.heights[y * map.cols + x] < map.settings.seaLevel)
        best = Math.min(best, Math.hypot(x - cx, y - cy));
  return best;
};

describe("river networks", () => {
  const maps = ["ALPHA", "BRAVO", "CHARLIE"].map((seed) =>
    generateMap("world", { ...defaultSettings, seed }),
  );
  it("creates several rivers that widen towards the mouth", () => {
    for (const map of maps) {
      const rivers = map.paths.filter((p) => p.kind === "river");
      expect(rivers.length).toBeGreaterThanOrEqual(5);
      for (const river of rivers) {
        expect(river.widths).toHaveLength(river.points.length);
        const w = river.widths!;
        expect(w.at(-1)!).toBeGreaterThanOrEqual(w[0]);
        expect(Math.min(...w)).toBeGreaterThan(0.5);
        expect(river.width).toBeLessThanOrEqual(5.5);
      }
    }
  });
  it("ends every main river at the sea or a lake", () => {
    for (const map of maps)
      for (const river of map.paths.filter(
        (p) => p.kind === "river" && !p.id.includes("-t"),
      ))
        expect(seaDistance(map, river.points.at(-1)!)).toBeLessThan(2.5);
  });
  it("joins tributaries to the river they flow into instead of running alongside", () => {
    for (const map of maps) {
      const rivers = map.paths.filter((p) => p.kind === "river"),
        mains = rivers.filter((p) => !p.id.includes("-t")),
        tributaries = rivers.filter((p) => p.id.includes("-t"));
      expect(tributaries.length).toBeGreaterThan(0);
      for (const t of tributaries) {
        const end = t.points.at(-1)!,
          near = rivers
            .filter((r) => r !== t)
            .some((r) =>
              r.points.some((p) => Math.hypot(p.x - end.x, p.y - end.y) < 6),
            );
        expect(near).toBe(true);
      }
      expect(mains.length).toBeLessThanOrEqual(defaultSettings.rivers);
    }
  });
  it("smooths away the grid staircase: no sharp turns between points", () => {
    for (const map of maps)
      for (const river of map.paths.filter((p) => p.kind === "river")) {
        const pts = river.points;
        for (let i = 2; i < pts.length; i++) {
          const a = Math.atan2(pts[i - 1].y - pts[i - 2].y, pts[i - 1].x - pts[i - 2].x),
            b = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
          let turn = Math.abs(a - b);
          if (turn > Math.PI) turn = 2 * Math.PI - turn;
          expect(turn).toBeLessThan((100 * Math.PI) / 180);
        }
      }
  });
  it("rerolling water over the same land gives a different layout", () => {
    const map = structuredClone(maps[0]);
    const first = buildRiverNetwork(map, 9, random("one")),
      second = buildRiverNetwork(map, 9, random("two"));
    expect(JSON.stringify(first)).not.toEqual(JSON.stringify(second));
    worldWater(map, "three");
    expect(map.paths.filter((p) => p.kind === "river").length).toBeGreaterThan(0);
  });
  it("traces a user-drawn river as a smooth tapered path", () => {
    const map = maps[0],
      start = map.heights.findIndex((h) => h > 0.7),
      cells = traceRiver(structuredClone(map), start),
      river = riverFromCells(map, [...cells].reverse());
    expect(river.points.length).toBeGreaterThan(cells.length);
    expect(river.widths!.length).toBe(river.points.length);
  });
});
