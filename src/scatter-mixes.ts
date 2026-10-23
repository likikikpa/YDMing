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
      });
  }
  return out;
}

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
        i.weight <= MAX_MIX_WEIGHT,
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
    ? items.map((i) => (i.src === src ? { src, weight: w } : i))
    : items.length >= MAX_MIX_ITEMS
      ? [...items]
      : [...rest, { src, weight: w }];
}

/** The mixes with `mix` added, or replacing the one with its id. */
export const withMix = (mixes: readonly ScatterMix[], mix: ScatterMix) =>
  mixes.some((m) => m.id === mix.id)
    ? mixes.map((m) => (m.id === mix.id ? mix : m))
    : [...mixes, mix].slice(0, MAX_MIXES);
