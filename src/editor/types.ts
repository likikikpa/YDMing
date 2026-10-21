import type { StampSprite } from "../stamp-brush";
import type { CellRect } from "../terrain-render";
import type { MapData, MapObject, Point, StampKind, Tool } from "../types";

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
  /** A bundled sprite or one of My stamps to place with the stamp tool; wins over `stamp`. */
  sprite?: StampSprite;
  snap: boolean;
  pressure: boolean;
  layer: string;
  mask?: boolean;
  /** What the fog tool does; reveal when unset. */
  fog?: "reveal" | "hide" | "room";
}
export interface EditorHandle {
  fit: () => void;
  zoom: (factor: number) => void;
  /** `fog: false` leaves the fog of war out, for formats where the table software keeps its own. */
  exportCanvas: (
    player: boolean,
    scale: number,
    fog?: boolean,
  ) => HTMLCanvasElement;
  /** The map point in the middle of the view, kept inside the map. */
  viewCentre: () => Point;
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
  /** The world's imported pictures, for stamps that refer to one by `imageId`. */
  images?: Record<string, string>;
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
