import { useState } from "react";
import { uid } from "../types";
import type { MapData, MapKind, MapObject, Project } from "../types";

/** The selection and what can be done to it: duplicate, group, arrange, delete. */
export function useObjectActions({
  project,
  map,
  setProject,
  mutateMap,
  notify,
  t,
  createMap,
  selected,
  setSelected,
}: {
  selected: string[];
  setSelected: (ids: string[]) => void;
  project: Project | null;
  map: MapData | undefined;
  setProject: (project: Project) => void;
  mutateMap: (change: (m: MapData) => void, label: string) => void;
  notify: (message: string) => void;
  t: (s: string) => string;
  createMap: (
    kind: MapKind,
    name: string,
    seed?: string,
    parent?: MapObject,
    size?: { cols: number; rows: number },
  ) => Promise<void>;
}) {
  const [activeLayer, setActiveLayer] = useState("Objects");
  const [dragLayer, setDragLayer] = useState<string | null>(null);
  const selection = map?.objects.filter((o) => selected.includes(o.id)) || [];
  function openObject(o: MapObject) {
    if (!project) return;
    // A link to a map that no longer exists counts as no link.
    if (o.linkedMap && project.maps.some((m) => m.id === o.linkedMap)) {
      setProject({ ...project, activeMapId: o.linkedMap });
      return;
    }
    if (["city", "village", "castle", "dungeon"].includes(o.kind)) {
      void createMap(
        o.kind === "dungeon" ? "dungeon" : "city",
        o.name,
        `${map?.settings.seed}-${o.id}`,
        o,
      );
    } else {
      setSelected([o.id]);
    }
  }
  function updateSelected(change: Partial<MapObject>, label = "Edit object") {
    mutateMap((m) => {
      for (const o of m.objects)
        if (
          selected.includes(o.id) &&
          !m.layers.find((l) => l.id === o.layer)?.locked
        )
          Object.assign(o, change);
    }, label);
  }
  function deleteObjects() {
    if (!selected.length) return;
    mutateMap((m) => {
      m.objects = m.objects.filter(
        (o) =>
          !selected.includes(o.id) ||
          m.layers.find((l) => l.id === o.layer)?.locked,
      );
    }, "Delete objects");
    setSelected([]);
  }
  function duplicate() {
    if (!selection.length) return;
    const ids: string[] = [];
    mutateMap((m) => {
      m.objects.push(
        ...selection.map((o) => {
          const id = uid();
          ids.push(id);
          return { ...o, id, x: o.x + 15, y: o.y + 15, group: undefined };
        }),
      );
    }, "Duplicate objects");
    setSelected(ids);
  }
  function groupObjects() {
    if (selection.length < 2) return;
    const group = uid();
    updateSelected({ group }, "Group objects");
    notify(t("Group"));
  }
  function arrange(mode: string) {
    if (!selection.length) return;
    mutateMap((m) => {
      const list = m.objects.filter((o) => selected.includes(o.id));
      if (mode === "front" || mode === "back") {
        m.objects =
          mode === "front"
            ? [...m.objects.filter((o) => !selected.includes(o.id)), ...list]
            : [...list, ...m.objects.filter((o) => !selected.includes(o.id))];
      } else if (mode === "left") {
        const x = Math.min(...list.map((o) => o.x - o.width / 2));
        list.forEach((o) => (o.x = x + o.width / 2));
      } else if (mode === "top") {
        const y = Math.min(...list.map((o) => o.y - o.height / 2));
        list.forEach((o) => (o.y = y + o.height / 2));
      } else if (list.length > 2) {
        list.sort((a, b) => a.x - b.x);
        const lo = list[0].x,
          hi = list.at(-1)!.x;
        list.forEach(
          (o, i) => (o.x = lo + ((hi - lo) * i) / (list.length - 1)),
        );
      }
    }, "Arrange objects");
  }
  const toggleLayer = (id: string, key: "visible" | "locked") =>
    mutateMap((m) => {
      const l = m.layers.find((l) => l.id === id)!;
      l[key] = !l[key];
    }, "Update layer");
  return {
    selection,
    activeLayer,
    setActiveLayer,
    dragLayer,
    setDragLayer,
    openObject,
    updateSelected,
    deleteObjects,
    duplicate,
    groupObjects,
    arrange,
    toggleLayer,
  };
}
