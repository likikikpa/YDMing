import type { CellRect } from "../terrain-render";
import type { MapData, MapObject, StampKind, Tool } from "../types";

export interface BrushSettings {
  size: number;
  strength: number;
  opacity: number;
  hardness: number;
  color: string;
  biome: number;
  /** Texture layer id for the terrain paint tool; empty means back to the biome. */
  material: string;
  stamp: StampKind;
  /** A bundled sprite to place with the stamp tool; wins over `stamp`. */
  sprite?: { src: string; name: string };
  snap: boolean;
  pressure: boolean;
  layer: string;
  mask?: boolean;
}
export interface EditorHandle {
  fit: () => void;
  zoom: (factor: number) => void;
  exportCanvas: (player: boolean, scale: number) => HTMLCanvasElement;
  /** Draws the river made of the points placed so far, then clears them. */
  finishRiver: () => void;
  /** Throws away the river being placed. */
  cancelRiver: () => void;
  /** Removes the last point of the river being placed. */
  undoRiverPoint: () => void;
}
export interface EditorProps {
  map: MapData;
  tool: Tool;
  brush: BrushSettings;
  selected: string[];
  setSelected: (ids: string[]) => void;
  onChange: (map: MapData, label: string) => void;
  onOpen: (object: MapObject) => void;
  onColor: (color: string) => void;
  /** Reports how many points the river being placed has. */
  onRiverPoints?: (count: number) => void;
  contours: boolean;
  player: boolean;
  /** Changes whenever the project's texture layers were reloaded. */
  textureVersion?: number;
  onStatus: (status: {
    zoom: number;
    x: number;
    y: number;
    height: number;
    biome: number;
  }) => void;
}
export type View = { x: number; y: number; scale: number };
/** Map pixels that changed; a frame without one redraws the whole map. */
export type Area = { x: number; y: number; w: number; h: number };
export type Frame = {
  map: MapData;
  dirty?: CellRect;
  live?: string;
  area?: Area;
};
