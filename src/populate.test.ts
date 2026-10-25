import { describe, expect, it } from "vitest";
import { biomeAt, generateMap, rerollGroup } from "./generator";
import { GENERATED, hasStampSet, populateWorld } from "./populate";
import { growsOn } from "./scatter-habitat";
import { pathBlocker } from "./scatter-paths";
import { defaultSettings } from "./types";
import type { GeneratorSettings, MapData } from "./types";

const world = (seed: string, over: Partial<GeneratorSettings> = {}) =>
  generateMap("world", { ...defaultSettings, seed, ...over });
const stamps = (map: MapData) =>
  map.objects.filter((o) => o.id.startsWith(GENERATED));
const cell = (map: MapData, o: { x: number; y: number }) => ({
  x: Math.min(map.cols - 1, Math.floor((o.x / map.width) * map.cols)),
  y: Math.min(map.rows - 1, Math.floor((o.y / map.height) * map.rows)),
});

describe("land detail of a generated world", () => {
  it("is some stamps at the default, more with the slider, none at 0", () => {
    const counts = [0, 25, 60, 100].map(
      (detail) => stamps(world("pop1", { detail })).length,
    );
    expect(counts[0]).toBe(0);
    expect(counts[1]).toBeGreaterThan(100);
    expect(counts[2]).toBeGreaterThan(counts[1]);
    expect(counts[3]).toBeGreaterThan(counts[2]);
    expect(counts[3]).toBeLessThan(4001);
  });

  it("uses the pictures of the map's style, and none in Realistic", () => {
    const fantasy = stamps(world("pop2", { style: "fantasy" })),
      ink = stamps(world("pop2", { style: "ink" }));
    expect(fantasy.length).toBeGreaterThan(50);
    for (const o of fantasy) expect(o.image).toMatch(/^\/assets\/ai-gen\//);
    expect(ink.length).toBeGreaterThan(50);
    for (const o of ink) expect(o.image).toMatch(/^\/assets\/cartography\//);
    const realistic = world("pop2", { style: "realistic" });
    expect(hasStampSet(realistic)).toBe(false);
    expect(stamps(realistic)).toEqual([]);
  });

  it("puts each stamp where it grows: on land, in a biome that suits it", () => {
    const map = world("pop3", { detail: 80 }),
      sea = map.settings.seaLevel;
    expect(stamps(map).length).toBeGreaterThan(200);
    for (const o of stamps(map)) {
      const c = cell(map, o);
      expect(map.heights[c.y * map.cols + c.x]).toBeGreaterThanOrEqual(sea);
      expect(growsOn(o.image!, biomeAt(map, c.x, c.y))).toBe(true);
    }
  });

  it("keeps off settlements, rivers, roads and the edge of the map", () => {
    const map = world("pop4", { detail: 100 }),
      blocked = pathBlocker(map.paths, 0)!,
      seats = map.objects.filter((o) => o.id.startsWith("settlement-"));
    for (const o of stamps(map)) {
      expect(blocked(o)).toBe(false);
      for (const s of seats)
        expect(Math.hypot(s.x - o.x, s.y - o.y)).toBeGreaterThanOrEqual(26);
      expect(o.x).toBeGreaterThan(8);
      expect(o.y).toBeLessThan(map.height - 8);
    }
  });

  it("makes woods of trees and ranges of mountains", () => {
    const map = world("pop5", { detail: 100 }),
      list = stamps(map),
      trees = list.filter((o) => /tree-/.test(o.image!)),
      peaks = list.filter((o) =>
        /(peak|range|ridge|hills|mesa|butte|volcano)/.test(o.image!),
      );
    expect(trees.length).toBeGreaterThan(100);
    expect(peaks.length).toBeGreaterThan(10);
    // Clusters: a tree usually has another within a short walk.
    let near = 0;
    for (const t of trees.slice(0, 150))
      if (trees.some((u) => u !== t && Math.hypot(u.x - t.x, u.y - t.y) < 40))
        near++;
    expect(near / Math.min(150, trees.length)).toBeGreaterThan(0.8);
  });

  it("is the same for the same seed, and rerolled with the settlements without piling up", () => {
    const a = stamps(world("same")).map((o) => [o.id, o.x, o.y, o.image]),
      b = stamps(world("same")).map((o) => [o.id, o.x, o.y, o.image]);
    expect(a).toEqual(b);
    const map = world("same"),
      again = rerollGroup(map, "people", map.settings);
    expect(stamps(again).length).toBeGreaterThan(0);
    expect(stamps(again).length).toBe(stamps(map).length);
    populateWorld(again, "same");
    expect(stamps(again).length).toBe(stamps(map).length);
  });

  it("carries stamps with the sizes and tints of the scatter brush, and no embedded pictures", () => {
    const list = stamps(world("pop6", { detail: 60 }));
    for (const o of list) {
      expect(o.kind).toBe("image");
      expect(o.image).toBeDefined();
      expect(o.image).not.toMatch(/^data:/);
      expect(o.imageId).toBeUndefined();
      expect(o.width).toBeGreaterThan(8);
      expect(o.layer).toBe("Objects");
    }
    expect(list.some((o) => o.flipX)).toBe(true);
    expect(list.some((o) => o.tint)).toBe(true);
  });
});
