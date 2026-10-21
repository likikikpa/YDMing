import { deleteMap, linkObject } from "../map-tree";
import type { MapData, MapKind, MapObject, Project } from "../types";

/** Linking stamps to other maps of the world, and deleting maps. */
export function useMapLinks({
  project,
  map,
  commit,
  createMap,
  setSelected,
}: {
  project: Project | null;
  map: MapData | undefined;
  commit: (next: Project, label: string) => void;
  createMap: (
    kind: MapKind,
    name: string,
    seed?: string,
    parent?: MapObject,
  ) => Promise<void>;
  setSelected: (ids: string[]) => void;
}) {
  /** `target` is a map id, "new:city" or "new:dungeon" to make one, or "" to unlink. */
  function linkStamp(o: MapObject, target: string) {
    if (!project || !map) return;
    if (target.startsWith("new:"))
      return void createMap(
        target.slice(4) as MapKind,
        o.name,
        `${map.settings.seed}-${o.id}`,
        o,
      );
    commit(
      linkObject(project, map.id, o.id, target || undefined),
      target ? "Link map" : "Remove map link",
    );
  }
  function removeMap(id: string) {
    if (!project) return;
    commit(deleteMap(project, id), "Delete map");
    setSelected([]);
  }
  return { linkStamp, removeMap };
}
