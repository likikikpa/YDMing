import { MAX_BIOME } from "./biomes";
import { isBundledSprite } from "./bundled-assets";
import { PACK_STAMPS } from "./packs";
import { kindOf, packSprite } from "./scatter-kinds";
import type { ScatterPicture } from "./scatter";
import type { ScatterMix, ScatterMixItem } from "./types";

/** The most mixes a world keeps, pictures a mix holds, and weight one picture has. */
export const MAX_MIXES = 50;
export const MAX_MIX_ITEMS = 120;
export const MAX_MIX_WEIGHT = 10;

const PREFIX = "mix:";

/** The scatter settings' `kind` that picks a mix. */
export const mixKey = (id: string) => PREFIX + id;

/** The id of the mix a `kind` picks, if it picks one. */
export const mixIdOf = (kind: string) =>
  kind.startsWith(PREFIX) ? kind.slice(PREFIX.length) : undefined;

let bySrc: Map<string, (typeof PACK_STAMPS)[number]> | undefined;

/** The pictures of a mix that are still in the Library, weighted. */
export function mixPictures(mix: ScatterMix): ScatterPicture[] {
  bySrc ??= new Map(PACK_STAMPS.map((a) => [a.src, a]));
  const out: ScatterPicture[] = [];
  for (const item of mix.items) {
    const stamp = bySrc.get(item.src);
    if (stamp)
      out.push({
        sprite: packSprite(stamp),
        weight: item.weight,
        turn: kindOf(stamp.src)?.turn ?? 0,
        ...(item.biomes && { biomes: item.biomes }),
      });
  }
  return out;
}

/** A non-empty list of different biome ids that exist. */
const validBiomes = (list: unknown) =>
  Array.isArray(list) &&
  list.length > 0 &&
  list.length <= MAX_BIOME &&
  new Set(list).size === list.length &&
  list.every((b) => Number.isInteger(b) && b >= 1 && b <= MAX_BIOME);

/** Whether a stored value is a mix this version can use; saved files are checked with it. */
export function validMix(v: unknown): v is ScatterMix {
  const m = v as ScatterMix;
  return (
    !!m &&
    typeof m.id === "string" &&
    /^[\w-]{1,64}$/.test(m.id) &&
    typeof m.name === "string" &&
    m.name.length > 0 &&
    m.name.length <= 60 &&
    Array.isArray(m.items) &&
    m.items.length > 0 &&
    m.items.length <= MAX_MIX_ITEMS &&
    m.items.every(
      (i) =>
        !!i &&
        typeof i.src === "string" &&
        isBundledSprite(i.src) &&
        Number.isInteger(i.weight) &&
        i.weight >= 1 &&
        i.weight <= MAX_MIX_WEIGHT &&
        (i.biomes === undefined || validBiomes(i.biomes)),
    )
  );
}

/** The items with one picture's weight set; weight 0 takes it out. */
export function withWeight(
  items: readonly ScatterMixItem[],
  src: string,
  weight: number,
): ScatterMixItem[] {
  const w = Math.min(MAX_MIX_WEIGHT, Math.max(0, Math.round(weight)));
  const rest = items.filter((i) => i.src !== src);
  if (!w) return rest;
  return items.some((i) => i.src === src)
    ? items.map((i) => (i.src === src ? { ...i, weight: w } : i))
    : items.length >= MAX_MIX_ITEMS
      ? [...items]
      : [...rest, { src, weight: w }];
}

/** The items with the biomes one picture grows on set; `undefined` hands it back to the built-in rules. */
export const withBiomes = (
  items: readonly ScatterMixItem[],
  src: string,
  biomes: readonly number[] | undefined,
): ScatterMixItem[] =>
  items.map((i) => {
    if (i.src !== src) return i;
    const { biomes: _old, ...rest } = i;
    return biomes?.length ? { ...rest, biomes: [...biomes] } : rest;
  });

/** The mixes with `mix` added, or replacing the one with its id. */
export const withMix = (mixes: readonly ScatterMix[], mix: ScatterMix) =>
  mixes.some((m) => m.id === mix.id)
    ? mixes.map((m) => (m.id === mix.id ? mix : m))
    : [...mixes, mix].slice(0, MAX_MIXES);
