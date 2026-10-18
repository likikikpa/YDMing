import { describe, it, expect } from "vitest";
import {
  biomeAt,
  encounterBudget,
  generateMap,
  rerollGroup,
  SRD,
  traceRiver,
} from "./generator";
import { defaultSettings } from "./types";
describe("seeded generation", () => {
  it("produces the same complete map from the same seed for each map type", () => {
    for (const kind of ["world", "city", "dungeon"] as const) {
      expect(
        generateMap(kind, { ...defaultSettings, seed: "REPEATABLE" }),
      ).toEqual(generateMap(kind, { ...defaultSettings, seed: "REPEATABLE" }));
    }
  });
  it("produces different terrain for a different seed, within valid bounds", () => {
    const a = generateMap("world", defaultSettings),
      b = generateMap("world", { ...defaultSettings, seed: "OTHER" });
    expect(a.heights).not.toEqual(b.heights);
    expect(a.heights.every((h) => Number.isFinite(h) && h >= 0 && h <= 1)).toBe(
      true,
    );
    expect(a.heights.some((h) => h < defaultSettings.seaLevel)).toBe(true);
    expect(a.heights.some((h) => h > defaultSettings.seaLevel)).toBe(true);
  });
  it("keeps every dungeon floor reachable in all corridor modes", () => {
    for (const seed of ["A", "B", "C", "D", "E"])
      for (const corridors of ["winding", "straight", "labyrinth"]) {
        const map = generateMap("dungeon", {
          ...defaultSettings,
          seed,
          corridors,
          irregular: true,
        });
        const start = map.heights.findIndex((h) => h > 0),
          seen = new Set([start]),
          queue = [start];
        for (let q = 0; q < queue.length; q++) {
          const i = queue[q],
            x = i % map.cols,
            y = Math.floor(i / map.cols);
          for (const [dx, dy] of [
            [-1, 0],
            [1, 0],
            [0, -1],
            [0, 1],
          ]) {
            const xx = x + dx,
              yy = y + dy;
            if (xx < 0 || yy < 0 || xx >= map.cols || yy >= map.rows) continue;
            const n = yy * map.cols + xx;
            if (map.heights[n] && !seen.has(n)) {
              seen.add(n);
              queue.push(n);
            }
          }
        }
        expect(seen.size).toBe(map.heights.filter(Boolean).length);
        expect(map.rooms.map((r) => r.number)).toEqual(
          map.rooms.map((_, i) => i + 1),
        );
      }
  });
  it("uses actual SRD entities and respects encounter and treasure tier budgets", () => {
    for (const level of [1, 4, 5, 10, 11, 16, 17, 20]) {
      const map = generateMap("dungeon", {
        ...defaultSettings,
        seed: "LOOT-" + level,
        level,
        dungeonSize: 90,
        density: 100,
      });
      for (const room of map.rooms) {
        if (room.monster) {
          const entity = SRD.find((e) => e.key === room.monster)!;
          expect(entity).toBeDefined();
          expect(entity.xp!).toBeLessThanOrEqual(encounterBudget(level, 4));
        }
        if (room.item) {
          const item = SRD.find((e) => e.key === room.item)!;
          const rank = [
            "common",
            "uncommon",
            "rare",
            "very-rare",
            "legendary",
          ].indexOf(item.rarity!);
          expect(rank).toBeGreaterThanOrEqual(0);
          expect(rank).toBeLessThanOrEqual(
            level < 5 ? 1 : level < 11 ? 2 : level < 17 ? 3 : 4,
          );
        }
      }
    }
  });
  it("traces a continuous downhill river", () => {
    const map = generateMap("world", defaultSettings),
      start = map.heights.findIndex((h) => h > 0.7),
      path = traceRiver(map, start);
    expect(path.length).toBeGreaterThan(1);
    for (let i = 1; i < path.length; i++) {
      expect(map.heights[path[i]]).toBeLessThanOrEqual(
        map.heights[path[i - 1]],
      );
      expect(
        Math.abs((path[i] % map.cols) - (path[i - 1] % map.cols)),
      ).toBeLessThanOrEqual(1);
      expect(
        Math.abs(
          Math.floor(path[i] / map.cols) - Math.floor(path[i - 1] / map.cols),
        ),
      ).toBeLessThanOrEqual(1);
    }
  });
  it("classifies sea and respects biome overrides", () => {
    const map = generateMap("world", defaultSettings);
    map.heights[0] = 0;
    expect(biomeAt(map, 0, 0)).toBe(12);
    map.biomes[0] = 8;
    expect(biomeAt(map, 0, 0)).toBe(8);
  });
  it("rerolls room contents without changing dungeon geometry", () => {
    const map = generateMap("dungeon", defaultSettings),
      next = rerollGroup(map, "contents", {
        ...defaultSettings,
        seed: "NEW-CONTENTS",
      });
    expect(next.heights).toEqual(map.heights);
    expect(next.paths).toEqual(map.paths);
    expect(next.rooms.map((r) => [r.x, r.y, r.w, r.h])).toEqual(
      map.rooms.map((r) => [r.x, r.y, r.w, r.h]),
    );
  });
  it("imports SRD 5.2 only and has full stat blocks", () => {
    expect(SRD.filter((e) => e.kind === "monster")).toHaveLength(331);
    expect(SRD.filter((e) => e.kind === "item")).toHaveLength(760);
    expect(SRD.every((e) => e.key.startsWith("srd-2024_"))).toBe(true);
    expect(
      SRD.filter((e) => e.kind === "monster").every(
        (e) => e.details && e.ac !== undefined && e.hp !== undefined,
      ),
    ).toBe(true);
  });
  it("rerolls people on the existing terrain without moving painted objects", () => {
    const map = generateMap("world", defaultSettings);
    map.objects.push({
      id: "handmade",
      kind: "label",
      name: "Keep me",
      x: 50,
      y: 50,
      width: 80,
      height: 15,
      rotation: 0,
      layer: "Labels",
      color: "#000000",
    });
    const next = rerollGroup(map, "people", {
      ...defaultSettings,
      seed: "PEOPLE",
    });
    expect(next.heights).toEqual(map.heights);
    expect(next.settings.seed).toBe(map.settings.seed);
    expect(next.objects.find((o) => o.id === "handmade")).toEqual(
      map.objects.find((o) => o.id === "handmade"),
    );
    for (const o of next.objects.filter((o) =>
      o.id.startsWith("settlement-"),
    )) {
      const i =
        Math.floor((o.y / next.height) * next.rows) * next.cols +
        Math.floor((o.x / next.width) * next.cols);
      expect(next.heights[i]).toBeGreaterThan(next.settings.seaLevel);
    }
  });
});
