import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { poolIndex } from "./decor-spots";
import { coastLines } from "./style-coast";
import { decorSetFor } from "./style-decor";
import {
  fantasyPalette,
  GREEN_BIOMES,
  SHALLOW_WATER_COLOUR,
} from "./style-palettes";
import { BIOMES } from "./generator";

describe("style decoration sets", () => {
  it("draws the inked symbols in Old ink and maps saved as Parchment", () => {
    for (const style of ["ink", "parchment"])
      expect(decorSetFor(style).trimmed).toBe(false);
  });

  it("draws Atlas maps, and unknown or missing styles, with the painted set", () => {
    for (const style of ["atlas", "nonsense", undefined])
      expect(decorSetFor(style as string)).toBe(decorSetFor("fantasy"));
  });

  it("scatters nothing in Realistic, which draws woods and mountains as ground", () => {
    const set = decorSetFor("realistic");
    expect(set.none).toBe(true);
    for (const pool of Object.values(set.pools)) expect(pool).toHaveLength(0);
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
    expect(fantasyPalette.length).toBeGreaterThanOrEqual(BIOMES.length);
    for (const rgb of fantasyPalette) {
      expect(rgb).toHaveLength(3);
      for (const c of rgb) expect(c >= 0 && c <= 255).toBe(true);
    }
  });

  it("makes shallow water lighter than the sea beside it", () => {
    const sum = (rgb: number[]) => rgb[0] + rgb[1] + rgb[2];
    expect(sum(fantasyPalette[SHALLOW_WATER_COLOUR])).toBeGreaterThan(
      sum(fantasyPalette[12]),
    );
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

describe("coast lines", () => {
  it("draw the shore first and ripples further out, in every style", () => {
    for (const style of ["ink", "parchment", "atlas", "fantasy", "painted"]) {
      const lines = coastLines(style);
      expect(lines[0].offset).toBe(0);
      for (let i = 1; i < lines.length; i++)
        expect(lines[i].offset).toBeLessThan(lines[i - 1].offset);
    }
  });

  it("give retired styles the lines of their replacement", () => {
    expect(coastLines("atlas")).toBe(coastLines("fantasy"));
    expect(coastLines("painted")).toBe(coastLines("fantasy"));
    expect(coastLines("parchment")).toBe(coastLines("ink"));
  });

  it("draws Old ink's shore heavier than its water lines, which fade out to sea", () => {
    const lines = coastLines("ink");
    expect(lines.length).toBeGreaterThan(3);
    expect(lines[0].width).toBeGreaterThan(lines[1].width);
    const alpha = (c: string) => parseInt(c.slice(7, 9), 16);
    for (let i = 2; i < lines.length; i++)
      expect(alpha(lines[i].colour)).toBeLessThan(alpha(lines[i - 1].colour));
  });
});
