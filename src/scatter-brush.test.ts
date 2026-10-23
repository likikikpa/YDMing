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
    expect(scatterPool(on, oak, "ai-gen")).toEqual([{ sprite: oak }]);
  });
  it("scatters a whole kind of the open collection", () => {
    const pool = scatterPool({ ...on, kind: "trees" }, oak, "ai-gen");
    expect(pool.length).toBeGreaterThan(10);
  });
  it("falls back to the picked picture when the collection lacks the kind", () => {
    expect(scatterPool({ ...on, kind: "trees" }, oak, "gosbell")).toEqual([
      { sprite: oak },
    ]);
  });
  it("is empty with nothing picked", () => {
    expect(scatterPool(on, undefined, "gosbell")).toEqual([]);
  });
});

describe("scatterOptions", () => {
  const trees = scatterPool({ ...on, kind: "trees" }, oak, "ai-gen"),
    rocks = scatterPool({ ...on, kind: "rocks" }, oak, "ai-gen");
  it("turns the percentages into fractions", () => {
    const o = scatterOptions(on, 48, trees);
    expect(o).toMatchObject({ radius: 80, size: 48, density: 0.4, tint: 0.3 });
    expect(o.scale[0]).toBeCloseTo(0.7);
    expect(o.scale[1]).toBeCloseTo(1.3);
  });
  it("keeps sizes fixed without variety", () => {
    expect(scatterOptions({ ...on, variety: 0 }, 48, trees).scale).toEqual([
      1, 1,
    ]);
  });
  it("turns only as far as the kind allows, and not when off", () => {
    expect(scatterOptions(on, 48, trees).turn).toBe(0);
    expect(scatterOptions(on, 48, rocks).turn).toBe(180);
    expect(scatterOptions({ ...on, turn: false }, 48, rocks).turn).toBe(0);
  });
});
