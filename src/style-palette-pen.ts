/**
 * Pen & ink: ground per biome (the index is the biome id, see `BIOMES`).
 * Paper white and neutral greys only, so a map prints the same on a black and
 * white printer as on screen: the sea is blank paper, land and the rougher
 * grounds differ by a few levels of grey, and the drawing does the rest.
 */
export const penPalette: number[][] = [
  255, // auto
  255, // snow
  232, // rock
  250, // tundra
  247, // taiga
  252, // grassland
  250, // forest
  244, // swamp
  252, // desert
  250, // savanna
  247, // jungle
  255, // beach
  255, // sea
  238, // dirt
  240, // badlands
  255, // glacier
  250, // steppe
  244, // moorland
  250, // autumn woods
  214, // volcanic
  232, // blighted
  244, // mangrove
  246, // coral reef
  255, // shallow water
].map((v) => [v, v, v]);
