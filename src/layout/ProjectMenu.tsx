import {
  BookOpen,
  Castle,
  Check,
  DoorOpen,
  FolderOpen,
  Globe2,
  HelpCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";
import { mapTree } from "../map-tree";
import { IconButton } from "../ui/IconButton";

export function ProjectMenu({ app }: { app: ReadyApp }) {
  const {
    fileInput,
    map,
    menu,
    project,
    removeMap,
    saveProjectFile,
    setMenu,
    setModal,
    setProject,
    t,
  } = app;
  if (!menu) return null;
  return (
    <>
      <div className="menu-dismiss" onClick={() => setMenu(false)} />
      <div className="project-menu wood">
        <div className="menu-title">{project.name}</div>
        <button
          onClick={() => {
            setModal("worlds");
            setMenu(false);
          }}
        >
          <Globe2 size={16} />
          {t("Worlds")}
        </button>
        <button
          onClick={() => {
            setModal("new");
            setMenu(false);
          }}
        >
          <Plus size={16} />
          {t("New map")}
        </button>
        <button onClick={() => fileInput.current?.click()}>
          <FolderOpen size={16} />
          {t("Import world file")}
        </button>
        <button onClick={saveProjectFile}>
          <Save size={16} />
          {t("Save world file")}
          <kbd>Ctrl S</kbd>
        </button>
        <hr />
        <small>{t("Maps in this world")}</small>
        {mapTree(project.maps).map(({ map: m, depth }) => (
          <div
            key={m.id}
            className="menu-map"
            style={{ paddingLeft: depth * 14 }}
          >
            <button
              onClick={() => {
                setProject({ ...project, activeMapId: m.id });
                setMenu(false);
              }}
            >
              {m.kind === "world" ? (
                <Globe2 size={15} />
              ) : m.kind === "city" ? (
                <Castle size={15} />
              ) : (
                <DoorOpen size={15} />
              )}
              <span>{m.name}</span>
              {m.id === map.id && <Check size={14} />}
            </button>
            {project.maps.length > 1 && (
              <IconButton
                icon={Trash2}
                title={t("Delete map")}
                onClick={() => removeMap(m.id)}
              />
            )}
          </div>
        ))}
        <hr />
        <button
          onClick={() => {
            setModal("credits");
            setMenu(false);
          }}
        >
          <BookOpen size={16} />
          {t("Credits")}
        </button>
        <button
          onClick={() => {
            setModal("help");
            setMenu(false);
          }}
        >
          <HelpCircle size={16} />
          {t("Keyboard shortcuts")}
        </button>
      </div>
    </>
  );
}
