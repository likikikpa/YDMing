import { useEffect, useState } from "react";
import { Globe2, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";
import { IconButton } from "../ui/IconButton";
import { entryOf, withEntry } from "../worlds";

export function WorldsModal({ app }: { app: ReadyApp }) {
  const {
    busy,
    createWorld,
    deleteWorld,
    openWorld,
    project,
    refreshWorlds,
    renameWorld,
    t,
    worlds,
  } = app;
  const [name, setName] = useState("");
  useEffect(() => void refreshWorlds(), []);
  // The open world may not be saved yet, so its row comes from memory.
  const rows = withEntry(worlds, entryOf(project));
  return (
    <>
      <div className="world-list">
        {rows.map((w) => (
          <div
            key={w.id}
            className={`world-row ${w.id === project.id ? "current" : ""}`}
          >
            {w.id === project.id ? (
              <span className="world-open">
                <Globe2 size={16} />
                <input
                  aria-label={t("World name")}
                  value={project.name}
                  onChange={(e) => renameWorld(e.target.value)}
                />
              </span>
            ) : (
              <button className="world-open" onClick={() => openWorld(w.id)}>
                <Globe2 size={16} />
                <span>{w.name}</span>
              </button>
            )}
            <span className="world-count" title={t("Maps")}>
              <MapIcon size={12} />
              {w.maps}
            </span>
            <IconButton
              icon={Trash2}
              title={t("Delete world")}
              disabled={busy}
              onClick={() => void deleteWorld(w.id)}
            />
          </div>
        ))}
      </div>
      <form
        className="world-new"
        onSubmit={(e) => {
          e.preventDefault();
          void createWorld(name).then(() => setName(""));
        }}
      >
        <input
          aria-label={t("World name")}
          placeholder={t("World name")}
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="button brass" disabled={busy}>
          <Plus size={15} />
          {t("New world")}
        </button>
      </form>
    </>
  );
}
