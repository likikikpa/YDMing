import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import { defaultSettings } from "./types";
import { heightAt, landRuns, trimEnd } from "./water";

/** Land on the left half of the map, sea on the right. */
function coastMap() {
  const map = createEmptyMap("world", { ...defaultSettings, seed: "WATER" });
  for (let y = 0; y < map.rows; y++)
    for (let x = 0; x < map.cols; x++)
      map.heights[y * map.cols + x] = x < map.cols / 2 ? 0.6 : 0.2;
  return map;
}

describe("rivers meeting open water", () => {
  it("blends heights between samples", () => {
    const map = coastMap(),
      shore = map.width / 2;
    expect(heightAt(map, 10, 10)).toBeCloseTo(0.6);
    expect(heightAt(map, shore - 2.5, 10)).toBeGreaterThan(0.2);
    expect(heightAt(map, shore - 2.5, 10)).toBeLessThan(0.6);
  });
  it("stops a river at the shoreline, just inside the water", () => {
    const map = coastMap(),
      points = [100, 300, 500, 700, 900].map((x) => ({ x, y: 400 })),
      runs = landRuns(
        map,
        points,
        points.map(() => 2),
      );
    expect(runs).toHaveLength(1);
    const end = runs[0].points.at(-1)!;
    expect(runs[0].shoreEnd).toBe(true);
    expect(runs[0].shoreStart).toBe(false);
    expect(heightAt(map, end.x, end.y)).toBeLessThan(map.settings.seaLevel);
    expect(heightAt(map, end.x - 1, end.y)).toBeGreaterThanOrEqual(
      map.settings.seaLevel,
    );
  });
  it("splits a river that crosses a lake into two land runs", () => {
    const map = coastMap();
    for (let y = 70; y < 100; y++)
      for (let x = 40; x < 60; x++) map.heights[y * map.cols + x] = 0.2;
    const points = [100, 200, 250, 300, 400, 500].map((x) => ({ x, y: 425 })),
      runs = landRuns(
        map,
        points,
        points.map(() => 2),
      );
    expect(runs).toHaveLength(2);
    expect(runs[0].shoreEnd && runs[1].shoreStart).toBe(true);
  });
  it("trims a line back along itself", () => {
    const out = trimEnd(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
        { x: 10, y: 10 },
      ],
      12,
    );
    expect(out.at(-1)).toEqual({ x: 8, y: 0 });
  });
});

describe("river ends near water", () => {
  it("leads a river that stops on the beach into the sea", () => {
    const map = coastMap(),
      shore = map.width / 2,
      points = [100, 300, shore - 8].map((x) => ({ x, y: 400 })),
      [run] = landRuns(
        map,
        points,
        points.map(() => 2),
      );
    expect(run.shoreEnd).toBe(true);
    expect(run.points.at(-1)!.x).toBeGreaterThan(shore - 5);
  });
  it("leaves a river far from water alone", () => {
    const map = coastMap(),
      points = [100, 200, 300].map((x) => ({ x, y: 400 })),
      [run] = landRuns(
        map,
        points,
        points.map(() => 2),
      );
    expect(run.shoreEnd || run.shoreStart).toBe(false);
    expect(run.points).toHaveLength(3);
  });
});
