import { describe, expect, it } from "vitest";
import { createEmptyMap, generateMap, rerollGroup } from "./generator";
import { clampSize, resizeMap, shiftChildren } from "./mapsize";
import { validateProject } from "./storage";
import { defaultSettings } from "./types";

const settings = { ...defaultSettings, seed: "SIZE" };

describe("map size", () => {
  it("keeps sizes between the limits", () => {
    expect(clampSize(10, 10)).toEqual({ cols: 120, rows: 85 });
    expect(clampSize(5000, 700)).toEqual({ cols: 640, rows: 640 });
  });
  it("creates and generates maps of the chosen size", () => {
    const map = generateMap("world", settings, undefined, undefined, {
      cols: 400,
      rows: 280,
    });
    expect([map.cols, map.rows, map.width, map.height]).toEqual([
      400, 280, 2000, 1400,
    ]);
    expect(map.heights).toHaveLength(400 * 280);
    expect(map.heights.some((h) => h > settings.seaLevel)).toBe(true);
    const dungeon = createEmptyMap("dungeon", settings, undefined, undefined, {
      cols: 400,
      rows: 280,
    });
    expect(dungeon.width).toBe(1200);
  });
  it("regenerating fills the whole resized map", () => {
    const map = resizeMap(generateMap("world", settings), 400, 300, {
      x: 0.5,
      y: 0.5,
    });
    const next = rerollGroup(map, "all", settings);
    expect([next.cols, next.rows]).toEqual([400, 300]);
  });
  it("adds sea around the map and moves everything with the anchor", () => {
    const map = createEmptyMap("world", settings);
    map.heights.fill(0.6);
    map.objects.push({
      id: "a",
      kind: "city",
      name: "A",
      x: 100,
      y: 100,
      width: 10,
      height: 10,
      rotation: 0,
      layer: "Objects",
      color: "#000",
    });
    map.paths.push({
      id: "r",
      kind: "river",
      points: [{ x: 50, y: 60 }],
      width: 2,
      layer: "Water",
    });
    const next = resizeMap(map, 260, 180, { x: 1, y: 0.5 });
    expect([next.width, next.height]).toEqual([1300, 900]);
    expect(next.objects[0]).toMatchObject({ x: 200, y: 125 });
    expect(next.paths[0].points[0]).toEqual({ x: 150, y: 85 });
    // The new strip on the left is sea, the old land sits to its right.
    expect(next.heights[100 * 260 + 5]).toBeLessThan(settings.seaLevel);
    expect(next.heights[100 * 260 + 30]).toBe(0.6);
    expect(next.origin).toEqual({ x: 100, y: 25 });
    expect(map.width).toBe(1200);
  });
  it("crops when shrinking and keeps child maps in place", () => {
    const map = createEmptyMap("world", settings),
      next = resizeMap(map, 200, 170, { x: 0.5, y: 0 }),
      child = {
        ...createEmptyMap("city", settings),
        parentId: map.id,
        parentPosition: { x: 300, y: 300 },
      };
    expect(next.width).toBe(1000);
    shiftChildren([child], map.id, next.origin!.x, next.origin!.y);
    expect(child.parentPosition).toEqual({ x: 200, y: 300 });
  });
  it("loads saved maps of any allowed size", () => {
    const map = resizeMap(createEmptyMap("world", settings), 300, 200, {
        x: 0,
        y: 0,
      }),
      project = {
        version: 1 as const,
        id: "p",
        name: "P",
        maps: [map],
        activeMapId: map.id,
        credits: [],
        commercial: false,
        updatedAt: "",
      };
    expect(() => validateProject(structuredClone(project))).not.toThrow();
    expect(() =>
      validateProject({ ...project, maps: [{ ...map, width: 999 }] }),
    ).toThrow();
  });
});
