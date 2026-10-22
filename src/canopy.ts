import { noise } from "./random";

/** Woods drawn as clumps of trees rather than lone ones. */
export interface Canopy {
  /** Width of a clump in map pixels. */
  clump: number;
  /** Where the noise falls below this the wood is open ground: higher means smaller, rarer clumps. */
  open: number;
  /** Only one decoration spot in this many may grow a tree; 1 or none for every spot. */
  every?: number;
}

/** Biomes that grow woods: taiga, forest and jungle. */
const WOODED = [4, 6, 10];
export const isWooded = (biome: number) => WOODED.includes(biome);

/** Whether a tree stands at this spot: woods thicken in clumps with clearings between them. */
export const inClump = (canopy: Canopy, x: number, y: number, seed: number) =>
  noise(x / canopy.clump, y / canopy.clump, seed) >= canopy.open;
