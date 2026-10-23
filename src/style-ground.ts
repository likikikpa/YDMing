import { resolveStyle } from "./map-styles";
import type { LiveStyleId } from "./map-styles";
import { decodeTile } from "./tile-decode";

/** A photo tile that stands in for a ground, and the colour it is recoloured to. */
interface GroundPhoto {
  src: string;
  /** The average colour the tile is given: photos differ in light and colour, so each is graded to sit beside the others. */
  colour: [number, number, number];
  /** How much of the tile's own colour stays, 0 to 1; the rest is its light and shade in the new colour. */
  keep: number;
}

const TEXTURES = "/assets/textures/";

/**
 * The photo ground of a style, by what it stands in for: a built-in layer by id,
 * or a biome by its key (see `BIOME_KEYS`). A style listed here draws these
 * tiles in place of its generated patterns, unless the map's own texture layer
 * has a picture or a tint of its own. A tile may serve several grounds, each
 * recoloured its own way.
 */
const PHOTOS: Partial<Record<LiveStyleId, Record<string, GroundPhoto>>> = {
  realistic: {
    grass: {
      src: `${TEXTURES}forest-floor.jpg`,
      colour: [106, 132, 66],
      keep: 0.2,
    },
    // Leaf litter from above reads as the crowns of trees.
    forest: {
      src: `${TEXTURES}autumn-leaves.jpg`,
      colour: [48, 76, 40],
      keep: 0.15,
    },
    taiga: {
      src: `${TEXTURES}autumn-leaves.jpg`,
      colour: [44, 72, 64],
      keep: 0.15,
    },
    jungle: {
      src: `${TEXTURES}forest-floor.jpg`,
      colour: [52, 118, 54],
      keep: 0.2,
    },
    swamp: { src: `${TEXTURES}dark-mud.jpg`, colour: [72, 84, 52], keep: 0.35 },
    savanna: { src: `${TEXTURES}grass.jpg`, colour: [176, 156, 88], keep: 0.3 },
    tundra: {
      src: `${TEXTURES}forest-floor.jpg`,
      colour: [138, 146, 116],
      keep: 0.25,
    },
    desert: { src: `${TEXTURES}sand.jpg`, colour: [224, 188, 120], keep: 0.5 },
    dirt: { src: `${TEXTURES}dirt.jpg`, colour: [160, 124, 88], keep: 0.4 },
    sand: { src: `${TEXTURES}sand.jpg`, colour: [214, 196, 152], keep: 0.5 },
    rock: {
      src: `${TEXTURES}mossy-rock.jpg`,
      colour: [122, 118, 108],
      keep: 0.5,
    },
    snow: { src: `${TEXTURES}snow.jpg`, colour: [236, 240, 244], keep: 0.5 },
  },
};

/** The grounds a style has photos for. */
export const groundKinds = (style: string) =>
  Object.keys(PHOTOS[resolveStyle(style)] ?? {});

/** The sources of every photo tile a style needs, in the order of the table. */
export const groundSources = (style: string) =>
  Object.values(PHOTOS[resolveStyle(style)] ?? {}).map((p) => p.src);

/** What identifies a recoloured tile: its picture and how it is recoloured. */
const idOf = (p: GroundPhoto) => `${p.src}|${p.colour.join()}|${p.keep}`;

/** Decoded tiles (RGB mip levels, already recoloured), by `idOf`. */
const loaded = new Map<string, Float32Array[]>();

/** Pictures decoded, by source, so a tile that serves several grounds is read once. */
const decoded = new Map<string, Promise<Float32Array[]>>();

const luminance = (r: number, g: number, b: number) =>
  r * 0.3 + g * 0.59 + b * 0.11;

/**
 * The mip levels of a tile recoloured so its average colour is `colour`. Each
 * texel is a mix of two things: the texel with its channels scaled to the new
 * average (`keep` of it), and the new colour lit by the texel's brightness.
 * Scaling alone turns a brown tile teal when it is pushed to green.
 */
export function recoloured(
  levels: Float32Array[],
  colour: [number, number, number],
  keep: number,
) {
  const base = levels[0],
    texels = base.length / 3,
    mean = [0, 0, 0];
  for (let i = 0; i < base.length; i++) mean[i % 3] += base[i] / texels;
  const meanLight = luminance(mean[0], mean[1], mean[2]) || 1,
    scale = mean.map((m, k) =>
      Math.min(2.4, Math.max(0.4, colour[k] / (m || 1))),
    );
  return levels.map((level) => {
    const out = new Float32Array(level.length);
    for (let i = 0; i < level.length; i += 3) {
      const light = luminance(level[i], level[i + 1], level[i + 2]) / meanLight;
      for (let k = 0; k < 3; k++)
        out[i + k] = Math.min(
          255,
          Math.max(
            0,
            level[i + k] * scale[k] * keep + colour[k] * light * (1 - keep),
          ),
        );
    }
    return out;
  });
}

/** The decoded photo for a ground in a style, once it has loaded. */
export const groundPhoto = (style: string, ground: string) => {
  const photo = PHOTOS[resolveStyle(style)]?.[ground];
  return photo ? loaded.get(idOf(photo)) : undefined;
};

/** Tiles being recoloured now, so two callers asking for one load it once. */
const pending = new Map<string, Promise<void>>();

/**
 * Loads the photo tiles a style needs. Resolves true when some were not loaded
 * yet, which means anything already drawn used generated ground instead.
 */
export async function preloadGround(style: string) {
  const missing = Object.values(PHOTOS[resolveStyle(style)] ?? {}).filter(
    (p) => !loaded.has(idOf(p)),
  );
  if (!missing.length) return false;
  const results = await Promise.allSettled(
    missing.map((p) => {
      const id = idOf(p);
      let job = pending.get(id);
      if (!job) {
        let picture = decoded.get(p.src);
        if (!picture) {
          picture = decodeTile(p.src);
          decoded.set(p.src, picture);
          // A picture that failed to load is tried again next time.
          picture.catch(() => decoded.delete(p.src));
        }
        job = picture
          .then((levels) => {
            loaded.set(id, recoloured(levels, p.colour, p.keep));
          })
          .finally(() => pending.delete(id));
        pending.set(id, job);
      }
      return job;
    }),
  );
  return results.some((r) => r.status === "fulfilled");
}

/** Loads the photos of every style that has them, so switching to one paints once. */
export const preloadAllGround = () =>
  Promise.all(Object.keys(PHOTOS).map(preloadGround));
