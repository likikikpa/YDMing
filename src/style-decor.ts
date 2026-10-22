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
}

const AI = "/assets/ai-gen/";
const ai = (...names: string[]) => names.map((n) => `${AI}${n}.webp`);

/**
 * The hand-inked Kenney symbols that every style drew before styles had their
 * own. Built on first use: this file and `symbols.ts` sit in an import cycle
 * through `render.ts`, so `DECOR_SPRITES` may not exist while this loads.
 */
let inked: DecorSet | undefined;
const inkedSet = (): DecorSet =>
  (inked ??= {
    pools: DECOR_SPRITES,
    trimmed: false,
    scale: {
      mountain: 1,
      peak: 1,
      pine: 1,
      forest: 1,
      jungle: 1,
      desert: 1,
      savanna: 1,
    },
  });

/** Old ink: the same glyphs, with woods drawn as thinned clumps of them. */
let ink: DecorSet | undefined;
const inkSet = (): DecorSet =>
  (ink ??= { ...inkedSet(), canopy: { clump: 70, open: 0.42, every: 2 } });

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
  },
  canopy: { clump: 70, open: 0.38 },
};

/** The decoration set a map style draws with. */
export const decorSetFor = (style: string): DecorSet => {
  const id = resolveStyle(style);
  return id === "fantasy" ? PAINTED : id === "ink" ? inkSet() : inkedSet();
};

/**
 * Loads the pictures a style needs. Resolves true when some were not loaded
 * yet, which means anything already drawn is missing them.
 */
export async function preloadDecor(style: string) {
  const set = decorSetFor(style);
  if (!set.trimmed) return false;
  const missing = [...new Set(Object.values(set.pools).flat())].filter(
    (url) => !imageCache.get(url)?.complete,
  );
  if (!missing.length) return false;
  const results = await Promise.allSettled(
    missing.map((url) => loadImage(url)),
  );
  return results.some((r) => r.status === "fulfilled");
}
