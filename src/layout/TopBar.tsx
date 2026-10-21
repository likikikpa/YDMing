import { IconButton } from "../ui/IconButton";
import {
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Download,
  Globe2,
  LoaderCircle,
  Mountain,
  Plus,
  Redo2,
  Undo2,
} from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function TopBar({ app }: { app: ReadyApp }) {
  const {
    busy,
    history,
    historyIndex,
    lang,
    map,
    project,
    redo,
    saveState,
    setLang,
    setMenu,
    setModal,
    setNewKind,
    setNewName,
    setNewSeed,
    setProject,
    t,
    undo,
  } = app;
  return (
    <header className="topbar wood">
      <button
        className="brand"
        onClick={() => setMenu((v) => !v)}
        aria-label="Project menu"
      >
        <span className="brand-mark">
          <Mountain size={27} />
        </span>
        <span>
          ATLAS<span className="brand-gold">FORGE</span>
        </span>
        <ChevronDown size={13} />
      </button>
      <div className="top-divider" />
      <nav className="map-breadcrumb" aria-label="Maps">
        <button
          className={map.kind === "world" ? "current" : ""}
          onClick={() => {
            const world = project.maps.find((m) => m.kind === "world");
            if (world) setProject({ ...project, activeMapId: world.id });
            else {
              setNewKind("world");
              setModal("new");
            }
          }}
        >
          <Globe2 size={16} />
          {t("World")}
        </button>
        {map.parentId && (
          <>
            <ChevronRight size={13} />
            <button
              onClick={() =>
                setProject({ ...project, activeMapId: map.parentId! })
              }
            >
              {project.maps.find((m) => m.id === map.parentId)?.name}
            </button>
          </>
        )}
        {map.kind !== "world" && (
          <>
            <ChevronRight size={13} />
            <span className="current">{map.name}</span>
          </>
        )}
        <button
          className="add-map"
          title={t("New map")}
          aria-label={t("New map")}
          onClick={() => {
            setNewName("");
            setNewSeed("");
            setModal("new");
          }}
        >
          <Plus size={15} />
        </button>
      </nav>
      <div className="header-actions">
        <span
          className={`save-state ${saveState === "Unsaved" ? "error" : ""}`}
        >
          {saveState === "Saving…" ? (
            <LoaderCircle className="spin" size={13} />
          ) : (
            <CheckCheck size={14} />
          )}
          <span>{t(saveState)}</span>
        </span>
        <div className="undo-group">
          <IconButton
            icon={Undo2}
            title={t("Undo")}
            keys="Ctrl Z"
            side="bottom"
            onClick={undo}
            disabled={historyIndex === 0 || busy}
          />
          <IconButton
            icon={Redo2}
            title={t("Redo")}
            keys="Ctrl Shift Z"
            side="bottom"
            onClick={redo}
            disabled={historyIndex >= history.length - 1 || busy}
          />
        </div>
        <button
          className="language-button"
          title="English / Русский"
          onClick={() => setLang((l) => (l === "en" ? "ru" : "en"))}
        >
          {lang === "en" ? "EN" : "RU"}
        </button>
        <button
          className="button brass export-button"
          onClick={() => setModal("export")}
        >
          <Download size={15} />
          {t("Export map")}
          <ChevronDown size={13} />
        </button>
      </div>
    </header>
  );
}
