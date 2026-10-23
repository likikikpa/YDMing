import type { DecorKind } from "./style-decor";
import type { MapData, MapObject } from "./types";

/**
 * How sparse a kind is: only the spots whose `n` is a multiple of this carry
 * one. Every kind starts from the multiples of 3; sparser ones keep fewer.
 */
const STEP: Partial<Record<DecorKind, number>> = {
  desert: 9,
  savanna: 9,
  moor: 9,
  volcanic: 9,
  swamp: 6,
  glacier: 6,
  blight: 6,
  badlands: 12,
  steppe: 12,
};
export const decorStep = (kind: DecorKind) => STEP[kind] ?? 3;

/**
 * Which picture of a pool a spot gets. A sparse kind's spots are only the
 * multiples of its step, so dividing by 3 would give a pool of three pictures
 * just its first one every time.
 */
export const poolIndex = (n: number, kind: DecorKind, length: number) =>
  ((n / decorStep(kind)) | 0) % length;

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
