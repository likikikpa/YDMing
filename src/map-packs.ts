import { styleOf } from "./map-styles";
import { STAMP_PACKS } from "./packs";
import { packKinds } from "./scatter-kinds";
import type { Credit, MapData } from "./types";

/** The ids of stamps the generator placed, so a reroll can take them away again. */
export const GENERATED = "gen-";

/**
 * The collections the generator can fill land from: those with trees,
 * ranges, rocks or undergrowth. Dungeon dressing and city tiles have none.
 */
export const LAND_PACKS: readonly string[] = STAMP_PACKS.filter(
  (p) => packKinds(p.key).length > 0,
).map((p) => p.key);

/**
 * The collections a map's land is filled from: the ones chosen for it, or,
 * when none were ever chosen, its style's own (none for Realistic).
 */
export function mapPacks(settings: {
  style: string;
  stampPacks?: string[];
}): string[] {
  if (settings.stampPacks)
    return settings.stampPacks.filter((k) => LAND_PACKS.includes(k));
  const own = styleOf(settings).stampPack;
  return own ? [own] : [];
}

/** The credits the world needs for stamps from these collections. */
export const packCredits = (packs: readonly string[]): Credit[] =>
  STAMP_PACKS.filter((p) => p.attribution && packs.includes(p.key)).map(
    (p) => p.attribution!,
  );

/**
 * The seed a map's land stamps were placed with, read from their ids
 * (`gen-<seed>-<n>`), so placing them again from other collections keeps the
 * same spots. A reroll uses a new seed that the map's settings do not keep.
 */
export function detailSeed(map: MapData) {
  for (const o of map.objects)
    if (o.id.startsWith(GENERATED))
      return o.id.slice(GENERATED.length, o.id.lastIndexOf("-"));
  return map.settings.seed;
}
