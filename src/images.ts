import type { MapObject, Project } from "./types";

/**
 * Imported pictures are kept once per world, in `Project.images`, and stamps
 * point at them with `imageId`. Before, every stamp embedded its own copy of
 * the data URL: a few thousand stamps of one picture were hundreds of
 * megabytes, copied again by every edit, undo step and save.
 */
export type ImageTable = Record<string, string>;

export const isEmbedded = (src: string | undefined): src is string =>
  !!src && src.startsWith("data:");

/** cyrb53: a fast 53-bit string hash. */
function hash(text: string) {
  let h1 = 0xdeadbeef,
    h2 = 0x41c6ce57;
  for (let i = 0; i < text.length; i++) {
    const c = text.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** The picture's content as an id, so the same picture is one entry however it came in. */
export const imageId = (dataUrl: string) =>
  `i${hash(dataUrl).toString(36)}-${dataUrl.length.toString(36)}`;

/** What a stamp shows: its table entry, or its own `image` (a bundled path or an old embedded copy). */
export const objectImage = (o: MapObject, images?: ImageTable) =>
  o.imageId ? images?.[o.imageId] : o.image;

/** The distinct pictures the objects show, for loading each once. */
export function imageSources(objects: MapObject[], images?: ImageTable) {
  const sources = new Set<string>();
  for (const o of objects) {
    const src = o.kind === "image" ? objectImage(o, images) : undefined;
    if (src) sources.add(src);
  }
  return sources;
}

/** The sources `cache` does not hold a finished picture for. */
export const notLoaded = (
  sources: Iterable<string>,
  cache: { get(src: string): { complete: boolean } | undefined },
) => [...sources].filter((src) => !cache.get(src)?.complete);

/**
 * Old saves embed the picture in every stamp. Moves each distinct picture into
 * the world's table and leaves the stamps with its id; anything else is left
 * as it is, and a project with nothing embedded comes back unchanged.
 */
export function migrateImages(project: Project): Project {
  const ids = new Map<string, string>();
  let images = project.images,
    changed = false;
  const maps = project.maps.map((m) => {
    if (!m.objects.some((o) => isEmbedded(o.image))) return m;
    changed = true;
    return {
      ...m,
      objects: m.objects.map((o) => {
        if (!isEmbedded(o.image)) return o;
        let id = ids.get(o.image);
        if (!id) {
          id = imageId(o.image);
          ids.set(o.image, id);
          if (!images?.[id]) images = { ...images, [id]: o.image };
        }
        const { image: _embedded, ...rest } = o;
        return { ...rest, imageId: id };
      }),
    };
  });
  return changed ? { ...project, maps, images } : project;
}

/** The project without pictures no stamp uses any more, for saving. */
export function pruneImages(project: Project): Project {
  const images = project.images;
  if (!images) return project;
  const used = new Set<string>();
  for (const m of project.maps)
    for (const o of m.objects) if (o.imageId) used.add(o.imageId);
  const keys = Object.keys(images);
  if (keys.every((k) => used.has(k))) return project;
  const { images: _all, ...rest } = project;
  const kept = Object.fromEntries(
    keys.filter((k) => used.has(k)).map((k) => [k, images[k]]),
  );
  return Object.keys(kept).length ? { ...rest, images: kept } : rest;
}

/**
 * Adds to the table the pictures of `extra` that stamps on `map` use and the
 * table lacks (a stamp has just been placed with one, or pasted from another
 * world).
 */
export function withImages(
  project: Project,
  map: { objects: MapObject[] },
  extra: ImageTable,
): Project {
  const missing = Object.keys(extra).filter(
    (id) => !project.images?.[id] && map.objects.some((o) => o.imageId === id),
  );
  if (!missing.length) return project;
  return {
    ...project,
    images: {
      ...project.images,
      ...Object.fromEntries(missing.map((id) => [id, extra[id]])),
    },
  };
}
