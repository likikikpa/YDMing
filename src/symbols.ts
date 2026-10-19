import { loadImage } from "./render";
import type { StampKind } from "./types";

const PACK = "/assets/cartography/";
const file = (name: string) => `${PACK}${name}.png`;

/**
 * Hand-inked Kenney sprites that stand in for the built-in map symbol kinds.
 * Kinds without an entry (doors, traps, stairs, pillars) keep their drawn
 * dungeon markers.
 */
export const SYMBOL_SPRITES: Partial<Record<StampKind, string>> = {
  city: file("castleWide"),
  castle: file("castleTall"),
  village: file("houseChimney"),
  house: file("house"),
  tavern: file("houseTall"),
  temple: file("church"),
  tower: file("tower"),
  well: file("well"),
  dungeon: file("mine"),
  chest: file("chest"),
  mountain: file("rocksMountain"),
  hill: file("rocksA"),
  rock: file("rocks"),
  tree: file("treeTall"),
  pine: file("treePine"),
};
/** Sprites have empty margins, so they are drawn larger than the box they stand in. */
export const SYMBOL_SCALE = 1.9;

/** Terrain symbols scattered over generated world maps. */
export const DECOR_SPRITES = {
  mountain: [file("rocksMountain"), file("rocksTall"), file("rocksA"), file("rocksMountain")],
  peak: [file("vulcano")],
  pine: [file("treePine"), file("treePineTall"), file("treePineLarge"), file("treePines")],
  forest: [file("treeTall"), file("treePine"), file("treePines"), file("treeTall")],
  jungle: [file("palm"), file("palmLarge"), file("treeTall")],
  desert: [file("cactus"), file("cactusLarge"), file("rocksB")],
  savanna: [file("bush"), file("treeTall"), file("bush")],
} as const;

/** Every bundled sprite the renderer needs, so the first frame already shows them. */
export function symbolUrls() {
  return [
    ...new Set([
      ...Object.values(SYMBOL_SPRITES),
      ...Object.values(DECOR_SPRITES).flat(),
    ]),
  ];
}
export async function preloadSymbols() {
  await Promise.allSettled(symbolUrls().map((url) => loadImage(url)));
}
/** Sprites that read as vegetation and should be scattered when dragging. */
export const isScatterSprite = (src: string) =>
  /\/(tree|palm|bush|cactus)/i.test(src);
