import type { DecorKind } from "./style-decor";
import type { MapData, MapObject } from "./types";

/**
 * Which picture of a pool a spot gets. Desert and savanna spots are only
 * those whose `n` is a multiple of 9, so dividing by 3 would give a pool of
 * three pictures just its first one every time.
 */
export const poolIndex = (n: number, kind: DecorKind, length: number) =>
  ((n / (kind === "desert" || kind === "savanna" ? 9 : 3)) | 0) % length;

const SETTLEMENTS = new Set(["city", "village", "castle", "dungeon"]);
/** Painted decoration keeps this far from a settlement's symbol, in map pixels. */
const CLEAR = 22;
const settlementCache = new WeakMap<MapObject[], MapObject[]>();
/** The map's towns and cities, looked up once per list of objects, however many stamps it has. */
export function settlements(map: MapData) {
  let found = settlementCache.get(map.objects);
  if (!found) {
    found = map.objects.filter((o) => SETTLEMENTS.has(o.kind));
    settlementCache.set(map.objects, found);
  }
  return found;
}

/** Whether a spot is too close to one of these settlements to carry decoration. */
export const nearTown = (towns: MapObject[], x: number, y: number) =>
  towns.some((o) => Math.hypot(o.x - x, o.y - y) < CLEAR);
