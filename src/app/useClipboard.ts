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
  notify,
  t,
}: {
  project: Project | null;
  map: MapData | undefined;
  selected: string[];
  setSelected: (ids: string[]) => void;
  commit: (next: Project, label: string) => void;
  chooseTool: (tool: Tool) => void;
  notify: (message: string) => void;
  t: (s: string) => string;
}) {
  const clip = useRef<Clip | null>(null);
  /** Runs a clipboard action; a failure is reported instead of vanishing from a key handler. */
  function guarded<T>(action: () => T, fallback: T, message: string): T {
    try {
      return action();
    } catch (error) {
      console.error(error);
      notify(t(message));
      return fallback;
    }
  }
  function copy() {
    if (!project || !map) return false;
    return guarded(
      () => {
        const next = copySelection(project, map, selected);
        if (next) clip.current = next;
        return !!next;
      },
      false,
      "Could not copy. Select fewer objects and try again.",
    );
  }
  function cut() {
    if (!project || !map || !copy()) return;
    guarded(
      () => {
        const next = removeSelection(map, selected);
        commit(
          {
            ...project,
            maps: project.maps.map((m) => (m.id === map.id ? next : m)),
          },
          "Cut",
        );
        setSelected([]);
      },
      undefined,
      "Could not cut. Select fewer objects and try again.",
    );
  }
  /** Centred on the pointer when it is over the map; `inPlace` keeps the copied position. */
  function paste(inPlace = false) {
    if (!project || !map) return;
    if (!clip.current) {
      // The clipboard lives as long as the page, so a reload empties it.
      notify(t("Nothing copied yet. Select something and press Ctrl C."));
      return;
    }
    const copied = clip.current;
    guarded(
      () => {
        const overMap = document
          .querySelector(".interaction-canvas")
          ?.matches(":hover");
        const { x, y } = cursorStatus.get();
        const { project: next, ids } = pasteClip(
          project,
          map,
          copied,
          inPlace || !overMap ? undefined : { x, y },
        );
        commit(next, "Paste");
        // The copies come in selected, ready to be dragged into place.
        chooseTool("select");
        setSelected(ids);
      },
      undefined,
      "Could not paste. Copy fewer objects and try again.",
    );
  }
  return { copy, cut, paste };
}
