import { mapPacks } from "./map-packs";
import {
  AMANZ_SYMBOL_SCALE,
  AMANZ_SYMBOL_SPRITES,
  SYMBOL_SCALE,
  SYMBOL_SPRITES,
} from "./symbols";
import type { MapData, StampKind } from "./types";

/** The pictures that stand in for the built-in symbol kinds (towns, castles, lairs). */
export interface SymbolSet {
  sprites: Partial<Record<StampKind, string>>;
  /** How much larger than its box a picture is drawn. */
  scale: number;
}

/**
 * The symbols a map draws its settlements and other built-in kinds with.
 * On a world they follow its stamp packs (`mapPacks`, its style's own until
 * some are chosen): Kenney's when Kenney Cartography is among them, else the
 * Map icons when those are, else the app's own drawn symbols. Towns and
 * dungeons have no choice of packs and keep Kenney's. Built on each call, since the
 * symbol tables sit in an import cycle with the renderer.
 */
export function symbolSetFor(
  map: Pick<MapData, "kind" | "settings">,
): SymbolSet {
  const kenney = { sprites: SYMBOL_SPRITES, scale: SYMBOL_SCALE };
  if (map.kind !== "world") return kenney;
  const packs = mapPacks(map.settings);
  if (packs.includes("cartography")) return kenney;
  if (packs.includes("amanz-lite"))
    return { sprites: AMANZ_SYMBOL_SPRITES, scale: AMANZ_SYMBOL_SCALE };
  return { sprites: {}, scale: 1 };
}
