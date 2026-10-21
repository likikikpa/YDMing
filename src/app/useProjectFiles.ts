import { useRef, useState } from "react";
import { download, slug } from "../export";
import { validateProject } from "../storage";
import type { Project } from "../types";

/** Saving the world to a file and opening one, plus the export options. */
export function useProjectFiles({
  project,
  importWorld,
  setMenu,
  notify,
  lang,
  backupSaved,
}: {
  project: Project | null;
  importWorld: (project: Project) => Promise<void>;
  setMenu: (open: boolean) => void;
  notify: (message: string) => void;
  lang: string;
  backupSaved: (id: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [exportFormat, setExportFormat] = useState("png");
  const [exportScale, setExportScale] = useState(2);
  const [exportSecrets, setExportSecrets] = useState(true);
  function saveProjectFile() {
    if (!project) return;
    download(
      new Blob([JSON.stringify(project)], { type: "application/json" }),
      `${slug(project.name)}.ydming`,
    );
    backupSaved(project.id);
    setMenu(false);
  }
  async function openProjectFile(file: File) {
    try {
      if (file.size > 60_000_000)
        throw new Error("Project files must be smaller than 60 MB.");
      const p = validateProject(JSON.parse(await file.text()));
      await importWorld(p);
      setMenu(false);
      notify(lang === "ru" ? "Мир открыт." : "World opened.");
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
