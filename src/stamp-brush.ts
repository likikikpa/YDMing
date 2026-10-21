import { imageId, isEmbedded, withImages } from "./images";
import type { ImageTable } from "./images";
import { isScatterSprite } from "./symbols";
import type { Credit, MapData, MapObject, Project } from "./types";

/** The picture the stamp tool places: a bundled sprite or one of My stamps. */
export interface StampSprite {
  src: string;
  name: string;
  /** Width divided by height; bundled sprites are square. */
  aspect?: number;
  /** For an imported picture: its key in the world's image table (`src` is the data). */
  imageId?: string;
  /** Where an imported stamp came from; added to the world once placed. */
  credit?: Credit;
}

/** The stamp tool's sprite for a stamp from My stamps, keeping its shape and credit. */
export const spriteFromStamp = (
  stamp: MapObject,
  credit?: Credit,
): StampSprite => ({
  src: stamp.image!,
  name: stamp.name,
  aspect: stamp.width / stamp.height,
  imageId: isEmbedded(stamp.image) ? imageId(stamp.image) : undefined,
  credit,
});

const imported = (sprite: StampSprite) => isEmbedded(sprite.src);

/** How a placed copy refers to its picture: by id when imported, else by path. */
export const spriteImage = (sprite: StampSprite) =>
  sprite.imageId ? { imageId: sprite.imageId } : { image: sprite.src };

/** A placed sprite's size: its longer side is the brush size; vegetation is smaller. */
export function spriteSize(sprite: StampSprite, size: number) {
  const side = isScatterSprite(sprite.src) ? size * 0.7 : size,
    aspect = sprite.aspect || 1;
  return aspect >= 1
    ? { width: side, height: side / aspect }
    : { width: side * aspect, height: side };
}

/**
 * How far the pointer moves before dragging places the next copy, or
 * undefined when a drag places only one. Trees scatter densely; imported
 * stamps draw like a brush, a little closer than their own size.
 */
export function trailSpacing(sprite: StampSprite | undefined, size: number) {
  if (!sprite) return undefined;
  if (isScatterSprite(sprite.src)) return size * 0.45;
  return imported(sprite) ? size * 0.8 : undefined;
}

/** What placing the sprite adds to the world besides the stamp itself. */
export interface StampAssets {
  credits?: Credit[];
  images?: ImageTable;
}

/** The credit and picture of the sprite the stamp tool holds, to go with what it places. */
export const spriteAssets = (sprite?: StampSprite): StampAssets =>
  sprite
    ? {
        credits: sprite.credit ? [sprite.credit] : [],
        images: sprite.imageId ? { [sprite.imageId]: sprite.src } : {},
      }
    : {};

/**
 * The world's pictures plus the sprite's, for drawing while a stamp is being
 * placed: the picture joins the world's table only once the stroke is done.
 */
export const imagesWithSprite = (
  images: ImageTable | undefined,
  sprite?: StampSprite,
): ImageTable | undefined =>
  sprite?.imageId && !images?.[sprite.imageId]
    ? { ...images, [sprite.imageId]: sprite.src }
    : images;

/**
 * The project with the credits and pictures of imported stamps that `map` now
 * uses: nothing is added for a stamp that was picked but not placed.
 */
export function withStampAssets(
  project: Project,
  map: MapData,
  { credits = [], images = {} }: StampAssets,
): Project {
  const add = credits.filter(
    (c) =>
      !project.credits.some((k) => k.id === c.id) &&
      map.objects.some((o) => o.creditId === c.id),
  );
  const next = add.length
    ? { ...project, credits: [...project.credits, ...add] }
    : project;
  return withImages(next, map, images);
}
