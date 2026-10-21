import { useState } from "react";
import type { Project } from "../types";
import {
  asNewWorld,
  listWorlds,
  loadWorld,
  newWorld,
  removeWorld,
  saveActiveWorldId,
  saveWorld,
} from "../worlds";
import type { WorldEntry } from "../worlds";
import type { ModalName } from "./constants";

/** The saved worlds: listing, opening, creating, importing and deleting them. */
export function useWorlds({
  project,
  projectRef,
  setProject,
  setHistory,
  setHistoryIndex,
  setSelected,
  setModal,
  notify,
  t,
}: {
  project: Project | null;
  projectRef: React.RefObject<Project | null>;
  setProject: (project: Project) => void;
  setHistory: (history: { project: Project; label: string }[]) => void;
  setHistoryIndex: (index: number) => void;
  setSelected: (ids: string[]) => void;
  setModal: (modal: ModalName | null) => void;
  notify: (message: string) => void;
  t: (s: string) => string;
}) {
  const [worlds, setWorlds] = useState<WorldEntry[]>([]);
  const failed = () =>
    notify(t("Browser storage is unavailable. Download a project backup."));
  async function refreshWorlds() {
    try {
      setWorlds(await listWorlds());
    } catch {
      failed();
    }
  }
  async function switchTo(next: Project, label: string) {
    // The store saves after a short delay; write the open world now so
    // switching away never drops its last change.
    if (projectRef.current) await saveWorld(projectRef.current);
    await saveWorld(next);
    await saveActiveWorldId(next.id);
    setProject(next);
    setHistory([{ project: next, label }]);
    setHistoryIndex(0);
    setSelected([]);
    setWorlds(await listWorlds());
  }
  async function openWorld(id: string) {
    try {
      if (id !== project?.id) {
        const next = await loadWorld(id);
        if (!next) return void (await refreshWorlds());
        await switchTo(next, "Open world");
      }
      setModal(null);
    } catch {
      failed();
    }
  }
  async function createWorld(name: string) {
    try {
      await switchTo(newWorld(name.trim() || t("New world")), "New world");
      setModal(null);
    } catch {
      failed();
    }
  }
  /** Opens a world read from a file as a new world, next to the others. */
  async function importWorld(p: Project) {
    const taken = (await listWorlds()).map((w) => w.id);
    await switchTo(asNewWorld(p, taken), "Open project");
  }
  async function deleteWorld(id: string) {
    if (!confirm(t("Delete this world and all its maps?"))) return;
    try {
      if (id === project?.id) {
        const other = (await listWorlds()).find((w) => w.id !== id);
        const next =
          (other && (await loadWorld(other.id))) ||
          newWorld("The Eldermere Reach");
        await switchTo(next, "Open world");
      }
      await removeWorld(id);
      await refreshWorlds();
    } catch {
      failed();
    }
  }
  function renameWorld(name: string) {
    if (project) setProject({ ...project, name });
  }
  return {
    worlds,
    refreshWorlds,
    openWorld,
    createWorld,
    importWorld,
    deleteWorld,
    renameWorld,
  };
}
