import { isScatterSprite } from "./symbols";
import type { Credit, MapData, MapObject, Project } from "./types";

/** The picture the stamp tool places: a bundled sprite or one of My stamps. */
export interface StampSprite {
  src: string;
  name: string;
  /** Width divided by height; bundled sprites are square. */
  aspect?: number;
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
  credit,
});

const imported = (sprite: StampSprite) => sprite.src.startsWith("data:");

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

/** The project with the credits of imported stamps that `map` now uses. */
export function withStampCredits(
  project: Project,
  map: MapData,
  credits: Credit[],
): Project {
  const add = credits.filter(
    (c) =>
      !project.credits.some((k) => k.id === c.id) &&
      map.objects.some((o) => o.creditId === c.id),
  );
  return add.length
    ? { ...project, credits: [...project.credits, ...add] }
    : project;
}
