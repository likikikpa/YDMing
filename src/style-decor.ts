import type { Canopy } from "./canopy";
import { resolveStyle } from "./map-styles";
import { imageCache, loadImage } from "./render";
import { DECOR_SPRITES } from "./symbols";

/** What a world map scatters over its land: a kind of symbol per height and biome. */
export type DecorKind = keyof typeof DECOR_SPRITES;

/** The pictures a map style scatters over the land, and how they are drawn. */
export interface DecorSet {
  pools: Record<DecorKind, readonly string[]>;
  /**
   * The pictures are cut to their drawing, so each is drawn at its own
   * proportions with its base on the spot. Otherwise they are square with
   * empty margins and drawn a little see-through.
   */
  trimmed: boolean;
  /** How large each kind is drawn, relative to the spot's size (trimmed sets). */
  scale: Record<DecorKind, number>;
  /** Woods as dense clumps; without it a wooded biome gets a lone tree now and then. */
  canopy?: Canopy;
  /** Nothing is scattered: the ground and relief carry the map. */
  none?: true;
}

const AI = "/assets/ai-gen/";
const ai = (...names: string[]) => names.map((n) => `${AI}${n}.webp`);

/** One value for every kind of decoration. */
const perKind = <T>(value: T): Record<DecorKind, T> => ({
  mountain: value,
  peak: value,
  pine: value,
  forest: value,
  jungle: value,
  desert: value,
  savanna: value,
  swamp: value,
  badlands: value,
  glacier: value,
  steppe: value,
  moor: value,
  autumn: value,
  volcanic: value,
  blight: value,
  mangrove: value,
});

/**
 * Old ink: the hand-inked Kenney symbols, with woods drawn as thinned clumps
 * of them. Built on first use: this file and `symbols.ts` sit in an import
 * cycle through `render.ts`, so `DECOR_SPRITES` may not exist while this loads.
 */
let ink: DecorSet | undefined;
const inkSet = (): DecorSet =>
  (ink ??= {
    pools: DECOR_SPRITES,
    trimmed: false,
    scale: perKind(1),
    canopy: { clump: 70, open: 0.42, every: 2 },
  });

const PAINTED: DecorSet = {
  pools: {
    mountain: ai(
      "peak-rocky",
      "peak-snow",
      "range-snow",
      "peak-rocky",
      "peak-snow",
      "ridge",
    ),
    peak: ai("volcano"),
    pine: ai("tree-pine", "tree-fir", "tree-spruce", "tree-spruce-wide"),
    forest: ai(
      "tree-oak",
      "tree-broadleaf",
      "tree-linden",
      "tree-birch",
      "tree-oak-wide",
      "tree-birch-tall",
    ),
    jungle: ai("tree-palm", "tree-broadleaf", "tree-willow", "tree-palm"),
    desert: ai("rocks", "boulders", "tree-dead", "butte", "range-desert"),
    savanna: ai("tree-acacia", "forest-bush", "tree-acacia"),
    swamp: ai(
      "tree-willow",
      "forest-bramble",
      "forest-bush",
      "tree-willow-bent",
    ),
    badlands: ai("butte", "mesa", "range-desert", "rocks", "boulders"),
    glacier: ai("range-snow", "peak-snow", "tree-snowy-fir", "tree-snowy-pine"),
    steppe: ai("forest-bush", "tree-acacia", "rocks", "forest-bush"),
    moor: ai("boulders", "forest-bramble", "hills", "rocks", "forest-bush"),
    autumn: ai(
      "tree-autumn",
      "tree-autumn-oak",
      "tree-autumn",
      "tree-birch-tall",
    ),
    volcanic: ai("crater", "rocks", "boulders", "volcano", "rocks"),
    blight: ai(
      "tree-dead",
      "tree-dead-old",
      "forest-dead",
      "tree-dead",
      "forest-roots",
    ),
    mangrove: ai(
      "tree-willow",
      "forest-roots",
      "tree-willow-bent",
      "tree-palm",
    ),
  },
  trimmed: true,
  scale: {
    mountain: 1,
    peak: 1,
    pine: 1.25,
    forest: 1.25,
    jungle: 1.3,
    desert: 1.2,
    savanna: 1.2,
    swamp: 1.2,
    badlands: 1.3,
    glacier: 1.1,
    steppe: 1.1,
    moor: 1.1,
    autumn: 1.25,
    volcanic: 1.4,
    blight: 1.25,
    mangrove: 1.25,
  },
  canopy: { clump: 70, open: 0.38 },
};

/** Realistic scatters nothing: woods and mountains come from the ground and its relief. */
const BARE: DecorSet = {
  pools: perKind([]),
  trimmed: false,
  scale: perKind(1),
  none: true,
};

/** The decoration set a map style draws with. */
export const decorSetFor = (style: string): DecorSet => {
  const id = resolveStyle(style);
  return id === "ink" ? inkSet() : id === "realistic" ? BARE : PAINTED;
};

/**
 * The kinds every map is likely to show, whose pictures are loaded up front.
 * The others (the biomes that are painted by hand) load when first drawn: see
 * `wantSprite`, so a map without them does not download their pictures.
 */
const COMMON_KINDS: DecorKind[] = [
  "mountain",
  "peak",
  "pine",
  "forest",
  "jungle",
  "desert",
  "savanna",
];

/**
 * Loads the pictures a style's common kinds need. Resolves true when some were
 * not loaded yet, which means anything already drawn is missing them.
 */
export async function preloadDecor(style: string) {
  const set = decorSetFor(style);
  if (!set.trimmed) return false;
  const missing = [
    ...new Set(COMMON_KINDS.flatMap((kind) => set.pools[kind])),
  ].filter((url) => !imageCache.get(url)?.complete);
  if (!missing.length) return false;
  const results = await Promise.allSettled(
    missing.map((url) => loadImage(url)),
  );
  return results.some((r) => r.status === "fulfilled");
}
