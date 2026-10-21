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
import { ancestors } from "../map-tree";

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
  const crumbs = [...ancestors(project.maps, map.id), map];
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
          YD<span className="brand-gold">MING</span>
        </span>
        <ChevronDown size={13} />
      </button>
      <div className="top-divider" />
      <nav className="map-breadcrumb" aria-label="Maps">
        {crumbs[0].kind !== "world" && (
          <button
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
        )}
        {crumbs.map((m, i) => (
          // On a phone only the map above and the open map fit.
          <span
            key={m.id}
            className={`crumb ${i < crumbs.length - 2 ? "far" : ""}`}
          >
            {(i > 0 || crumbs[0].kind !== "world") && (
              <ChevronRight size={13} />
            )}
            {m.id === map.id ? (
              <span className="current">
                {m.kind === "world" && <Globe2 size={16} />}
                {m.name}
              </span>
            ) : (
              <button
                onClick={() => setProject({ ...project, activeMapId: m.id })}
              >
                {m.kind === "world" && <Globe2 size={16} />}
                {m.name}
              </button>
            )}
          </span>
        ))}
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
