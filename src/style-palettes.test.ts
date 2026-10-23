import { describe, expect, it } from "vitest";
import { BIOMES } from "./generator";
import { MAP_STYLES, PICKER_STYLES, resolveStyle } from "./map-styles";
import {
  groundContrast,
  inkPalette,
  SHALLOW_WATER_COLOUR,
} from "./style-palettes";

const sum = (rgb: number[]) => rgb[0] + rgb[1] + rgb[2];

describe("Old ink style", () => {
  it("is registered with the Kenney Cartography collection and offered in the picker", () => {
    expect(MAP_STYLES.ink).toMatchObject({
      label: "Old ink",
      stampPack: "cartography",
    });
    expect(PICKER_STYLES).toContain("ink");
    expect(resolveStyle("ink")).toBe("ink");
  });

  it("has a paper colour for every biome and for shallow water", () => {
    expect(inkPalette).toHaveLength(BIOMES.length + 1);
    expect(inkPalette.length).toBeGreaterThan(SHALLOW_WATER_COLOUR);
    for (const rgb of inkPalette) {
      expect(rgb).toHaveLength(3);
      for (const c of rgb) expect(c >= 0 && c <= 255).toBe(true);
    }
  });

  it("keeps every land biome close to the paper, only warmer, greyer or paler", () => {
    for (let b = 1; b < BIOMES.length; b++) {
      // Sea and shallows are the darker washes; every land biome stays within reach of the paper.
      if (b === 12) continue;
      for (let k = 0; k < 3; k++)
        expect(
          Math.abs(inkPalette[b][k] - inkPalette[6][k]),
          BIOMES[b],
        ).toBeLessThan(48);
    }
  });

  it("keeps the land lighter than the sea and the shallows lighter than the deep", () => {
    expect(sum(inkPalette[6])).toBeGreaterThan(sum(inkPalette[12]));
    expect(sum(inkPalette[SHALLOW_WATER_COLOUR])).toBeGreaterThan(
      sum(inkPalette[12]),
    );
  });

  it("is mostly one hue: no channel pulls far from the paper's warm order", () => {
    for (const rgb of inkPalette) {
      expect(rgb[0]).toBeGreaterThanOrEqual(rgb[1]);
      expect(rgb[1]).toBeGreaterThanOrEqual(rgb[2]);
    }
  });
});

describe("ground contrast", () => {
  it("is calmer on paper and untouched everywhere else", () => {
    expect(groundContrast("ink")).toBeLessThan(1);
    expect(groundContrast("parchment")).toBe(groundContrast("ink"));
    for (const style of ["fantasy", "painted", "atlas", "nonsense"])
      expect(groundContrast(style)).toBe(1);
  });
});
