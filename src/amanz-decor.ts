import type { DecorKind, DecorSet } from "./style-decor";

const icon = (...names: string[]) =>
  names.map((n) => `/assets/amanz-lite/${n}.png`);

/** How large each kind is drawn: ranges and plants each have their own size. */
const scale = (
  mountains: number,
  plants: number,
): Record<DecorKind, number> => ({
  mountain: mountains,
  peak: mountains,
  pine: plants,
  forest: plants,
  jungle: plants,
  desert: plants,
  savanna: plants,
  swamp: plants,
  badlands: mountains,
  glacier: mountains,
  steppe: plants,
  moor: plants,
  autumn: plants,
  volcanic: mountains,
  blight: plants,
  mangrove: plants,
});

/**
 * The Map icons (Amanz) silhouettes as a decoration set, for a world whose
 * chosen stamp packs hold them but not its style's own collection. They are
 * cut to their drawing, like the AI_GEN pictures.
 */
export const AMANZ_DECOR: DecorSet = {
  pools: {
    mountain: icon("mountain-3", "mountain-4", "mountain-5", "mountain-8"),
    peak: icon("mountain-6"),
    pine: icon("pine-1", "pine-3"),
    forest: icon("tree-1", "tree-4", "tree-5", "tree-6", "tree-7", "tree-8"),
    jungle: icon("tree-4", "tree-6", "tree-8", "bush"),
    desert: icon("cactus", "bush", "mountain-1"),
    savanna: icon("bush", "tree-5", "bush"),
    swamp: icon("bush", "tree-6", "bush"),
    badlands: icon("mountain-1", "mountain-2", "mountain-7"),
    glacier: icon("mountain-3", "mountain-5", "pine-1"),
    steppe: icon("bush", "mountain-1", "bush"),
    moor: icon("bush", "mountain-2", "bush"),
    autumn: icon("tree-1", "tree-7", "pine-3"),
    volcanic: icon("mountain-6", "mountain-4"),
    blight: icon("tree-5", "bush"),
    mangrove: icon("tree-6", "bush"),
  },
  trimmed: true,
  // Solid black silhouettes weigh far more than inked lines: drawn smaller,
  // with woods thinned to one tree in three spots.
  scale: scale(0.85, 0.7),
  canopy: { clump: 70, open: 0.45, every: 3 },
};
