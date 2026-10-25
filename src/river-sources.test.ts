import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { riverMetrics } from "./river-metrics";
import { defaultSettings } from "./types";

const world = (seed: string, rivers = 12) =>
  generateMap("world", { ...defaultSettings, seed, rivers });
const SEEDS = ["r1", "r2", "r3", "r4"];

describe("rivers of a generated world", () => {
  it("rise in the hills, mostly", () => {
    const m = SEEDS.map((s) => riverMetrics(world(s)));
    const from = m.reduce((a, x) => a + x.fromHills, 0) / m.length;
    // Before headwaters were followed up, 58% began in the hills.
    expect(from).toBeGreaterThan(0.8);
    for (const x of m) expect(x.rivers).toBeGreaterThan(8);
  });

  it("all end in the sea or a lake, or join another river", () => {
    for (const s of SEEDS) expect(riverMetrics(world(s)).reachWater).toBe(1);
  });

  it("run over land and nowhere else, up to their mouth", () => {
    const map = world("r2"),
      sea = map.settings.seaLevel;
    for (const river of map.paths.filter((p) => p.kind === "river")) {
      const inland = river.points.slice(0, -2);
      for (const p of inland) {
        const x = Math.min(
            map.cols - 1,
            Math.floor((p.x / map.width) * map.cols),
          ),
          y = Math.min(map.rows - 1, Math.floor((p.y / map.height) * map.rows));
        expect(map.heights[y * map.cols + x]).toBeGreaterThanOrEqual(
          sea - 0.03,
        );
      }
    }
  });

  it("are the same for the same seed, and none when there are none", () => {
    const a = world("same").paths.filter((p) => p.kind === "river"),
      b = world("same").paths.filter((p) => p.kind === "river");
    expect(a).toEqual(b);
    expect(world("same", 0).paths.filter((p) => p.kind === "river")).toEqual(
      [],
    );
  });
});
