import type { DecorKind, DecorSet } from "./style-decor";

const KINDS: DecorKind[] = [
  "mountain",
  "peak",
  "pine",
  "forest",
  "jungle",
  "desert",
  "savanna",
  "swamp",
  "badlands",
  "glacier",
  "steppe",
  "moor",
  "autumn",
  "volcanic",
  "blight",
  "mangrove",
];

/**
 * The stamp set of a pack made like Hand-inked (same file names, in the folder
 * `public/assets/<pack>/`): Hand-drawn uses the coloured one, Pen & ink the
 * black and white one. Kinds the pack has no picture for yet (palms, cacti,
 * volcanoes) borrow its nearest neighbours.
 */
export function inkedSet(pack: string, shadow?: string): DecorSet {
  const hi = (...names: string[]) =>
    names.map((n) => `/assets/${pack}/${n}.webp`);
  const pools: Record<DecorKind, readonly string[]> = {
    mountain: hi(
      "peak-rocky",
      "peak-snow",
      "range-grey",
      "range-snow-twin",
      "peak-rocky",
      "peak-forested",
      "hills-brown",
    ),
    peak: hi("peak-rocky", "peak-spire"),
    pine: hi(
      "tree-spruce-slim",
      "tree-fir-broad",
      "tree-pine-tall",
      "tree-fir-young",
      "tree-spruce-dark",
      "tree-pine-bent",
    ),
    forest: hi(
      "tree-oak-big",
      "tree-birch",
      "tree-beech-broad",
      "tree-small",
      "tree-oak-big",
      "tree-small",
    ),
    jungle: hi("tree-oak-big", "tree-small", "tree-beech-broad"),
    desert: hi("boulders", "mesa", "tree-dead", "peak-spire"),
    savanna: hi("tree-small", "tree-beech-broad", "tree-small"),
    swamp: hi("tree-dead", "tree-small", "tree-dead"),
    badlands: hi("mesa", "boulders", "peak-spire", "peak-rocky"),
    glacier: hi("range-snow-twin", "peak-snow", "peak-snow"),
    steppe: hi("tree-small", "boulders", "hills-green"),
    moor: hi("boulders", "hills-green", "hills-chain", "tree-pine-bent"),
    autumn: hi("tree-autumn", "tree-birch", "tree-autumn"),
    volcanic: hi("peak-rocky", "boulders", "peak-spire"),
    blight: hi("tree-dead", "tree-dead", "boulders"),
    mangrove: hi("tree-small", "tree-dead", "tree-beech-broad"),
  };
  return {
    pools,
    trimmed: true,
    scale: Object.fromEntries(KINDS.map((k) => [k, 1.25])) as Record<
      DecorKind,
      number
    >,
    shadow,
    canopy: { clump: 70, open: 0.38 },
  };
}
