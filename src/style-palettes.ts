import { BIOME_NAMES } from "./biomes";
import { resolveStyle } from "./map-styles";
import type { LiveStyleId } from "./map-styles";
import type { TexturePattern } from "./types";

/**
 * Palette index of the colour of shallow water: the entry after the last
 * biome. Palettes that stop at the biomes use the sea colour for it, so their
 * shallows are as dark as the deep.
 */
export const SHALLOW_WATER_COLOUR = BIOME_NAMES.length;

/**
 * Old ink: ground colour per biome (the index is the biome id, see `BIOMES`).
 * Everything is paper: land a little lighter than the sea, with warmer desert,
 * dirt and badlands, greyer blight and volcanic ground; the drawing does the
 * rest.
 */
export const inkPalette: number[][] = [
  [238, 226, 196], // auto
  [247, 242, 226], // snow
  [208, 195, 162], // rock
  [227, 217, 184], // tundra
  [226, 221, 189], // taiga
  [233, 222, 188], // grassland
  [233, 222, 188], // forest
  [224, 218, 186], // swamp
  [236, 216, 162], // desert
  [238, 222, 176], // savanna
  [226, 222, 184], // jungle
  [241, 231, 202], // beach
  [216, 202, 167], // sea
  [214, 196, 154], // dirt
  [232, 206, 168], // badlands
  [241, 240, 232], // glacier
  [236, 224, 180], // steppe
  [226, 214, 186], // moorland
  [237, 216, 168], // autumn woods
  [200, 182, 156], // volcanic
  [214, 204, 186], // blighted
  [223, 219, 184], // mangrove
  [234, 212, 178], // coral reef
  [227, 215, 181], // shallow water
];

/**
 * Realistic: natural ground colours per biome, a deep blue sea and pale turquoise
 * shallows. Photo tiles cover the grounds; these colours are for water and for
 * any layer without a photo, such as one still loading.
 */
export const realisticPalette: number[][] = [
  [124, 140, 84], // auto
  [238, 243, 247], // snow
  [124, 118, 108], // rock
  [140, 146, 118], // tundra
  [52, 84, 66], // taiga
  [104, 134, 70], // grassland
  [58, 86, 48], // forest
  [74, 88, 56], // swamp
  [222, 190, 126], // desert
  [150, 152, 84], // savanna
  [40, 104, 52], // jungle
  [216, 202, 162], // beach
  [30, 82, 124], // sea
  [134, 106, 78], // dirt
  [170, 90, 58], // badlands
  [196, 222, 238], // glacier
  [182, 170, 110], // steppe
  [118, 100, 84], // moorland
  [150, 86, 38], // autumn woods
  [40, 32, 30], // volcanic
  [88, 74, 96], // blighted
  [50, 70, 58], // mangrove
  [226, 130, 120], // coral reef
  [66, 158, 166], // shallow water
];

/**
 * The colour a glowing pattern turns to in each style: molten rock is bright
 * orange, or a dark ink line on paper, and coral heads are pink, or ink dots.
 */
export const GLOW_COLOUR: Record<
  LiveStyleId,
  Partial<Record<TexturePattern, readonly [number, number, number]>>
> = {
  fantasy: { lava: [255, 128, 40], coral: [222, 140, 118] },
  ink: { lava: [96, 58, 40], coral: [150, 112, 84] },
  realistic: { lava: [255, 108, 28], coral: [196, 124, 92] },
};

/**
 * How strongly a style lets the ground tiles show, relative to the layer's own
 * strength. Old ink keeps the paper calm so the line work reads.
 */
export const groundContrast = (style: string) =>
  resolveStyle(style) === "ink" ? 0.35 : 1;

/**
 * Painted fantasy: ground colour per biome (the index is the biome id, see
 * `BIOMES`). Bright yellow-green grass, warm sand and a clear teal sea; each
 * green is its own: blue-green taiga, murky swamp, golden savanna, deep jungle.
 */
export const fantasyPalette: number[][] = [
  [240, 240, 228], // auto
  [244, 247, 246], // snow
  [142, 138, 124], // rock
  [178, 190, 152], // tundra
  [74, 120, 92], // taiga
  [108, 150, 80], // grassland
  [92, 138, 70], // forest
  [92, 118, 80], // swamp
  [219, 189, 118], // desert
  [162, 170, 90], // savanna
  [58, 140, 72], // jungle
  [234, 220, 168], // beach
  [58, 124, 152], // sea
  [178, 138, 92], // dirt
  [196, 108, 70], // badlands
  [200, 226, 240], // glacier
  [176, 176, 108], // steppe
  [124, 108, 112], // moorland
  [196, 128, 56], // autumn woods
  [70, 48, 44], // volcanic
  [112, 96, 124], // blighted
  [78, 104, 78], // mangrove
  [232, 140, 128], // coral reef
  [112, 192, 194], // shallow water
];
