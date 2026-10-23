import { describe, expect, it } from "vitest";
import { BIOME_DECOR } from "./biome-decor";
import { inClump, isWooded } from "./canopy";
import { decorSetFor } from "./style-decor";
import { DECOR_SPRITES } from "./symbols";

const canopy = decorSetFor("fantasy").canopy!;

describe("canopy", () => {
  it("is part of Painted fantasy, Old ink and the styles they replace", () => {
    expect(canopy).toBeDefined();
    expect(decorSetFor("painted").canopy).toBe(canopy);
    expect(decorSetFor("ink").canopy).toBeDefined();
    expect(decorSetFor("parchment").canopy).toBe(decorSetFor("ink").canopy);
    expect(decorSetFor("atlas").canopy).toBe(canopy);
    // Realistic draws its woods as ground, not as trees.
    expect(decorSetFor("realistic").canopy).toBeUndefined();
  });

  it("thins Old ink's woods, drawn with small glyphs, and leaves Painted fantasy's full", () => {
    expect(decorSetFor("ink").canopy!.every).toBeGreaterThan(1);
    expect(decorSetFor("fantasy").canopy!.every ?? 1).toBe(1);
  });

  it("draws Old ink with the inked glyphs, not the painted pictures", () => {
    expect(decorSetFor("ink").trimmed).toBe(false);
    expect(decorSetFor("ink").pools).toBe(DECOR_SPRITES);
  });

  it("grows in taiga, forest, jungle, autumn woods and mangrove and nowhere else", () => {
    expect([4, 6, 10, 18, 21].every(isWooded)).toBe(true);
    // Snow, rock, tundra, grassland, swamp, desert, savanna, beach, sea, dirt,
    // badlands, glacier, steppe, moorland, volcanic, blighted, coral reef.
    expect(
      [1, 2, 3, 5, 7, 8, 9, 11, 12, 13, 14, 15, 16, 17, 19, 20, 22].some(
        isWooded,
      ),
    ).toBe(false);
  });

  it("is drawn as a tree of its own kind in each wooded biome", () => {
    for (const b of [4, 6, 10, 18, 21])
      expect(BIOME_DECOR[b], String(b)).toBeDefined();
  });

  it("gives the same answer for the same spot and seed", () => {
    for (let i = 0; i < 50; i++) {
      const x = i * 13.7,
        y = i * 7.3;
      expect(inClump(canopy, x, y, 42)).toBe(inClump(canopy, x, y, 42));
    }
  });

  it("fills part of a wood, leaving clearings, in clumps rather than at random", () => {
    let inside = 0,
      same = 0,
      pairs = 0;
    const size = 120;
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const here = inClump(canopy, x * 4, y * 4, 7);
        if (here) inside++;
        // Neighbours 4 px apart agree far more often than coin flips would.
        if (x + 1 < size) {
          pairs++;
          if (here === inClump(canopy, (x + 1) * 4, y * 4, 7)) same++;
        }
      }
    const share = inside / (size * size);
    expect(share).toBeGreaterThan(0.35);
    expect(share).toBeLessThan(0.85);
    expect(same / pairs).toBeGreaterThan(0.9);
  });

  it("puts clumps in different places for different seeds", () => {
    let different = 0;
    for (let i = 0; i < 200; i++)
      if (inClump(canopy, i * 9, i * 5, 1) !== inClump(canopy, i * 9, i * 5, 2))
        different++;
    expect(different).toBeGreaterThan(20);
  });
});
