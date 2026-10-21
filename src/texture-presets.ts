import textures from "./data/textures.json";
import type { TexturePattern, TextureLayer } from "./types";

/** A photographic ground tile that ships with the app (Poly Haven, CC0). */
export interface TexturePreset {
  id: string;
  name: string;
  /** The kind of ground it shows; it picks the layer's generated look while the image loads. */
  ground: string;
  src: string;
  author: string;
  source: string;
}
export const TEXTURE_PRESETS = textures as TexturePreset[];

const PATTERNS: Record<string, TexturePattern> = {
  grass: "grass",
  dirt: "dirt",
  mud: "mud",
  sand: "sand",
  rock: "rock",
  snow: "snow",
  cobble: "cobble",
};

/** A texture layer that uses the preset's picture as its tile (`image` is a data URL). */
export const presetLayer = (
  id: string,
  preset: TexturePreset,
  image: string,
): TextureLayer => ({
  id,
  name: preset.name,
  pattern: PATTERNS[preset.ground] ?? "mud",
  image,
  scale: 100,
  strength: 60,
  visible: true,
});
