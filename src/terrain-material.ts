import {
  DEEP_WATER,
  hexToRgb,
  patternTile,
  SHALLOW_WATER,
  TILE,
  WORLD_TILE,
} from "./materials";
import { turnsFor } from "./hex-tiling";
import { resolveStyle } from "./map-styles";
import { groundPhoto } from "./style-ground";
import {
  fantasyPalette,
  groundContrast,
  inkPalette,
  realisticPalette,
  SHALLOW_WATER_COLOUR,
} from "./style-palettes";
import type { TextureLayer, TextureTiling } from "./types";

/** Ground colour of each built-in material per style, taken from the biome palette. */
const STYLE_COLOURS: Record<string, number> = {
  snow: 1,
  rock: 2,
  dirt: 13,
  grass: 6,
  sand: 11,
  [SHALLOW_WATER]: 12,
  [DEEP_WATER]: 12,
};
const PALETTES = {
  fantasy: fantasyPalette,
  ink: inkPalette,
  realistic: realisticPalette,
};
export const paletteOf = (style: string) => PALETTES[resolveStyle(style)];

/** Decoded uploaded tiles, keyed by their data URL. */
export const uploads = new Map<string, Float32Array[]>();
/** Decoded map-wide cover images for unveiled layers, keyed by their data URL. */
export const covers = new Map<string, Cover>();
/** Generated pattern tiles, shared by every style and colour. */
const patterns = new Map<string, Float32Array[]>();

/** A map-wide image, RGB bytes. */
export interface Cover {
  rgb: Uint8ClampedArray;
  width: number;
  height: number;
}
export async function decodeCover(src: string): Promise<Cover> {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = img.naturalWidth;
  c.height = img.naturalHeight;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(0, 0, c.width, c.height).data,
    rgb = new Uint8ClampedArray(c.width * c.height * 3);
  for (let i = 0; i < c.width * c.height; i++)
    for (let k = 0; k < 3; k++) rgb[i * 3 + k] = data[i * 4 + k];
  return { rgb, width: c.width, height: c.height };
}

/** A material ready to sample: RGB mip levels for the current style. */
export interface Material {
  levels: Float32Array[];
  /** Tile texels per map pixel at full size. */
  density: number;
  tiling: TextureTiling;
  /** Average colour of the tile, which blending and unveiling keep. */
  mean: [number, number, number];
  /** The quarter turns blended copies may take (see `turnsFor`). */
  turns: number;
  /** How much the tile's detail shows on top of an unveiled cover, 0–1. */
  detail: number;
  cover?: Cover;
}

const tilingOf = (layer: TextureLayer): TextureTiling =>
  layer.tiling === "unveil" && !(layer.cover && covers.has(layer.cover))
    ? "blended"
    : (layer.tiling ?? "blended");

export function withMean(
  layer: TextureLayer,
  levels: Float32Array[],
  density: number,
): Material {
  const last = levels[levels.length - 1],
    n = last.length / 3,
    mean: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < n; i++)
    for (let k = 0; k < 3; k++) mean[k] += last[i * 3 + k] / n;
  return {
    levels,
    density,
    tiling: tilingOf(layer),
    mean,
    turns: turnsFor(levels[0], Math.sqrt(levels[0].length / 3)),
    detail: layer.visible ? layer.strength / 100 : 0,
    cover: layer.cover ? covers.get(layer.cover) : undefined,
  };
}

/** The colour a texture layer starts from: its own tint, else the map style's. */
function baseColour(layer: TextureLayer, style: string) {
  if (layer.tint) return hexToRgb(layer.tint);
  const palette = paletteOf(style);
  return (
    layer.id === SHALLOW_WATER && palette[SHALLOW_WATER_COLOUR]
      ? palette[SHALLOW_WATER_COLOUR]
      : palette[STYLE_COLOURS[layer.id] ?? STYLE_COLOURS[layer.pattern] ?? 5]
  ) as [number, number, number];
}
/** `baseColour` as a hex string, for colour pickers. */
export const textureColour = (layer: TextureLayer, style: string) =>
  "#" +
  baseColour(layer, style)
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("");

export const densityOf = (layer: TextureLayer) =>
  TILE / ((WORLD_TILE * layer.scale) / 100);

/**
 * The style's own photo for a layer, unless the layer has a picture or a tint
 * of its own, or is switched off (a hidden texture is a flat colour).
 */
export const photoFor = (
  layer: TextureLayer,
  style: string,
  ground = layer.id,
) =>
  layer.visible && !layer.image && !layer.tint
    ? groundPhoto(style, ground)
    : undefined;

/** The ground of woods in styles with photos: a material beside the project's layers, shaped like its grass. */
export function forestMaterial(style: string, grass?: TextureLayer) {
  const photo = grass && photoFor(grass, style, "forest");
  return grass && photo ? withMean(grass, photo, densityOf(grass)) : undefined;
}

export function buildMaterial(layer: TextureLayer, style: string): Material {
  const density = densityOf(layer),
    upload = layer.image ? uploads.get(layer.image) : undefined;
  if (upload) return withMean(layer, upload, density);
  const photo = photoFor(layer, style);
  if (photo) return withMean(layer, photo, density);
  let detail = patterns.get(layer.pattern);
  if (!detail)
    patterns.set(layer.pattern, (detail = patternTile(layer.pattern)));
  const base = baseColour(layer, style),
    deep = layer.id === DEEP_WATER && !layer.tint,
    darken = deep ? (resolveStyle(style) === "ink" ? 3 : 10) : 0,
    contrast = layer.visible
      ? (layer.strength / 100) * 0.3 * groundContrast(style)
      : 0;
  return withMean(
    layer,
    detail.map((level) => {
      const rgb = new Float32Array(level.length * 3);
      for (let i = 0; i < level.length; i++) {
        const f = 1 + level[i] * contrast;
        for (let k = 0; k < 3; k++) rgb[i * 3 + k] = (base[k] - darken) * f;
      }
      return rgb;
    }),
    density,
  );
}

/** Open-water colour of a map style, so rivers can match the sea exactly. */
export function seaColor(style: string) {
  const [r, g, b] = paletteOf(style)[12];
  return `rgb(${r}, ${g}, ${b})`;
}
