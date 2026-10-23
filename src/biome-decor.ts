import { Biome } from "./biomes";
import type { DecorKind } from "./style-decor";

/**
 * The kind of picture each biome grows over its land. Biomes missing here
 * (snow, rock, tundra, grassland, beach, dirt, the sea and the reef) are bare:
 * mountains stand on high ground whatever the biome.
 */
export const BIOME_DECOR: Partial<Record<number, DecorKind>> = {
  [Biome.Taiga]: "pine",
  [Biome.Forest]: "forest",
  [Biome.Jungle]: "jungle",
  [Biome.Swamp]: "swamp",
  [Biome.Desert]: "desert",
  [Biome.Savanna]: "savanna",
  [Biome.Badlands]: "badlands",
  [Biome.Glacier]: "glacier",
  [Biome.Steppe]: "steppe",
  [Biome.Moorland]: "moor",
  [Biome.AutumnWoods]: "autumn",
  [Biome.Volcanic]: "volcanic",
  [Biome.Blighted]: "blight",
  [Biome.Mangrove]: "mangrove",
};
