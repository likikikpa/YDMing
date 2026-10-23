import { Biome } from "./biomes";
import type { TexturePattern } from "./types";

/**
 * How a biome's own ground is made in a style without a photo for it. The
 * ground borrows the scale, strength and tiling of the built-in layer named
 * `base`, so the layer's settings still steer it, and is drawn with `pattern`
 * in the biome's colour from the style's palette.
 */
export interface BiomeGround {
  base: "grass" | "dirt" | "sand" | "rock" | "snow";
  pattern: TexturePattern;
}

/**
 * The biomes that have a ground of their own. The rest (snow, rock, beach, dirt
 * and grassland) are drawn with the built-in layer of that name, and the sea
 * with the water layers; the coral reef is drawn over shallow water (see
 * `reefGround`) and on land is bare sand.
 */
export const BIOME_GROUNDS: Partial<Record<number, BiomeGround>> = {
  [Biome.Tundra]: { base: "dirt", pattern: "dirt" },
  [Biome.Taiga]: { base: "grass", pattern: "grass" },
  [Biome.Forest]: { base: "grass", pattern: "grass" },
  [Biome.Swamp]: { base: "grass", pattern: "mud" },
  [Biome.Desert]: { base: "sand", pattern: "sand" },
  [Biome.Savanna]: { base: "grass", pattern: "grass" },
  [Biome.Jungle]: { base: "grass", pattern: "grass" },
  [Biome.Badlands]: { base: "dirt", pattern: "rock" },
  [Biome.Glacier]: { base: "snow", pattern: "snow" },
  [Biome.Steppe]: { base: "grass", pattern: "grass" },
  [Biome.Moorland]: { base: "grass", pattern: "dirt" },
  [Biome.AutumnWoods]: { base: "grass", pattern: "grass" },
  [Biome.Volcanic]: { base: "rock", pattern: "lava" },
  [Biome.Blighted]: { base: "dirt", pattern: "mud" },
  [Biome.Mangrove]: { base: "grass", pattern: "mud" },
};
