import { useState } from "react";
import { backupDue, markBackup, readBackup } from "../backup";
import type { Project } from "../types";

/** Reminds the GM to save the world to a file when browser storage is all that holds it. */
export function useBackupReminder(project: Project | null) {
  // Bumped when a file is saved, so the reminder is worked out again.
  const [saved, setSaved] = useState(0);
  const [later, setLater] = useState<string[]>([]);
  void saved;
  const due =
    !!project &&
    !later.includes(project.id) &&
    backupDue(project.updatedAt, readBackup(project.id), Date.now());
  return {
    backupDue: due,
    /** Hides the reminder until the page is opened again. */
    backupLater: () => project && setLater((ids) => [...ids, project.id]),
    /** Call after the world was saved to a file. */
    backupSaved: (id: string) => {
      markBackup(id);
      setSaved((n) => n + 1);
    },
  };
}
