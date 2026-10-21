const cache = new WeakMap<readonly string[], Set<string>>();

/**
 * The ids as a set, for asking "is this one selected?" of every object on a
 * map. `ids.includes(o.id)` per object is quadratic: with 20,000 stamps
 * selected, each render and each overlay redraw took seconds. The set is kept
 * per array, so the selection's array is turned into a set once.
 */
export function idSet(ids: readonly string[]): Set<string> {
  let set = cache.get(ids);
  if (!set) {
    set = new Set(ids);
    cache.set(ids, set);
  }
  return set;
}
