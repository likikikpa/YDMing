import { useRef, useState } from "react";
import { download, slug } from "../export";
import { validateProject } from "../storage";
import type { Project } from "../types";

/** Saving the project to a file and opening one, plus the export options. */
export function useProjectFiles({
  project,
  setProject,
  setHistory,
  setHistoryIndex,
  setMenu,
  setSelected,
  notify,
  lang,
}: {
  project: Project | null;
  setProject: (project: Project) => void;
  setHistory: (history: { project: Project; label: string }[]) => void;
  setHistoryIndex: (index: number) => void;
  setMenu: (open: boolean) => void;
  setSelected: (ids: string[]) => void;
  notify: (message: string) => void;
  lang: string;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState("png");
  const [exportScale, setExportScale] = useState(2);
  const [exportSecrets, setExportSecrets] = useState(true);
  function saveProjectFile() {
    if (!project) return;
    download(
      new Blob([JSON.stringify(project)], { type: "application/json" }),
      `${slug(project.name)}.atlasforge`,
    );
    setMenu(false);
  }
  async function openProjectFile(file: File) {
    try {
      if (file.size > 60_000_000)
        throw new Error("Project files must be smaller than 60 MB.");
      const p = validateProject(JSON.parse(await file.text()));
      setProject(p);
      setHistory([{ project: p, label: "Open project" }]);
      setHistoryIndex(0);
      setMenu(false);
      setSelected([]);
      notify(lang === "ru" ? "Проект открыт." : "Project opened.");
    } catch (e) {
      notify(String(e));
    }
  }
  return {
    fileInput,
    exportFormat,
    setExportFormat,
    exportScale,
    setExportScale,
    exportSecrets,
    setExportSecrets,
    saveProjectFile,
    openProjectFile,
  };
}
