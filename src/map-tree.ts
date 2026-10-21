import type { MapData, Project } from "./types";

/**
 * Maps form a tree through `parentId` (World → City → Dungeon), and stamps
 * point at other maps of the same world through `linkedMap`.
 */

/** The maps above `id`, the top one first. Stops at a missing parent or a loop. */
export function ancestors(maps: MapData[], id: string): MapData[] {
  const byId = new Map(maps.map((m) => [m.id, m]));
  const chain: MapData[] = [];
  const seen = new Set([id]);
  let parent = byId.get(id)?.parentId;
  while (parent && !seen.has(parent) && byId.has(parent)) {
    seen.add(parent);
    chain.unshift(byId.get(parent)!);
    parent = byId.get(parent)!.parentId;
  }
  return chain;
}

/** Every map once, each followed by the maps below it. */
export function mapTree(maps: MapData[]): { map: MapData; depth: number }[] {
  const ids = new Set(maps.map((m) => m.id));
  const out: { map: MapData; depth: number }[] = [];
  const seen = new Set<string>();
  const visit = (map: MapData, depth: number) => {
    if (seen.has(map.id)) return;
    seen.add(map.id);
    out.push({ map, depth });
    for (const child of maps)
      if (child.parentId === map.id) visit(child, depth + 1);
  };
  for (const m of maps) if (!m.parentId || !ids.has(m.parentId)) visit(m, 0);
  // Maps caught in a parent loop have no root; list them at the top level.
  for (const m of maps) visit(m, 0);
  return out;
}

/**
 * Points a stamp at another map, or clears the link. A linked map with no
 * parent yet is placed under the stamp's map, unless that would make a loop.
 */
export function linkObject(
  project: Project,
  mapId: string,
  objectId: string,
  target: string | undefined,
): Project {
  const above = new Set(ancestors(project.maps, mapId).map((m) => m.id));
  return {
    ...project,
    maps: project.maps.map((m) => {
      if (m.id === mapId)
        return {
          ...m,
          objects: m.objects.map((o) =>
            o.id === objectId ? { ...o, linkedMap: target } : o,
          ),
        };
      if (m.id === target && !m.parentId && !above.has(m.id))
        return { ...m, parentId: mapId };
      return m;
    }),
  };
}

/** Removes a map, its stamps' links to it, and moves the maps below it up a level. */
export function deleteMap(project: Project, id: string): Project {
  const gone = project.maps.find((m) => m.id === id);
  if (!gone || project.maps.length < 2) return project;
  const maps = project.maps
    .filter((m) => m.id !== id)
    .map((m) => {
      let next = m;
      if (m.objects.some((o) => o.linkedMap === id))
        next = {
          ...next,
          objects: m.objects.map((o) =>
            o.linkedMap === id ? { ...o, linkedMap: undefined } : o,
          ),
        };
      if (m.parentId === id) {
        // The position was a spot on the removed map, so it means nothing now.
        const { parentPosition: _, ...rest } = next;
        next = { ...rest, parentId: gone.parentId };
      }
      return next;
    });
  const activeMapId =
    project.activeMapId !== id
      ? project.activeMapId
      : maps.find((m) => m.id === gone.parentId)?.id || maps[0].id;
  return { ...project, maps, activeMapId };
}
