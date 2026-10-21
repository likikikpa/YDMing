import { useEffect, useRef } from "react";
import type { EditorHandle } from "../editor/types";
import type { MapData, Project } from "../types";
import { useBackupReminder } from "./useBackupReminder";
import { useClipboard } from "./useClipboard";
import { useGenerator } from "./useGenerator";
import { useKeyboardShortcuts } from "./useKeyboardShortcuts";
import { useLibrary } from "./useLibrary";
import { useMapLinks } from "./useMapLinks";
import { useObjectActions } from "./useObjectActions";
import { usePackImport } from "./usePackImport";
import { useProjectFiles } from "./useProjectFiles";
import { useProjectStore } from "./useProjectStore";
import { useTextureLayers } from "./useTextureLayers";
import { useToast } from "./useToast";
import { useToolState } from "./useToolState";
import { useViewState } from "./useViewState";
import { useWorlds } from "./useWorlds";

/**
 * Everything the screen needs, built from small hooks. Each hook gets only the
 * earlier ones it depends on, so the order below matters.
 */
export function useAppModel() {
  const editor = useRef<EditorHandle>(null);
  const view = useViewState();
  const { notify, toast, setToast } = useToast();
  const store = useProjectStore({ notify, setSelected: view.setSelected });
  const tools = useToolState({ setPanel: view.setPanel });
  const textures = useTextureLayers({
    project: store.project,
    commit: store.commit,
    notify,
    t: view.t,
    brush: tools.brush,
    setBrush: tools.setBrush,
  });
  const generator = useGenerator({
    project: store.project,
    map: store.map,
    commit: store.commit,
    updateMap: store.updateMap,
    notify,
    lang: view.lang,
    busy: view.busy,
    setBusy: view.setBusy,
    setModal: view.setModal,
    setSelected: view.setSelected,
    setTool: tools.setTool,
    setPanel: view.setPanel,
    editor,
  });
  const objects = useObjectActions({
    project: store.project,
    map: store.map,
    setProject: store.setProject,
    mutateMap: store.mutateMap,
    notify,
    t: view.t,
    createMap: generator.createMap,
    selected: view.selected,
    setSelected: view.setSelected,
  });
  const worlds = useWorlds({
    project: store.project,
    projectRef: store.projectRef,
    setProject: store.setProject,
    setHistory: store.setHistory,
    setHistoryIndex: store.setHistoryIndex,
    setSelected: view.setSelected,
    setModal: view.setModal,
    notify,
    t: view.t,
  });
  const links = useMapLinks({
    project: store.project,
    map: store.map,
    commit: store.commit,
    createMap: generator.createMap,
    setSelected: view.setSelected,
  });
  const backup = useBackupReminder(store.project);
  const files = useProjectFiles({
    backupSaved: backup.backupSaved,
    project: store.project,
    importWorld: worlds.importWorld,
    setMenu: view.setMenu,
    notify,
    lang: view.lang,
  });
  const library = useLibrary({
    project: store.project,
    projectRef: store.projectRef,
    commit: store.commit,
    notify,
    t: view.t,
    brush: tools.brush,
    setModal: view.setModal,
    setPanel: view.setPanel,
    setBrush: tools.setBrush,
    chooseTool: tools.chooseTool,
  });
  const packs = usePackImport({
    projectRef: store.projectRef,
    commit: store.commit,
    notify,
    t: view.t,
    color: tools.brush.color,
    myStamps: library.myStamps,
    setMyStamps: library.setMyStamps,
    setLibraryTab: library.setLibraryTab,
    setPanel: view.setPanel,
  });
  // Switching to another map resets what belonged to the previous one.
  const { setSettings } = generator,
    { setGroup, setRoomDetail, setSelected } = view;
  useEffect(() => {
    if (store.map) {
      setSettings(store.map.settings);
      setGroup(
        store.map.kind === "world"
          ? "Shape"
          : store.map.kind === "city"
            ? "Size"
            : "Party",
      );
    }
    setSelected([]);
    setRoomDetail(null);
  }, [store.map?.id]);
  const clipboard = useClipboard({
    project: store.project,
    map: store.map,
    selected: view.selected,
    setSelected: view.setSelected,
    commit: store.commit,
    chooseTool: tools.chooseTool,
    notify,
    t: view.t,
  });
  useKeyboardShortcuts({
    ...view,
    ...tools,
    ...generator,
    ...objects,
    ...store,
    ...files,
    ...clipboard,
    editor,
  });
  return {
    editor,
    toast,
    setToast,
    notify,
    ...view,
    ...store,
    ...tools,
    ...textures,
    ...generator,
    ...objects,
    ...files,
    ...backup,
    ...library,
    ...packs,
    ...worlds,
    ...links,
    ...clipboard,
  };
}

export type AppModel = ReturnType<typeof useAppModel>;
/** The model once the project has loaded: there is always a project and a map. */
export type ReadyApp = AppModel & { project: Project; map: MapData };

export const isReady = (app: AppModel): app is ReadyApp =>
  !!app.project && !!app.map;
