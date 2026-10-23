/**
 * Biome names by id. Saved maps store the id of each painted cell, so an id
 * keeps its meaning for good: new biomes are only ever added at the end.
 */
export const BIOME_NAMES = [
  "Auto",
  "Snow",
  "Rock",
  "Tundra",
  "Taiga",
  "Grassland",
  "Forest",
  "Swamp",
  "Desert",
  "Savanna",
  "Jungle",
  "Beach",
  "Sea",
  "Dirt",
  "Badlands",
  "Glacier",
  "Steppe",
  "Moorland",
  "Autumn woods",
  "Volcanic",
  "Blighted",
  "Mangrove",
  "Coral reef",
];

/** The ids the generator and the brush know by name. */
export const Biome = {
  Snow: 1,
  Rock: 2,
  Tundra: 3,
  Taiga: 4,
  Grassland: 5,
  Forest: 6,
  Swamp: 7,
  Desert: 8,
  Savanna: 9,
  Jungle: 10,
  Beach: 11,
  Sea: 12,
  Dirt: 13,
  Badlands: 14,
  Glacier: 15,
  Steppe: 16,
  Moorland: 17,
  AutumnWoods: 18,
  Volcanic: 19,
  Blighted: 20,
  Mangrove: 21,
  CoralReef: 22,
} as const;

/** The highest biome id; saved maps may hold any id from 0 to this. */
export const MAX_BIOME = BIOME_NAMES.length - 1;

/** The first biome the generator never places: these are painted by hand. */
export const FIRST_PAINTED_ONLY = Biome.Badlands;
