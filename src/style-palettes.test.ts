import { describe, expect, it } from "vitest";
import { BIOMES } from "./generator";
import { MAP_STYLES, PICKER_STYLES, resolveStyle } from "./map-styles";
import {
  GREEN_BIOMES,
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
    expect(inkPalette.length).toBeGreaterThan(SHALLOW_WATER_COLOUR);
    expect(inkPalette.length).toBeGreaterThanOrEqual(BIOMES.length);
    for (const rgb of inkPalette) {
      expect(rgb).toHaveLength(3);
      for (const c of rgb) expect(c >= 0 && c <= 255).toBe(true);
    }
  });

  it("gives every green biome the same paper", () => {
    for (const b of GREEN_BIOMES) expect(inkPalette[b]).toEqual(inkPalette[6]);
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
    for (const style of ["fantasy", "painted", "parchment", "atlas"])
      expect(groundContrast(style)).toBe(1);
  });
});
