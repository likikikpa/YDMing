import type { MapData } from "./types";

const same = (a: number[], b: number[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
};

/**
 * A copy of `map` with `change` applied, for the undo history. The copy is
 * deep, so the old map is never touched, but the ground arrays (`heights`,
 * `biomes`, `materials`) keep the old arrays when `change` left them alone.
 * The terrain texture is cached by the identity of those arrays, so a copy
 * with new arrays of the same numbers repaints the whole ground: typing one
 * letter of a label took 250 ms for that. A change that edits them, or
 * replaces them on purpose (`m.heights = m.heights.slice()` is how a change
 * asks for a repaint), still gets arrays of its own.
 */
export function editedCopy(
  map: MapData,
  change: (m: MapData) => void,
): MapData {
  const next = structuredClone(map);
  const { heights, biomes, materials } = next;
  change(next);
  if (next.heights === heights && same(heights, map.heights))
    next.heights = map.heights;
  if (next.biomes === biomes && same(biomes, map.biomes))
    next.biomes = map.biomes;
  if (
    next.materials !== undefined &&
    next.materials === materials &&
    map.materials &&
    same(next.materials, map.materials)
  )
    next.materials = map.materials;
  return next;
}
