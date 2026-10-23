import { describe, expect, it } from "vitest";
import {
  MAX_MIX_ITEMS,
  MAX_MIX_WEIGHT,
  MAX_MIXES,
  mixIdOf,
  mixKey,
  mixPictures,
  validMix,
  withBiomes,
  withMix,
  withWeight,
} from "./scatter-mixes";

const oak = "/assets/ai-gen/tree-oak.webp",
  rock = "/assets/ai-gen/boulders.webp";
const mix = {
  id: "m1",
  name: "Wild edge",
  items: [
    { src: oak, weight: 3 },
    { src: rock, weight: 1 },
  ],
};

describe("mix keys", () => {
  it("round-trip an id and ignore kinds", () => {
    expect(mixIdOf(mixKey("abc-1"))).toBe("abc-1");
    expect(mixIdOf("trees")).toBeUndefined();
    expect(mixIdOf("")).toBeUndefined();
  });
});

describe("mixPictures", () => {
  it("gives each picture its weight and the turn its kind allows", () => {
    const p = mixPictures(mix);
    expect(p.map((x) => [x.sprite.name, x.weight, x.turn])).toEqual([
      ["Oak tree", 3, 0],
      ["Boulders", 1, 180],
    ]);
  });
  it("drops a picture the Library no longer has", () => {
    const p = mixPictures({
      ...mix,
      items: [...mix.items, { src: "/assets/ai-gen/retired.webp", weight: 2 }],
    });
    expect(p).toHaveLength(2);
  });
});

describe("validMix", () => {
  it("accepts a mix of bundled pictures", () => {
    expect(validMix(mix)).toBe(true);
  });
  it.each([
    ["no id", { ...mix, id: "" }],
    ["an id with a slash", { ...mix, id: "a/b" }],
    ["no name", { ...mix, name: "" }],
    ["a long name", { ...mix, name: "x".repeat(61) }],
    ["no pictures", { ...mix, items: [] }],
    [
      "too many pictures",
      {
        ...mix,
        items: Array.from({ length: MAX_MIX_ITEMS + 1 }, () => mix.items[0]),
      },
    ],
    [
      "an outside picture",
      { ...mix, items: [{ src: "https://x.test/a.png", weight: 1 }] },
    ],
    [
      "an embedded picture",
      { ...mix, items: [{ src: "data:image/png;base64,AAAA", weight: 1 }] },
    ],
    ["weight 0", { ...mix, items: [{ src: oak, weight: 0 }] }],
    ["a fractional weight", { ...mix, items: [{ src: oak, weight: 1.5 }] }],
    [
      "too much weight",
      { ...mix, items: [{ src: oak, weight: MAX_MIX_WEIGHT + 1 }] },
    ],
    ["a text weight", { ...mix, items: [{ src: oak, weight: "2" }] }],
    ["nothing", null],
  ])("rejects %s", (_, value) => {
    expect(validMix(value)).toBe(false);
  });
});

describe("withWeight", () => {
  it("adds, changes and removes a picture", () => {
    const added = withWeight(mix.items, "/assets/ai-gen/tree-fir.webp", 2);
    expect(added).toHaveLength(3);
    expect(added[2]).toEqual({
      src: "/assets/ai-gen/tree-fir.webp",
      weight: 2,
    });
    expect(withWeight(mix.items, oak, 5)[0]).toEqual({ src: oak, weight: 5 });
    expect(withWeight(mix.items, oak, 0)).toEqual([mix.items[1]]);
  });
  it("keeps the weight between 0 and the most", () => {
    expect(withWeight(mix.items, oak, 99)[0].weight).toBe(MAX_MIX_WEIGHT);
    expect(withWeight(mix.items, oak, -4)).toEqual([mix.items[1]]);
  });
  it("adds no picture to a full mix", () => {
    const full = Array.from({ length: MAX_MIX_ITEMS }, (_, i) => ({
      src: `/assets/ai-gen/p${i}.webp`,
      weight: 1,
    }));
    expect(withWeight(full, oak, 1)).toHaveLength(MAX_MIX_ITEMS);
  });
  it("does not change the items it was given", () => {
    const before = JSON.stringify(mix.items);
    withWeight(mix.items, oak, 7);
    withWeight(mix.items, oak, 0);
    expect(JSON.stringify(mix.items)).toBe(before);
  });
});

describe("withMix", () => {
  it("adds a mix, or replaces the one with its id", () => {
    expect(withMix([], mix)).toEqual([mix]);
    const renamed = { ...mix, name: "Edge" };
    expect(withMix([mix, { ...mix, id: "m2" }], renamed)).toEqual([
      renamed,
      { ...mix, id: "m2" },
    ]);
  });
  it("keeps a world to the most mixes", () => {
    const many = Array.from({ length: MAX_MIXES }, (_, i) => ({
      ...mix,
      id: `m${i}`,
    }));
    expect(withMix(many, { ...mix, id: "new" })).toHaveLength(MAX_MIXES);
  });
});

describe("biomes of a picture in a mix", () => {
  it("are valid when they are different biome ids", () => {
    const item = (biomes: unknown) => ({
      ...mix,
      items: [{ src: oak, weight: 1, biomes }],
    });
    expect(validMix(item([5, 6]))).toBe(true);
    expect(validMix(item(undefined))).toBe(true);
    for (const bad of [[], [0], [99], [5, 5], [1.5], ["5"], "5", [null]])
      expect(validMix(item(bad))).toBe(false);
  });
  it("go to the pool, and are left out of it when unset", () => {
    const withB = {
      ...mix,
      items: [
        { src: oak, weight: 1, biomes: [8] },
        { src: rock, weight: 1 },
      ],
    };
    const [a, b] = mixPictures(withB);
    expect(a.biomes).toEqual([8]);
    expect(b).not.toHaveProperty("biomes");
  });
  it("are set, cleared and kept apart per picture", () => {
    const set = withBiomes(mix.items, oak, [8, 9]);
    expect(set[0]).toEqual({ src: oak, weight: 3, biomes: [8, 9] });
    expect(set[1]).toEqual(mix.items[1]);
    expect(withBiomes(set, oak, undefined)[0]).toEqual(mix.items[0]);
    expect(withBiomes(set, oak, [])[0]).toEqual(mix.items[0]);
  });
  it("stay when the weight changes", () => {
    const set = withBiomes(mix.items, oak, [8]);
    expect(withWeight(set, oak, 5)[0]).toEqual({
      src: oak,
      weight: 5,
      biomes: [8],
    });
  });
});
