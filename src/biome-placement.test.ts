import { describe, expect, it } from "vitest";
import { Biome } from "./biomes";
import {
  SPECIAL_BIOMES,
  amountOf,
  clearSpecialBiomes,
  countBiome,
  placeSpecialBiomes,
} from "./biome-placement";
import { generateMap, rerollGroup } from "./generator";
import { defaultSettings } from "./types";
import type { GeneratorSettings } from "./types";

const none: Partial<GeneratorSettings> = {
  volcanic: 0,
  blight: 0,
  reefs: 0,
  mangroves: 0,
  badlands: 0,
  glaciers: 0,
  steppe: 0,
  moorland: 0,
  autumnWoods: 0,
};
const world = (seed: string, over: Partial<GeneratorSettings> = {}) =>
  generateMap("world", { ...defaultSettings, seed, ...over });
const SEEDS = ["a1", "b2", "c3", "d4", "e5"];

describe("special biomes of a generated world", () => {
  it("are all placed at the default sliders, on every seed", () => {
    for (const seed of SEEDS) {
      const map = world(seed);
      for (const { key, biome } of SPECIAL_BIOMES)
        expect(countBiome(map, biome), `${key} on ${seed}`).toBeGreaterThan(0);
    }
  });

  it("are left out when their sliders are at 0", () => {
    const map = world("a1", none);
    for (const { biome } of SPECIAL_BIOMES)
      expect(countBiome(map, biome)).toBe(0);
    expect(map.biomes.every((b) => b === 0)).toBe(true);
  });

  it("take more ground as their slider goes up", () => {
    const base = world("b2", none);
    for (const { key, biome } of SPECIAL_BIOMES) {
      const counts = [10, 50, 100].map((v) => {
        const m = {
          ...base,
          biomes: [...base.biomes],
          settings: { ...base.settings, [key]: v },
        };
        placeSpecialBiomes(m, "b2");
        return countBiome(m, biome);
      });
      expect(counts[0], key).toBeGreaterThan(0);
      expect(counts[1], key).toBeGreaterThanOrEqual(counts[0]);
      expect(counts[2], key).toBeGreaterThanOrEqual(counts[1]);
      expect(counts[2], key).toBeGreaterThan(counts[0]);
    }
  });

  it("only paint their own biome for their own slider", () => {
    const map = world("c3", { ...none, reefs: 100 });
    for (const { biome } of SPECIAL_BIOMES)
      if (biome !== Biome.CoralReef) expect(countBiome(map, biome)).toBe(0);
  });

  it("are the same for the same seed and different for another", () => {
    expect(world("same").biomes).toEqual(world("same").biomes);
    expect(world("same").biomes).not.toEqual(world("other").biomes);
  });

  it("keep to ground that suits them", () => {
    const map = world("e5", {
        ...defaultSettings,
        volcanic: 100,
        reefs: 100,
        mangroves: 100,
        glaciers: 100,
      }),
      sea = map.settings.seaLevel;
    const cells = (biome: number) =>
      map.biomes.map((b, i) => (b === biome ? i : -1)).filter((i) => i >= 0);
    // Coral grows in shallow water, not on land and not in the deep.
    for (const i of cells(Biome.CoralReef)) {
      expect(map.heights[i]).toBeLessThan(sea);
      expect(map.heights[i]).toBeGreaterThan(sea - 0.07);
    }
    // Mangroves grow on low land next to water.
    for (const i of cells(Biome.Mangrove)) {
      expect(map.heights[i]).toBeGreaterThanOrEqual(sea);
      expect(map.heights[i]).toBeLessThan(sea + 0.05);
    }
    // Volcanic land lies around high ground: some of it is high, and it is not all shore.
    const volcanic = cells(Biome.Volcanic),
      mean = volcanic.reduce((a, i) => a + map.heights[i], 0) / volcanic.length;
    expect(mean).toBeGreaterThan(0.5);
    for (const i of volcanic)
      expect(map.heights[i]).toBeGreaterThanOrEqual(sea);
    // Glaciers are cold or high.
    for (const i of cells(Biome.Glacier))
      expect(map.heights[i]).toBeGreaterThanOrEqual(sea);
  });

  it("do not replace ground that was painted before", () => {
    const map = world("a1", none);
    map.biomes[1234] = Biome.Desert;
    map.settings = {
      ...map.settings,
      volcanic: 100,
      glaciers: 100,
      steppe: 100,
      autumnWoods: 100,
    };
    placeSpecialBiomes(map, "a1");
    expect(map.biomes[1234]).toBe(Biome.Desert);
  });
});

describe("amountOf", () => {
  it("falls back to the default for a save made before the sliders", () => {
    const old = { ...defaultSettings } as Partial<GeneratorSettings>;
    delete old.volcanic;
    expect(amountOf(old, "volcanic", defaultSettings)).toBe(0.3);
    expect(amountOf({ volcanic: 0 }, "volcanic", defaultSettings)).toBe(0);
    expect(amountOf({ volcanic: 250 }, "volcanic", defaultSettings)).toBe(1);
    expect(amountOf({ volcanic: -5 }, "volcanic", defaultSettings)).toBe(0);
  });
});

describe("rerolling the biomes", () => {
  it("places them again from the sliders, leaving the land and water alone", () => {
    const map = world("r1", none),
      heights = [...map.heights];
    expect(countBiome(map, Biome.Volcanic)).toBe(0);
    const next = rerollGroup(map, "biomes", { ...map.settings, volcanic: 80 });
    expect(countBiome(next, Biome.Volcanic)).toBeGreaterThan(0);
    expect(next.heights).toEqual(heights);
    expect(next.objects).toEqual(map.objects);
  });
  it("clears special biomes and keeps the ground painted before them", () => {
    const map = world("r2");
    map.biomes[5] = Biome.Desert;
    expect(countBiome(map, Biome.Steppe)).toBeGreaterThan(0);
    clearSpecialBiomes(map);
    expect(countBiome(map, Biome.Steppe)).toBe(0);
    expect(map.biomes[5]).toBe(Biome.Desert);
  });
});
