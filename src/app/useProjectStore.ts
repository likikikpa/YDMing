import { useEffect, useRef, useState } from "react";
import { loadStartWorld, newWorld, saveWorld } from "../worlds";
import { withStampAssets } from "../stamp-brush";
import type { StampAssets } from "../stamp-brush";
import type { MapData, Project } from "../types";
import { HISTORY_LIMIT } from "./constants";

/** The open world (a `Project`), its undo history, and saving it in the browser. */
export function useProjectStore({
  notify,
  setSelected,
}: {
  notify: (message: string) => void;
  setSelected: (ids: string[]) => void;
}) {
  const [project, setProject] = useState<Project | null>(null);
  const projectRef = useRef<Project | null>(null);
  const [history, setHistory] = useState<{ project: Project; label: string }[]>(
    [],
  );
  const [historyIndex, setHistoryIndex] = useState(0);
  const [saveState, setSaveState] = useState("Saved locally");
  const [saveError, setSaveError] = useState("");
  const historyRef = useRef(history),
    indexRef = useRef(historyIndex),
    lastMerge = useRef({ label: "", at: 0 });
  historyRef.current = history;
  indexRef.current = historyIndex;
  const map = project?.maps.find((m) => m.id === project.activeMapId);
  projectRef.current = project;
  /**
   * Records a change as an undo step. With `merge`, a change that quickly
   * follows one of the same label replaces it, so one slider drag is one step.
   */
  function commit(next: Project, label: string, merge = false) {
    next = { ...next, updatedAt: new Date().toISOString() };
    setProject(next);
    const now = Date.now(),
      joins =
        merge &&
        lastMerge.current.label === label &&
        now - lastMerge.current.at < 1500 &&
        indexRef.current > 0 &&
        indexRef.current === historyRef.current.length - 1;
    lastMerge.current = { label: merge ? label : "", at: now };
    // Refs keep two commits in the same tick consistent, and the cap stops a
    // long session from holding hundreds of full map copies in memory.
    const kept = [
      ...historyRef.current.slice(0, indexRef.current + (joins ? 0 : 1)),
      { project: next, label },
    ].slice(-HISTORY_LIMIT);
    historyRef.current = kept;
    indexRef.current = kept.length - 1;
    setHistory(kept);
    setHistoryIndex(kept.length - 1);
    setSaveState("Saving…");
  }
  /** `assets` are the credit and picture of an imported stamp the map may now use. */
  function updateMap(
    next: MapData,
    label: string,
    assets: StampAssets = {},
    merge = false,
  ) {
    const p = projectRef.current;
    if (!p) return;
    commit(
      withStampAssets(
        { ...p, maps: p.maps.map((m) => (m.id === next.id ? next : m)) },
        next,
        assets,
      ),
      label,
      merge,
    );
  }
  function mutateMap(
    change: (m: MapData) => void,
    label: string,
    merge = false,
  ) {
    if (!map) return;
    const next = structuredClone(map);
    change(next);
    updateMap(next, label, {}, merge);
  }
  function undo() {
    if (historyIndex < 1) return;
    setProject(history[historyIndex - 1].project);
    setHistoryIndex(historyIndex - 1);
    setSelected([]);
  }
  function redo() {
    if (historyIndex >= history.length - 1) return;
    setProject(history[historyIndex + 1].project);
    setHistoryIndex(historyIndex + 1);
    setSelected([]);
  }
  useEffect(() => {
    let live = true;
    (async () => {
      let initial: Project | undefined;
      try {
        initial = await loadStartWorld();
      } catch {
        setSaveError(
          "Browser storage is unavailable. Download a project backup.",
        );
      }
      if (!initial) initial = newWorld("The Eldermere Reach");
      if (live) {
        setProject(initial);
        setHistory([{ project: initial, label: "Starting map" }]);
      }
    })().catch((e) => notify(String(e)));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!project) return;
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      void saveWorld(project)
        .then(() => {
          setSaveState("Saved locally");
          setSaveError("");
        })
        .catch(() => {
          setSaveState("Unsaved");
          setSaveError("Local save failed. Download a project backup.");
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [project]);
  return {
    project,
    setProject,
    projectRef,
    map,
    history,
    setHistory,
    historyIndex,
    setHistoryIndex,
    saveState,
    saveError,
    setSaveError,
    commit,
    updateMap,
    mutateMap,
    undo,
    redo,
  };
}
