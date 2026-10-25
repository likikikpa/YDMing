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
  | "terrain"
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
  | "fog"
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
  /** Lighter and warmer (up to 1) or darker and cooler (down to -1) than the picture; scattered stamps vary. */
  tint?: number;
  group?: string;
  linkedMap?: string;
  owner?: string;
  notes?: string;
  /** A bundled sprite's path, or (in old saves) the picture embedded as a data URL. */
  image?: string;
  /** The picture's key in `Project.images`: imported images are stored once per world. */
  imageId?: string;
  creditId?: string;
  /** A note about this stamp outside the app: an obsidian:// or web link. */
  noteUrl?: string;
  /** Labels: the lettering face (`map-fonts.ts`); without one, the map style's. */
  font?: string;
  /** Labels: bend along an arc, from -1 (sagging half circle) to 1 (arching). */
  curve?: number;
  /** Labels: extra room between letters, as a share of the letter height (0 to 1). */
  spacing?: number;
}
export interface MapPath {
  id: string;
  points: Point[];
  kind: "river" | "road" | "wall" | "corridor" | "border";
  width: number;
  /** Optional width at each point, so rivers can widen towards their mouth. */
  widths?: number[];
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
/** A map style; the registry is in `map-styles.ts`. Old saves may hold a retired one. */
export type MapStyleId =
  | "parchment"
  | "atlas"
  | "painted"
  | "fantasy"
  | "ink"
  | "realistic";
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
  style: MapStyleId;
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
  /** How much of each special biome a world gets, 0 to 100; saves from before them have none set. */
  volcanic?: number;
  blight?: number;
  reefs?: number;
  mangroves?: number;
  badlands?: number;
  glaciers?: number;
  steppe?: number;
  moorland?: number;
  autumnWoods?: number;
  /** 2 draws beaches by the slope of the shore; saves from before have none and keep the even ring. */
  biomeModel?: number;
  /** How many trees, ranges and stones the generator places as stamps, 0 to 100. */
  detail?: number;
}
export interface TerrainData {
  heights: number[];
  biomes: number[];
  /**
   * Hand-painted ground material per cell: 0 follows the biome, n uses the
   * texture layer whose id is `MapData.materialKeys[n - 1]`.
   */
  materials?: number[];
}
export type TexturePattern =
  | "grass"
  | "dirt"
  | "sand"
  | "rock"
  | "snow"
  | "water"
  | "mud"
  | "cobble"
  | "lava"
  | "coral";
/** A ground material the map, the generator and the terrain tools paint with. */
export interface TextureLayer {
  id: string;
  name: string;
  pattern: TexturePattern;
  /** An uploaded tile (PNG data URL) used instead of the generated pattern. */
  image?: string;
  /** Base colour; without one the map style decides. */
  tint?: string;
  /** Tile size in percent of the default (48 map px). */
  scale: number;
  /** How strongly the pattern shows, 0–100. */
  strength: number;
  visible: boolean;
  /**
   * How the tile covers the ground: repeated as is, blended from randomly
   * shifted copies so no repeat shows (the default), or unveiled from `cover`.
   */
  tiling?: TextureTiling;
  /** A map-wide image (JPEG data URL) that painting this layer unveils. */
  cover?: string;
  /** The bundled photo texture this layer was made from (see `texture-presets.ts`). */
  preset?: string;
}
export type TextureTiling = "tiled" | "blended" | "unveil";
/**
 * Fog of war: a coarse grid over the map, stored as run lengths that
 * alternate hidden, revealed, hidden … starting with hidden (it may be 0).
 * A map without fog hides nothing.
 */
export interface FogData {
  /** Map pixels per fog cell. */
  cell: number;
  cols: number;
  rows: number;
  runs: number[];
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
  materials?: number[];
  /** Texture layer ids that `materials` values point at (value n → entry n - 1). */
  materialKeys?: string[];
  parentId?: string;
  parentPosition?: Point;
  /** A note about this map outside the app: an obsidian:// or web link. */
  noteUrl?: string;
  /** Parts of the map hidden from players. */
  fog?: FogData;
  /** How far resizing has moved the original sheet, so decorations stay on the land. */
  origin?: Point;
  /**
   * Circles where the eraser cleared the generated mountains and forests, in
   * the same coordinates as those decorations (map position minus `origin`).
   */
  decorErased?: { x: number; y: number; r: number }[];
  /** City layout (centre, size, gates) kept so buildings can be rerolled on the same streets. */
  plan?: {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    rot: number;
    gates: Point[];
  };
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
  /** Ground materials shared by every map, drawn lowest first. */
  textures?: TextureLayer[];
  /** Imported pictures (data URLs) by id; stamps refer to them with `imageId`. */
  images?: Record<string, string>;
  /** Saved scatter brushes: weighted pictures the Stamp tool's scatter mode draws from. */
  scatterMixes?: ScatterMix[];
  commercial: boolean;
  updatedAt: string;
}
/** One bundled picture in a scatter mix; a larger weight is picked more often. */
export interface ScatterMixItem {
  /** A bundled picture's path, or `image:` and the key of an imported picture in `Project.images`. */
  src: string;
  /** For an imported picture: its name, shape and credit. */
  name?: string;
  aspect?: number;
  creditId?: string;
  weight: number;
  /** The biome ids it may grow on with Follow biomes; the built-in rules decide when unset. */
  biomes?: number[];
}
export interface ScatterMix {
  id: string;
  name: string;
  items: ScatterMixItem[];
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
// crypto.randomUUID only exists in secure contexts (HTTPS or localhost); the
// getRandomValues fallback keeps the app working when served over plain HTTP.
export const uid = () => {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
};
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
  style: "fantasy",
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
  volcanic: 30,
  blight: 12,
  reefs: 45,
  mangroves: 35,
  badlands: 30,
  glaciers: 40,
  steppe: 40,
  moorland: 30,
  autumnWoods: 30,
  biomeModel: 2,
  detail: 25,
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
