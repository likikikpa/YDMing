import { useState } from "react";
import { inheritCityTerrain } from "../inherit";
import { createEmptyMap } from "../generator";
import type { Anchor } from "../mapsize";
import { resizeMap, shiftChildren, SIZE_PRESETS } from "../mapsize";
import { defaultSettings, uid } from "../types";
import type {
  GeneratorSettings,
  MapData,
  MapKind,
  MapObject,
  Project,
  Tool,
} from "../types";
import type { EditorHandle } from "../editor/types";
import { mapPacks, packCredits } from "../map-packs";
import type { StampAssets } from "../stamp-brush";
import { generateAsync } from "./generate-async";
import type { ModalName, Panel } from "./constants";

/** Generating and rerolling the map, creating new maps and resizing. */
export function useGenerator({
  project,
  map,
  commit,
  updateMap,
  notify,
  lang,
  busy,
  setBusy,
  setModal,
  setSelected,
  setTool,
  setPanel,
  editor,
}: {
  project: Project | null;
  map: MapData | undefined;
  commit: (next: Project, label: string) => void;
  updateMap: (next: MapData, label: string, assets?: StampAssets) => void;
  notify: (message: string) => void;
  lang: string;
  busy: boolean;
  setBusy: (busy: boolean) => void;
  setModal: (modal: ModalName | null) => void;
  setSelected: (ids: string[]) => void;
  setTool: (tool: Tool) => void;
  setPanel: (panel: Panel) => void;
  editor: React.RefObject<EditorHandle | null>;
}) {
  const [settings, setSettings] = useState(defaultSettings);
  const [lockSeed, setLockSeed] = useState(false);
  const [newKind, setNewKind] = useState<MapKind>("world");
  const [newName, setNewName] = useState("");
  const [newSeed, setNewSeed] = useState("");
  const [newSize, setNewSize] = useState<{ cols: number; rows: number }>(
    SIZE_PRESETS[0],
  );
  const [resize, setResize] = useState<{
    cols: number;
    rows: number;
    anchor: Anchor;
  }>({ cols: 240, rows: 170, anchor: { x: 0.5, y: 0.5 } });
  function openResize() {
    if (!map) return;
    setResize({ cols: map.cols, rows: map.rows, anchor: { x: 0.5, y: 0.5 } });
    setModal("resize");
  }
  /** Applies the Resize dialog: new cells are sea, child maps keep their spot. */
  function applyResize() {
    if (!project || !map) return;
    const next = resizeMap(map, resize.cols, resize.rows, resize.anchor),
      ox = (next.origin?.x ?? 0) - (map.origin?.x ?? 0),
      oy = (next.origin?.y ?? 0) - (map.origin?.y ?? 0),
      maps = project.maps.map((m) => (m.id === map.id ? next : { ...m }));
    shiftChildren(maps, map.id, ox, oy);
    commit({ ...project, maps }, `Resize map · ${next.cols} × ${next.rows}`);
    setModal(null);
    setSelected([]);
    requestAnimationFrame(() => editor.current?.fit());
  }
  async function regenerate(part = "all", reroll = false) {
    if (!map || !project || busy) return;
    setBusy(true);
    const nextSettings = {
      ...settings,
      // The map's choice of stamp packs is its own, so an undone change
      // never lingers in the generator.
      stampPacks: map.settings.stampPacks,
      seed: reroll
        ? Math.random().toString(36).slice(2, 10).toUpperCase()
        : settings.seed,
    };
    try {
      const result = await generateAsync(
        map.kind,
        nextSettings,
        map.name,
        map.id,
        map,
        part,
      );
      if (part === "all" && map.kind === "city" && map.parentPosition) {
        const parent = project.maps.find((m) => m.id === map.parentId);
        if (parent?.kind === "world")
          inheritCityTerrain(parent, result, map.parentPosition);
      }
      updateMap(
        result,
        `${part === "all" ? "Generate map" : `Reroll ${part}`} · ${nextSettings.seed}`,
        // A collection whose licence asks for a credit adds it with its stamps.
        { credits: packCredits(mapPacks(result.settings)) },
      );
      setSettings(nextSettings);
      setSelected([]);
      notify(lang === "ru" ? "Карта создана." : "Map generated.");
    } catch (e) {
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function createMap(
    kind: MapKind,
    name: string,
    seed?: string,
    parent?: MapObject,
    size?: { cols: number; rows: number },
  ) {
    if (!project || !map) return;
    setBusy(true);
    try {
      let s = {
        ...defaultSettings,
        ...map.settings,
        seed: seed || Math.random().toString(36).slice(2, 10).toUpperCase(),
        grid: kind === "dungeon" ? ("square" as const) : ("none" as const),
      };
      if (parent) {
        const i =
          Math.floor((parent.y / map.height) * map.rows) * map.cols +
          Math.floor((parent.x / map.width) * map.cols);
        s = {
          ...s,
          site:
            map.heights[i] < map.settings.seaLevel + 0.06 ? "coast" : "river",
        };
      }
      const next = createEmptyMap(kind, s, name || undefined, uid(), size);
      const updated = structuredClone(map);
      if (parent) {
        next.parentId = map.id;
        next.parentPosition = { x: parent.x, y: parent.y };
        updated.objects.find((o) => o.id === parent.id)!.linkedMap = next.id;
      }
      commit(
        {
          ...project,
          maps: [
            ...project.maps.map((m) => (m.id === map.id ? updated : m)),
            next,
          ],
          activeMapId: next.id,
        },
        `Create ${kind} map`,
      );
      setModal(null);
      setSettings(next.settings);
      setSelected([]);
      setTool("select");
      setPanel("generate");
    } catch (e) {
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  const changeSetting = <K extends keyof GeneratorSettings>(
    key: K,
    value: GeneratorSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));
  return {
    settings,
    setSettings,
    lockSeed,
    setLockSeed,
    changeSetting,
    newKind,
    setNewKind,
    newName,
    setNewName,
    newSeed,
    setNewSeed,
    newSize,
    setNewSize,
    resize,
    setResize,
    openResize,
    applyResize,
    regenerate,
    createMap,
  };
}
