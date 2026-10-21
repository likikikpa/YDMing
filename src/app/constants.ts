import {
  Activity,
  Blend,
  Castle,
  Circle,
  CloudFog,
  Droplets,
  Eraser,
  Equal,
  Globe2,
  Grid2X2,
  Hand,
  Minus,
  Mountain,
  MountainSnow,
  MousePointer2,
  PaintRoller,
  Paintbrush,
  Pencil,
  Pipette,
  Route,
  Shovel,
  Sprout,
  Square,
  Trees,
  Type,
  Waves,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { FitSettings } from "../assets";
import type { Tool } from "../types";

export const HISTORY_LIMIT = 100;
export type Panel =
  | "generate"
  | "layers"
  | "library"
  | "history"
  | "tools"
  | "rooms";
export const toolInfo: Record<Tool, [string, LucideIcon, string]> = {
  select: ["Select", MousePointer2, "V"],
  hand: ["Pan", Hand, "H"],
  brush: ["Brush", Paintbrush, "B"],
  pencil: ["Pencil", Pencil, "N"],
  eraser: ["Eraser", Eraser, "E"],
  fill: ["Fill bucket", Droplets, "G"],
  line: ["Line", Minus, "L"],
  rectangle: ["Rectangle", Square, "U"],
  ellipse: ["Ellipse", Circle, "O"],
  text: ["Text", Type, "T"],
  eyedropper: ["Eyedropper", Pipette, "I"],
  raise: ["Raise terrain", Mountain, "A"],
  dig: ["Dig terrain", Shovel, "Q"],
  smooth: ["Smooth", Blend, "R"],
  flatten: ["Flatten", Equal, "F"],
  roughen: ["Roughen", Activity, "Y"],
  biome: ["Biome override", Sprout, "C"],
  terrain: ["Terrain paint", PaintRoller, ""],
  stamp: ["Place stamp", Trees, "S"],
  river: ["River", Waves, "W"],
  ridge: ["Mountain range", MountainSnow, "M"],
  island: ["Island", Globe2, "Z"],
  road: ["Road", Route, "K"],
  wall: ["Wall", Castle, "J"],
  room: ["Room", Grid2X2, "P"],
  fog: ["Fog of war", CloudFog, ""],
};
export const paintTools: Tool[] = [
  "brush",
  "pencil",
  "eraser",
  "fill",
  "line",
  "rectangle",
  "ellipse",
];
// Terrain tools ignore colour and layers, so those controls are hidden for them.
export const colourTools: Tool[] = [
  "brush",
  "pencil",
  "fill",
  "line",
  "rectangle",
  "ellipse",
  "text",
  "stamp",
];
export const layerTools: Tool[] = [...paintTools, "stamp"];
export const presetNames: Record<string, string> = {
  continents: "Continents",
  pangaea: "Pangaea",
  archipelago: "Archipelago",
  peninsula: "Peninsula",
  island: "Single island",
};
export const emptyFit: FitSettings = {
  removeBackground: false,
  tolerance: 18,
  trim: true,
  parchment: false,
  outline: false,
  shadow: false,
  posterize: false,
};

/** The left rail, grouped; the groups are separated by dividers. */
export const primaryTools: Tool[][] = [
  ["select", "hand"],
  ["brush", "rectangle", "text", "eyedropper"],
  ["raise", "dig", "smooth", "ridge", "terrain"],
  ["stamp", "river"],
  ["eraser", "fog"],
];

/** The dialogs that can be open. */
export type ModalName =
  | "new"
  | "worlds"
  | "export"
  | "credits"
  | "help"
  | "fit"
  | "resize";
