import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { realmWord, featureName } from "./names-features";
import { random } from "./random";
import { CULTURES } from "./names";
import { defaultSettings } from "./types";
import type { MapData } from "./types";

const world = (seed: string, over = {}) =>
  generateMap("world", { ...defaultSettings, seed, ...over });
const labels = (map: MapData, prefix: string) =>
  map.objects.filter((o) => o.kind === "label" && o.id.startsWith(prefix));

describe("kingdom names", () => {
  it("use the realm word of the capital's culture", () => {
    for (const seed of ["k1", "k2", "k3"]) {
      const map = world(seed, { kingdoms: 4, cities: 6 }),
        kingdoms = labels(map, "region-").filter(
          (o) => !o.id.startsWith("region-feature"),
        );
      expect(kingdoms.length).toBe(4);
      for (const k of kingdoms) {
        const words = CULTURES.flatMap((c) =>
          [0, 1, 2, 3, 4, 5, 6].map((n) => realmWord(c, n).toUpperCase()),
        );
        expect(words.some((w) => k.name.endsWith(` ${w}`))).toBe(true);
      }
    }
  });
  it("give realms different words in different cultures", () => {
    const sets = CULTURES.map(
      (c) => new Set([0, 1, 2, 3].map((n) => realmWord(c, n))),
    );
    expect(new Set(sets.map((s) => [...s].join())).size).toBe(CULTURES.length);
  });
});

describe("names of mountains, forests and seas", () => {
  it("are given to the biggest of each, on the map", () => {
    let mountains = 0,
      forests = 0,
      seas = 0;
    for (const seed of ["f1", "f2", "f3", "f4"]) {
      const map = world(seed),
        features = labels(map, "region-feature");
      expect(features.length).toBeGreaterThan(1);
      for (const f of features) {
        expect(f.x).toBeGreaterThan(0);
        expect(f.x).toBeLessThan(map.width);
        expect(f.y).toBeGreaterThan(0);
        expect(f.y).toBeLessThan(map.height);
        expect(Math.abs(f.rotation)).toBeLessThanOrEqual(35);
      }
      mountains += features.filter((f) => f.color === "#6a5846").length;
      forests += features.filter((f) => f.color === "#476237").length;
      seas += features.filter((f) => f.color === "#2d5871").length;
    }
    expect(mountains).toBeGreaterThanOrEqual(4);
    expect(forests).toBeGreaterThanOrEqual(4);
    expect(seas).toBeGreaterThanOrEqual(4);
  });

  it("put sea names on water and land names on land", () => {
    const map = world("f2"),
      sea = map.settings.seaLevel;
    for (const f of labels(map, "region-feature")) {
      const x = Math.min(
          map.cols - 1,
          Math.floor((f.x / map.width) * map.cols),
        ),
        y = Math.min(map.rows - 1, Math.floor((f.y / map.height) * map.rows)),
        h = map.heights[y * map.cols + x];
      if (f.color === "#2d5871") expect(h).toBeLessThan(sea);
      else expect(h).toBeGreaterThanOrEqual(sea);
    }
  });

  it("do not repeat a settlement's name or each other", () => {
    for (const seed of ["f1", "f2", "f3"]) {
      const map = world(seed),
        names = map.objects
          .filter(
            (o) =>
              o.id.startsWith("settlement-") ||
              o.id.startsWith("region-feature"),
          )
          .map((o) => o.name.toLowerCase());
      expect(new Set(names).size).toBe(names.length);
    }
  });

  it("are the same for the same seed, and rerolled with the settlements", () => {
    const a = labels(world("same"), "region-feature").map((o) => o.name),
      b = labels(world("same"), "region-feature").map((o) => o.name);
    expect(a).toEqual(b);
    expect(a.length).toBeGreaterThan(0);
  });
});

describe("place of the feature names", () => {
  const box = (o: {
    x: number;
    y: number;
    name: string;
    height: number;
    rotation: number;
  }) => {
    const w = o.name.length * o.height * 0.6,
      a = Math.abs((o.rotation * Math.PI) / 180),
      bw = w * Math.cos(a) + o.height * Math.sin(a),
      bh = w * Math.sin(a) + o.height * Math.cos(a);
    return {
      x0: o.x - bw / 2,
      x1: o.x + bw / 2,
      y0: o.y - bh / 2,
      y1: o.y + bh / 2,
    };
  };
  it("keep inside the map and clear of every other name", () => {
    for (const seed of ["p1", "p2", "p3", "p4", "p5"]) {
      const map = world(seed),
        features = labels(map, "region-feature"),
        others = map.objects.filter(
          (o) => o.kind === "label" && !o.id.startsWith("region-feature"),
        );
      for (const f of features) {
        const b = box(f);
        expect(b.x0, `${f.name} on ${seed}`).toBeGreaterThanOrEqual(0);
        expect(b.y0, `${f.name} on ${seed}`).toBeGreaterThanOrEqual(0);
        expect(b.x1).toBeLessThanOrEqual(map.width);
        expect(b.y1).toBeLessThanOrEqual(map.height);
      }
      for (const [i, f] of features.entries())
        for (const o of [...features.slice(i + 1), ...others]) {
          const a = box(f),
            c = box(o);
          const clash =
            a.x0 < c.x1 && a.x1 > c.x0 && a.y0 < c.y1 && a.y1 > c.y0;
          expect(clash, `${f.name} and ${o.name} on ${seed}`).toBe(false);
        }
    }
  });
});

describe("featureName", () => {
  it("makes varied, well formed names for each kind and culture", () => {
    const r = random("fn");
    for (const culture of CULTURES)
      for (const kind of ["mountains", "forest", "sea"] as const) {
        const names = Array.from({ length: 60 }, () =>
          featureName(r, culture, kind),
        );
        expect(new Set(names).size).toBeGreaterThan(30);
        for (const n of names) {
          expect(n).toMatch(/^[A-Z][A-Za-z' -]+$/);
          expect(n).not.toMatch(/(.)\1\1/i);
        }
      }
  });
  it("name a sea as a sea and a range as a range", () => {
    const r = random("fn2");
    for (const culture of CULTURES) {
      const seas = Array.from({ length: 80 }, () =>
        featureName(r, culture, "sea"),
      );
      expect(
        seas.filter((n) => /(Sea|Ocean|Deep|Strait|Waters|Mare|Fjord)/.test(n))
          .length,
      ).toBe(80);
      const ranges = Array.from({ length: 80 }, () =>
        featureName(r, culture, "mountains"),
      );
      expect(
        ranges.filter((n) =>
          /(Mountains|Peaks|Range|Teeth|Spine|Heights|Spires|Fells|Alps|Deeps)/.test(
            n,
          ),
        ).length,
      ).toBe(80);
    }
  });
});
