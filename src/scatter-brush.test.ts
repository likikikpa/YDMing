import { describe, expect, it } from "vitest";
import { DEFAULT_SCATTER, scatterOptions, scatterPool } from "./scatter-brush";

const oak = { src: "/assets/ai-gen/tree-oak.webp", name: "Oak tree" };
const on = { ...DEFAULT_SCATTER, on: true };

describe("scatterPool", () => {
  it("is empty while scatter is off", () => {
    expect(scatterPool(DEFAULT_SCATTER, oak, "ai-gen")).toEqual([]);
    expect(scatterPool(undefined, oak, "ai-gen")).toEqual([]);
  });
  it("scatters the picked picture when no kind is chosen", () => {
    expect(scatterPool(on, oak, "ai-gen")).toEqual([{ sprite: oak, turn: 0 }]);
  });
  it("scatters a whole kind of the open collection", () => {
    const pool = scatterPool({ ...on, kind: "trees" }, oak, "ai-gen");
    expect(pool.length).toBeGreaterThan(10);
  });
  it("falls back to the picked picture when the collection lacks the kind", () => {
    expect(scatterPool({ ...on, kind: "trees" }, oak, "gosbell")).toEqual([
      { sprite: oak, turn: 0 },
    ]);
  });
  it("is empty with nothing picked", () => {
    expect(scatterPool(on, undefined, "gosbell")).toEqual([]);
  });
});

describe("scatterOptions", () => {
  it("turns the percentages into fractions", () => {
    const o = scatterOptions(on, 48);
    expect(o).toMatchObject({ radius: 80, size: 48, density: 0.4, tint: 0.3 });
    expect(o.scale[0]).toBeCloseTo(0.7);
    expect(o.scale[1]).toBeCloseTo(1.3);
  });
  it("keeps sizes fixed without variety", () => {
    expect(scatterOptions({ ...on, variety: 0 }, 48).scale).toEqual([1, 1]);
  });
  it("allows any turn when on, none when off", () => {
    expect(scatterOptions(on, 48).turn).toBe(180);
    expect(scatterOptions({ ...on, turn: false }, 48).turn).toBe(0);
  });
});

describe("the turn each picture allows", () => {
  it("is none for trees, any for rocks, and none for the picked picture of no kind", () => {
    const turns = (kind: string) =>
      new Set(scatterPool({ ...on, kind }, oak, "ai-gen").map((p) => p.turn));
    expect(turns("trees")).toEqual(new Set([0]));
    expect(turns("rocks")).toEqual(new Set([180]));
    expect(scatterPool(on, oak, "ai-gen")[0].turn).toBe(0);
    expect(
      scatterPool(
        on,
        { src: "/assets/ai-gen/boulders.webp", name: "B" },
        "ai-gen",
      )[0].turn,
    ).toBe(180);
  });
});

describe("a saved mix", () => {
  const mix = {
    id: "m1",
    name: "Wild edge",
    items: [
      { src: "/assets/ai-gen/tree-oak.webp", weight: 3 },
      { src: "/assets/ai-gen/boulders.webp", weight: 1 },
    ],
  };
  it("is the pool, weights and turns kept", () => {
    const pool = scatterPool({ ...on, kind: "mix:m1" }, undefined, "ai-gen", [
      mix,
    ]);
    expect(pool.map((p) => [p.sprite.src, p.weight, p.turn])).toEqual([
      ["/assets/ai-gen/tree-oak.webp", 3, 0],
      ["/assets/ai-gen/boulders.webp", 1, 180],
    ]);
  });
  it("falls back to the picked picture when it is gone", () => {
    expect(
      scatterPool({ ...on, kind: "mix:gone" }, oak, "ai-gen", [mix]),
    ).toEqual([{ sprite: oak, turn: 0 }]);
  });
});
