import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { poolIndex } from "./decor";
import { decorSetFor } from "./style-decor";
import { fantasyPalette, GREEN_BIOMES } from "./style-palettes";
import { BIOMES } from "./generator";

describe("style decoration sets", () => {
  it("draws the inked symbols in the styles that have no pictures of their own", () => {
    for (const style of ["parchment", "atlas", "nonsense", undefined])
      expect(decorSetFor(style as string).trimmed).toBe(false);
  });

  it("draws Painted fantasy, and maps saved as Painted, with the painted set", () => {
    expect(decorSetFor("fantasy").trimmed).toBe(true);
    expect(decorSetFor("painted")).toBe(decorSetFor("fantasy"));
  });

  it("names only pictures that ship with the app, for every kind", () => {
    const set = decorSetFor("fantasy");
    for (const [kind, pool] of Object.entries(set.pools)) {
      expect(pool.length, kind).toBeGreaterThan(0);
      for (const url of pool)
        expect(existsSync(join("public", url)), url).toBe(true);
    }
  });

  it("sizes every kind", () => {
    const set = decorSetFor("fantasy");
    for (const kind of Object.keys(set.pools))
      expect(set.scale[kind as keyof typeof set.scale]).toBeGreaterThan(0);
  });
});

describe("Painted fantasy palette", () => {
  it("has a colour for every biome", () => {
    expect(fantasyPalette).toHaveLength(BIOMES.length);
    for (const rgb of fantasyPalette) {
      expect(rgb).toHaveLength(3);
      for (const c of rgb) expect(c >= 0 && c <= 255).toBe(true);
    }
  });

  it("gives every green biome the same grass", () => {
    for (const b of GREEN_BIOMES)
      expect(fantasyPalette[b]).toEqual(fantasyPalette[6]);
  });
});

describe("choosing a picture for a decoration spot", () => {
  const reached = (kind: "forest" | "savanna" | "desert", length: number) => {
    const picks = new Set<number>();
    // Candidates are the spots whose index is a multiple of 3; desert and
    // savanna keep only those that are also a multiple of 9.
    for (let n = 0; n < 900; n += 3)
      if (kind === "forest" || n % 9 === 0)
        picks.add(poolIndex(n, kind, length));
    return picks;
  };

  it("reaches every picture of a three-picture savanna pool", () => {
    expect([...reached("savanna", 3)].sort()).toEqual([0, 1, 2]);
  });

  it("reaches every picture of a desert pool, and of a forest pool", () => {
    expect(reached("desert", 5).size).toBe(5);
    expect(reached("forest", 6).size).toBe(6);
  });

  it("never picks outside the pool", () => {
    for (let n = 0; n < 5000; n++)
      expect(poolIndex(n, "savanna", 3)).toBeLessThan(3);
  });
});
