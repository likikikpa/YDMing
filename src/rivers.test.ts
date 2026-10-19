import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import {
  buildRiverNetwork,
  mergeRivers,
  riverThrough,
  riverFromCells,
} from "./rivers";
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
  it("never lets two rivers lie on top of each other", () => {
    const near = (p: { x: number; y: number }, line: { x: number; y: number }[]) => {
      let best = Infinity;
      for (let i = 1; i < line.length; i++) {
        const dx = line[i].x - line[i - 1].x,
          dy = line[i].y - line[i - 1].y,
          t = Math.max(0, Math.min(1, ((p.x - line[i - 1].x) * dx + (p.y - line[i - 1].y) * dy) / (dx * dx + dy * dy || 1)));
        best = Math.min(best, Math.hypot(p.x - line[i - 1].x - dx * t, p.y - line[i - 1].y - dy * t));
      }
      return best;
    };
    for (const map of maps) {
      const rivers = map.paths.filter((p) => p.kind === "river");
      for (const river of rivers)
        for (const other of rivers) {
          if (other === river) continue;
          // Two rivers touch only where one joins the other (a handful of points);
          // a long shared stretch would mean they lie on top of each other.
          const shared = river.points.filter((p) => near(p, other.points) < 1.6).length;
          expect(shared).toBeLessThanOrEqual(8);
        }
    }
  });
  it("trims a river that runs into another one", () => {
    const base = maps[0].paths.find((p) => p.kind === "river")!,
      copy = { ...base, id: "dup", points: base.points.map((p) => ({ ...p })), widths: [...base.widths!] };
    expect(mergeRivers(copy, [base])).toBeNull();
    const branch = { ...base, id: "branch", points: [{ x: base.points[8].x + 30, y: base.points[8].y - 30 }, { x: base.points[8].x + 20, y: base.points[8].y - 20 }, { x: base.points[8].x + 10, y: base.points[8].y - 10 }, { x: base.points[8].x + 4, y: base.points[8].y - 4 }, base.points[8], base.points[9]], widths: [1, 1, 1, 1, 1, 1] };
    const merged = mergeRivers(branch, [base])!;
    expect(merged.points.length).toBeLessThan(branch.points.length);
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
  describe("hand-drawn rivers", () => {
    const through = (pts: [number, number][], others: ReturnType<typeof riverThrough>[] = []) =>
      riverThrough(
        pts.map(([x, y]) => ({ x, y })),
        others.filter((o) => o !== null) as never,
        "a",
      );
    const nearest = (river: NonNullable<ReturnType<typeof through>>, x: number, y: number) =>
      Math.min(...river.points.map((p) => Math.hypot(p.x - x, p.y - y)));
    it("is the same every time and passes through every point placed", () => {
      const pts: [number, number][] = [[100, 100], [200, 160], [260, 90], [380, 150]],
        river = through(pts)!;
      expect(through(pts)).toEqual(river);
      for (const [x, y] of pts) expect(nearest(river, x, y)).toBeLessThan(0.5);
      expect(river.points[0]).toEqual({ x: 100, y: 100 });
      expect(river.points.at(-1)).toEqual({ x: 380, y: 150 });
    });
    it("curves at the points instead of running in straight segments", () => {
      const river = through([[100, 100], [200, 160], [260, 90]])!,
        corner = { x: 200, y: 160 },
        // Directions of travel just before and just after the middle point.
        i = river.points.findIndex((p) => Math.hypot(p.x - corner.x, p.y - corner.y) < 0.5),
        before = river.points[i - 1],
        after = river.points[i + 1];
      expect(i).toBeGreaterThan(0);
      // A polyline would turn at once; a curve has already been bending.
      const turn = (a: typeof before, b: typeof before, c: typeof before) =>
        Math.abs(
          Math.atan2(c.y - b.y, c.x - b.x) - Math.atan2(b.y - a.y, b.x - a.x),
        );
      expect(turn(before, river.points[i], after)).toBeLessThan(0.5);
    });
    it("with two points is a straight line, thin at the source and wide at the mouth", () => {
      const river = through([[100, 100], [300, 160]])!;
      for (const p of river.points)
        expect(Math.abs((p.y - 100) * 200 - (p.x - 100) * 60)).toBeLessThan(1e-6);
      expect(river.widths![0]).toBeLessThan(river.widths!.at(-1)!);
      expect(river.widths!.length).toBe(river.points.length);
    });
    it("joins a river whose bank is within the small gap, but not one further away", () => {
      const other = through([[0, 200], [400, 200]]);
      const near = through([[200, 50], [205, 190]], [other])!;
      expect(near.points.at(-1)).toEqual({ x: 205, y: 200 });
      const far = through([[200, 50], [205, 150]], [other])!;
      expect(far.points.at(-1)).toEqual({ x: 205, y: 150 });
    });
    it("needs two separate points", () => {
      expect(through([[10, 10]])).toBeNull();
      expect(through([[10, 10], [11, 11]])).toBeNull();
    });
  });
});
