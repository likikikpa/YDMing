import type { Layer } from "./types";

/** Terrain is the ground everything sits on and Grid is a guide, so neither moves. */
export const PINNED_LAYERS = ["Terrain", "Grid"];
export const isMovable = (layer: Layer) => !PINNED_LAYERS.includes(layer.id);

/**
 * Moves a layer one step in the drawing order, skipping pinned layers.
 * `dir` 1 draws it later (higher in the list), -1 earlier. Returns whether it moved.
 */
export function moveLayer(layers: Layer[], id: string, dir: 1 | -1) {
  const from = layers.findIndex((l) => l.id === id);
  if (from < 0 || !isMovable(layers[from])) return false;
  let to = from + dir;
  while (to >= 0 && to < layers.length && !isMovable(layers[to])) to += dir;
  if (to < 0 || to >= layers.length) return false;
  [layers[from], layers[to]] = [layers[to], layers[from]];
  return true;
}

/** Puts layer `id` where `target` is now, shifting the layers between them. Returns whether it moved. */
export function placeLayer(layers: Layer[], id: string, target: string) {
  const from = layers.findIndex((l) => l.id === id),
    to = layers.findIndex((l) => l.id === target);
  if (from < 0 || to < 0 || from === to) return false;
  if (!isMovable(layers[from]) || !isMovable(layers[to])) return false;
  const [layer] = layers.splice(from, 1);
  layers.splice(to, 0, layer);
  return true;
}
