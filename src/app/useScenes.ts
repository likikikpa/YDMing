import { useEffect, useMemo, useState } from "react";
import { get, set } from "idb-keyval";
import { copySelection, pasteClip } from "../clipboard";
import type { EditorHandle } from "../editor/types";
import { builtinScenes, validScene } from "../scenes";
import type { Scene } from "../scenes";
import { uid } from "../types";
import type { MapData, Project, Tool } from "../types";

const KEY = "ydming-scenes";

/** Scenes: groups of stamps and paths placed in one click, built in or saved from a selection. */
export function useScenes({
  project,
  map,
  selected,
  setSelected,
  commit,
  chooseTool,
  editor,
  notify,
  t,
}: {
  project: Project | null;
  map: MapData | undefined;
  selected: string[];
  setSelected: (ids: string[]) => void;
  commit: (next: Project, label: string) => void;
  chooseTool: (tool: Tool) => void;
  editor: React.RefObject<EditorHandle | null>;
  notify: (message: string) => void;
  t: (s: string) => string;
}) {
  const [myScenes, setMyScenes] = useState<Scene[]>([]);
  useEffect(() => {
    let live = true;
    get<unknown[]>(KEY)
      .then((saved) => {
        if (live && Array.isArray(saved))
          setMyScenes(
            saved
              .filter(validScene)
              .map((s) => ({
                ...s,
                clip: { ...s.clip, images: s.clip.images ?? {} },
              })),
          );
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, []);
  const kind = map?.kind,
    width = map?.width,
    cols = map?.cols;
  const builtin = useMemo(
    () => (kind && width && cols ? builtinScenes({ kind, width, cols }) : []),
    [kind, width, cols],
  );
  /** Puts a copy of the scene in the middle of the view and selects it, ready to drag. */
  function placeScene(scene: Scene) {
    if (!project || !map) return;
    try {
      const { project: next, ids } = pasteClip(
        project,
        map,
        scene.clip,
        editor.current?.viewCentre(),
      );
      commit(next, "Place scene");
      chooseTool("select");
      setSelected(ids);
    } catch (error) {
      console.error(error);
      notify(t("Could not place the scene."));
    }
  }
  async function saveScene(name: string) {
    if (!project || !map) return;
    const clip = copySelection(project, map, selected);
    if (!clip) {
      notify(t("Select stamps or paths on the map first."));
      return;
    }
    const scene: Scene = {
      id: uid(),
      name: name.trim() || `${t("Scene")} ${myScenes.length + 1}`,
      clip,
    };
    const next = [...myScenes, scene];
    try {
      await set(KEY, next);
      setMyScenes(next);
      notify(`${scene.name} ✓`);
    } catch {
      notify(t("Could not store the scene. Save the world to a file instead."));
    }
  }
  async function deleteScene(id: string) {
    const next = myScenes.filter((s) => s.id !== id);
    try {
      await set(KEY, next);
      setMyScenes(next);
    } catch {
      notify(t("Could not store the scene. Save the world to a file instead."));
    }
  }
  return {
    builtinScenes: builtin,
    myScenes,
    placeScene,
    saveScene,
    deleteScene,
  };
}
