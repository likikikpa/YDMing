import { resolveStyle } from "./map-styles";

/** Biomes whose ground is the one shared grass colour; they differ in what grows on them. */
export const GREEN_BIOMES = [4, 5, 7, 9, 10];

/**
 * Palette index of the colour of shallow water. Palettes that stop at the
 * biomes use the sea colour for it, so their shallows are as dark as the deep.
 */
export const SHALLOW_WATER_COLOUR = 14;

/**
 * Old ink: ground colour per biome. Everything is paper: land a little lighter
 * than the sea, with warmer desert and dirt; the drawing does the rest.
 */
export const inkPalette: number[][] = [
  [238, 226, 196],
  [247, 242, 226],
  [208, 195, 162],
  [227, 217, 184],
  [233, 222, 188],
  [233, 222, 188],
  [233, 222, 188],
  [233, 222, 188],
  [236, 216, 162],
  [233, 222, 188],
  [233, 222, 188],
  [241, 231, 202],
  [216, 202, 167],
  [214, 196, 154],
  [227, 215, 181],
];

/**
 * Realistic: natural ground colours per biome, a deep blue sea and pale turquoise
 * shallows. Photo tiles cover the built-in grounds; these colours are for water
 * and for any layer without a photo, such as one still loading.
 */
export const realisticPalette: number[][] = [
  [124, 140, 84],
  [238, 243, 247],
  [124, 118, 108],
  [148, 150, 122],
  [64, 92, 62],
  [104, 134, 70],
  [58, 86, 48],
  [84, 100, 72],
  [208, 180, 130],
  [168, 160, 94],
  [44, 94, 54],
  [216, 202, 162],
  [30, 82, 124],
  [134, 106, 78],
  [66, 158, 166],
];

/**
 * How strongly a style lets the ground tiles show, relative to the layer's own
 * strength. Old ink keeps the paper calm so the line work reads.
 */
export const groundContrast = (style: string) =>
  resolveStyle(style) === "ink" ? 0.35 : 1;

/**
 * Painted fantasy: ground colour per biome (the index is the biome id, see
 * `BIOMES`). Bright yellow-green grass, warm sand and a clear teal sea.
 */
export const fantasyPalette: number[][] = [
  [240, 240, 228],
  [244, 247, 246],
  [142, 138, 124],
  [178, 190, 152],
  [108, 150, 80],
  [108, 150, 80],
  [108, 150, 80],
  [108, 150, 80],
  [219, 189, 118],
  [108, 150, 80],
  [108, 150, 80],
  [234, 220, 168],
  [58, 124, 152],
  [178, 138, 92],
  [112, 192, 194],
];
