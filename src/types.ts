export type MapKind = "world" | "city" | "dungeon";
export type Tool =
  | "select"
  | "hand"
  | "raise"
  | "dig"
  | "smooth"
  | "flatten"
  | "roughen"
  | "biome"
  | "brush"
  | "pencil"
  | "eraser"
  | "fill"
  | "line"
  | "rectangle"
  | "ellipse"
  | "text"
  | "stamp"
  | "river"
  | "ridge"
  | "island"
  | "road"
  | "wall"
  | "room"
  | "eyedropper";
export type StampKind =
  | "tree"
  | "pine"
  | "mountain"
  | "hill"
  | "city"
  | "village"
  | "castle"
  | "dungeon"
  | "tavern"
  | "temple"
  | "house"
  | "tower"
  | "chest"
  | "door"
  | "secret"
  | "trap"
  | "stairs"
  | "pillar"
  | "rock"
  | "well"
  | "image";
export interface Point {
  x: number;
  y: number;
}
export interface MapObject extends Point {
  id: string;
  kind: StampKind | "label";
  name: string;
  width: number;
  height: number;
  rotation: number;
  layer: string;
  color: string;
  flipX?: boolean;
  flipY?: boolean;
  group?: string;
  linkedMap?: string;
  owner?: string;
  notes?: string;
  image?: string;
  creditId?: string;
}
export interface MapPath {
  id: string;
  points: Point[];
  kind: "river" | "road" | "wall" | "corridor" | "border";
  width: number;
  layer: string;
}
export interface Stroke {
  id: string;
  points: Point[];
  tool:
    "brush" | "pencil" | "eraser" | "line" | "rectangle" | "ellipse" | "fill";
  color: string;
  size: number;
  opacity: number;
  hardness: number;
  layer: string;
}
export interface Room {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  number: number;
  type: string;
  description: string;
  monster?: string;
  item?: string;
}
export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  opacity: number;
  blend: GlobalCompositeOperation;
  mask?: Stroke[];
}
export interface GeneratorSettings {
  seed: string;
  template: string;
  land: number;
  mountains: number;
  roughness: number;
  seaLevel: number;
  temperature: number;
  rainfall: number;
  rivers: number;
  cities: number;
  style: "parchment" | "atlas" | "painted";
  citySize: string;
  defense: string;
  site: string;
  layout: string;
  level: number;
  party: number;
  theme: string;
  dungeonSize: number;
  density: number;
  roomSize: number;
  corridors: string;
  doors: string;
  grid: "square" | "hex" | "none";
  latitude: number;
  wind: string;
  lakes: number;
  kingdoms: number;
  towns: number;
  villages: number;
  dungeons: number;
  irregular: boolean;
  deadEnds: string;
  entrances: number;
  stairs: boolean;
}
export interface TerrainData {
  heights: number[];
  biomes: number[];
}
export interface MapData {
  id: string;
  name: string;
  kind: MapKind;
  width: number;
  height: number;
  cols: number;
  rows: number;
  heights: number[];
  biomes: number[];
  objects: MapObject[];
  paths: MapPath[];
  strokes: Stroke[];
  rooms: Room[];
  layers: Layer[];
  settings: GeneratorSettings;
  terrain?: TerrainData;
  parentId?: string;
  parentPosition?: Point;
}
export interface Credit {
  id: string;
  name: string;
  author: string;
  license: string;
  url: string;
}
export interface Project {
  version: 1;
  id: string;
  name: string;
  maps: MapData[];
  activeMapId: string;
  credits: Credit[];
  commercial: boolean;
  updatedAt: string;
}
export interface SrdEntry {
  key: string;
  name: string;
  kind: "monster" | "item";
  description: string;
  cr?: number;
  xp?: number;
  ac?: number;
  hp?: number;
  rarity?: string;
  type?: string;
  details?: string;
}
export interface AssetResult {
  id: string;
  name: string;
  author: string;
  license: string;
  url: string;
  image: string;
  thumbnail: string;
}
export const uid = () => crypto.randomUUID();
export const defaultSettings: GeneratorSettings = {
  seed: "ELDERMERE",
  template: "continents",
  land: 54,
  mountains: 46,
  roughness: 55,
  seaLevel: 0.44,
  temperature: 0,
  rainfall: 58,
  rivers: 9,
  cities: 7,
  style: "parchment",
  citySize: "town",
  defense: "stone",
  site: "river",
  layout: "organic",
  level: 3,
  party: 4,
  theme: "abandoned",
  dungeonSize: 48,
  density: 55,
  roomSize: 7,
  corridors: "winding",
  doors: "basic",
  grid: "none",
  latitude: 65,
  wind: "west",
  lakes: 3,
  kingdoms: 4,
  towns: 4,
  villages: 8,
  dungeons: 3,
  irregular: false,
  deadEnds: "some",
  entrances: 2,
  stairs: true,
};
export const makeLayers = (): Layer[] =>
  ["Terrain", "Water", "Paint", "Objects", "Labels", "Grid", "GM-only"].map(
    (name) => ({
      id: name,
      name,
      visible: true,
      locked: false,
      opacity: name === "Grid" ? 0.35 : 1,
      blend: "source-over",
    }),
  );
export const MAP_COLORS = [
  "#344a39",
  "#566548",
  "#7b8758",
  "#a7ae79",
  "#d4cfaa",
  "#eee6ce",
  "#b49b72",
  "#8a7157",
  "#544b40",
  "#263e49",
  "#547b83",
  "#92b0b0",
  "#c6d3c9",
  "#9b694e",
  "#b69b62",
  "#282b27",
];
