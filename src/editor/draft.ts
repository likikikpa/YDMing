import { SCULPT_TOOLS } from "../sculpt";
import type { MapData, Tool } from "../types";

export const PAINT_TOOLS: Tool[] = [
  "brush",
  "pencil",
  "eraser",
  "line",
  "rectangle",
  "ellipse",
  "fill",
];
// Tools whose result rewrites the height field and therefore needs private copies.
export const TERRAIN_TOOLS: Tool[] = [
  ...SCULPT_TOOLS,
  "ridge",
  "island",
  "room",
];
/**
 * Copies only what a tool will change. Cloning every stroke and height of a
 * large map for each click made editing slow; shared arrays stay untouched.
 */
export function beginDraft(m: MapData, tool: Tool): MapData {
  const draft: MapData = {
    ...m,
    objects: m.objects.map((o) => ({ ...o })),
    paths: [...m.paths],
    strokes: [...m.strokes],
    rooms: m.rooms.map((r) => ({ ...r })),
    layers: m.layers.map((l) => ({
      ...l,
      mask: l.mask ? [...l.mask] : undefined,
    })),
  };
  if (TERRAIN_TOOLS.includes(tool)) {
    draft.heights = m.heights.slice();
    draft.biomes = m.biomes.slice();
    draft.materials = m.materials?.slice();
    draft.materialKeys = m.materialKeys?.slice();
    if (m.terrain)
      draft.terrain = {
        heights: m.terrain.heights.slice(),
        biomes: m.terrain.biomes.slice(),
        materials: m.terrain.materials?.slice(),
      };
  }
  return draft;
}

/** Whether the layer exists, is visible and is not locked. */
export const editable = (m: MapData, id: string) => {
  const l = m.layers.find((l) => l.id === id);
  return !!l && !l.locked && l.visible;
};
