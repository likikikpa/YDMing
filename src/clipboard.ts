import { objectBounds } from "./extent";
import { idSet } from "./id-set";
import { uid } from "./types";
import type {
  Credit,
  MapData,
  MapObject,
  MapPath,
  Point,
  Project,
} from "./types";

/**
 * Copied stamps, labels and paths. The clip keeps full copies, so it can be
 * pasted after the originals change, on another map or in another world.
 */
export interface Clip {
  objects: MapObject[];
  paths: MapPath[];
  /** Credits of the copied imported stamps. */
  credits: Credit[];
  /** Middle of what was copied, so a paste can centre on the pointer. */
  centre: Point;
}

/** A copy of the selected stamps, labels and paths on editable layers, or null if none. */
export function copySelection(
  project: Project,
  map: MapData,
  ids: string[],
): Clip | null {
  const open = (layer: string) =>
    !map.layers.find((l) => l.id === layer)?.locked;
  const chosen = idSet(ids);
  const objects = map.objects.filter((o) => chosen.has(o.id) && open(o.layer)),
    paths = map.paths.filter((p) => chosen.has(p.id) && open(p.layer));
  if (!objects.length && !paths.length) return null;
  const used = new Set(objects.map((o) => o.creditId));
  const box = objectBounds(objects);
  for (const p of paths)
    for (const q of p.points) {
      box.left = Math.min(box.left, q.x);
      box.right = Math.max(box.right, q.x);
      box.top = Math.min(box.top, q.y);
      box.bottom = Math.max(box.bottom, q.y);
    }
  return structuredClone({
    objects,
    paths,
    credits: project.credits.filter((c) => used.has(c.id)),
    centre: { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 },
  });
}

/** Removes the selected stamps, labels and paths on editable layers (the cut half of cut). */
export function removeSelection(map: MapData, ids: string[]): MapData {
  const open = (layer: string) =>
    !map.layers.find((l) => l.id === layer)?.locked;
  const chosen = idSet(ids);
  return {
    ...map,
    objects: map.objects.filter((o) => !chosen.has(o.id) || !open(o.layer)),
    paths: map.paths.filter((p) => !chosen.has(p.id) || !open(p.layer)),
  };
}

/**
 * The project with the clip pasted onto `map`, centred on `at` (or where it
 * was copied), and the ids of the new copies. Copies get new ids and groups,
 * keep their layer when the map has it (else Objects), lose links to maps this
 * world does not have, and bring their credits along.
 */
export function pasteClip(
  project: Project,
  map: MapData,
  clip: Clip,
  at: Point = clip.centre,
): { project: Project; ids: string[] } {
  const dx = at.x - clip.centre.x,
    dy = at.y - clip.centre.y,
    layer = (id: string) =>
      map.layers.some((l) => l.id === id) ? id : "Objects",
    groups = new Map<string, string>(),
    ids: string[] = [];
  const objects = clip.objects.map((o) => {
    const copy: MapObject = {
      ...structuredClone(o),
      id: uid(),
      x: o.x + dx,
      y: o.y + dy,
      layer: layer(o.layer),
    };
    if (o.group) {
      if (!groups.has(o.group)) groups.set(o.group, uid());
      copy.group = groups.get(o.group);
    }
    if (
      copy.linkedMap &&
      (copy.linkedMap === map.id ||
        !project.maps.some((m) => m.id === copy.linkedMap))
    )
      delete copy.linkedMap;
    ids.push(copy.id);
    return copy;
  });
  const paths = clip.paths.map((p) => {
    const copy: MapPath = {
      ...structuredClone(p),
      id: uid(),
      points: p.points.map((q) => ({ x: q.x + dx, y: q.y + dy })),
      layer: layer(p.layer),
    };
    ids.push(copy.id);
    return copy;
  });
  const next = {
    ...map,
    objects: [...map.objects, ...objects],
    paths: [...map.paths, ...paths],
  };
  return {
    project: {
      ...project,
      maps: project.maps.map((m) => (m.id === map.id ? next : m)),
      credits: [
        ...project.credits,
        ...clip.credits.filter(
          (c) => !project.credits.some((k) => k.id === c.id),
        ),
      ],
    },
    ids,
  };
}
