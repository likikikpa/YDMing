import { useRef } from "react";
import { copySelection, pasteClip, removeSelection } from "../clipboard";
import type { Clip } from "../clipboard";
import { cursorStatus } from "../status";
import type { MapData, Project, Tool } from "../types";

/**
 * Copy, cut and paste of stamps, labels, rivers, roads and walls. The clip
 * lives as long as the page, so it can be pasted on another map or world.
 */
export function useClipboard({
  project,
  map,
  selected,
  setSelected,
  commit,
  chooseTool,
}: {
  project: Project | null;
  map: MapData | undefined;
  selected: string[];
  setSelected: (ids: string[]) => void;
  commit: (next: Project, label: string) => void;
  chooseTool: (tool: Tool) => void;
}) {
  const clip = useRef<Clip | null>(null);
  function copy() {
    if (!project || !map) return false;
    const next = copySelection(project, map, selected);
    if (next) clip.current = next;
    return !!next;
  }
  function cut() {
    if (!project || !map || !copy()) return;
    const next = removeSelection(map, selected);
    commit(
      {
        ...project,
        maps: project.maps.map((m) => (m.id === map.id ? next : m)),
      },
      "Cut",
    );
    setSelected([]);
  }
  /** Centred on the pointer when it is over the map; `inPlace` keeps the copied position. */
  function paste(inPlace = false) {
    if (!project || !map || !clip.current) return;
    const overMap = document
      .querySelector(".interaction-canvas")
      ?.matches(":hover");
    const { x, y } = cursorStatus.get();
    const { project: next, ids } = pasteClip(
      project,
      map,
      clip.current,
      inPlace || !overMap ? undefined : { x, y },
    );
    commit(next, "Paste");
    // The copies come in selected, ready to be dragged into place.
    chooseTool("select");
    setSelected(ids);
  }
  return { copy, cut, paste };
}
