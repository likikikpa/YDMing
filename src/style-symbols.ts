import { resolveStyle } from "./map-styles";
import type { StampKind } from "./types";

/** The symbol pictures of a pack made like Hand-inked (see `style-decor-inked.ts`). */
const settlements = (pack: string): Partial<Record<StampKind, string[]>> => {
  const hi = (...names: string[]) =>
    names.map((n) => `/assets/${pack}/${n}.webp`);
  return {
    city: hi("cathedral", "townhouse"),
    village: hi("cottage-thatch", "house-tile", "farmhouse"),
    house: hi("cottage-thatch", "house-tile"),
    tavern: hi("inn"),
    temple: hi("church"),
    castle: hi("castle", "keep"),
    tower: hi("tower-round", "watchtower"),
  };
};

/**
 * The pictures a style draws for the built-in map symbols (a village, a
 * castle ...) in place of the Kenney line glyphs. A kind may have several, and
 * each symbol keeps the one its id picks, so the same map always looks alike.
 * Kinds missing here keep the glyph.
 */
const SYMBOLS: Record<string, Partial<Record<StampKind, string[]>>> = {
  drawn: settlements("hand-inked"),
  pen: settlements("pen-ink"),
};

/** How large these pictures are drawn compared with the box a symbol stands in. */
export const STYLE_SYMBOL_SCALE = 2.3;

/** A small stable number from an id. */
function hash(id: string) {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++)
    h = Math.imul(h ^ id.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** The style's own picture for a symbol of this kind, if it has one. */
export function styleSymbol(style: string, kind: string, id: string) {
  const list = SYMBOLS[resolveStyle(style)]?.[kind as StampKind];
  return list?.length ? list[hash(id) % list.length] : undefined;
}

/** Every symbol picture a style uses, to load before the first draw. */
export const styleSymbolUrls = (style: string): string[] => [
  ...new Set(Object.values(SYMBOLS[resolveStyle(style)] ?? {}).flat()),
];
