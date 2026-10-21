import { useEffect } from "react";
import type { Dispatch, RefObject, SetStateAction } from "react";
import type { BrushSettings, EditorHandle } from "../editor/types";
import { MAP_COLORS } from "../types";
import type { Tool } from "../types";
import { shortcutKey } from "../shortcut-key";
import { toolInfo } from "./constants";
import type { ModalName } from "./constants";
import type { SrdEntry } from "../types";

interface Shortcuts {
  tool: Tool;
  riverCount: number;
  modal: ModalName | null;
  busy: boolean;
  srdDetail: SrdEntry | null;
  editor: RefObject<EditorHandle | null>;
  setModal: (modal: ModalName | null) => void;
  setMenu: (open: boolean) => void;
  setSrdDetail: (entry: SrdEntry | null) => void;
  setSelected: (ids: string[]) => void;
  setHidePanels: Dispatch<SetStateAction<boolean>>;
  setBrush: Dispatch<SetStateAction<BrushSettings>>;
  brush: BrushSettings;
  secondary: string;
  setSecondary: (color: string) => void;
  color: (value: string) => void;
  lockSeed: boolean;
  undo: () => void;
  redo: () => void;
  saveProjectFile: () => void;
  groupObjects: () => void;
  copy: () => boolean;
  cut: () => void;
  paste: (inPlace?: boolean) => void;
  duplicate: () => void;
  deleteObjects: () => void;
  regenerate: (part?: string, reroll?: boolean) => Promise<void>;
  chooseTool: (tool: Tool) => void;
}

/** Keyboard shortcuts: tools, undo, copy, delete, brush size and river editing. */
export function useKeyboardShortcuts(app: Shortcuts) {
  const {
    tool,
    riverCount,
    modal,
    busy,
    srdDetail,
    editor,
    setModal,
    setMenu,
    setSrdDetail,
    setSelected,
    setHidePanels,
    setBrush,
    brush,
    secondary,
    setSecondary,
    color,
    lockSeed,
    undo,
    redo,
    saveProjectFile,
    groupObjects,
    duplicate,
    deleteObjects,
    copy,
    cut,
    paste,
    regenerate,
    chooseTool,
  } = app;
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      // The letter of the key on any layout (Ctrl+C on a Russian layout reports "с").
      const letter = shortcutKey(e);
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;
      // While a river is being placed these keys belong to it, so Enter must
      // not regenerate the map and Backspace must not delete objects.
      if (tool === "river" && riverCount > 0 && !typing && !modal) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (riverCount >= 2) editor.current?.finishRiver();
          return;
        }
        if (e.key === "Escape") {
          editor.current?.cancelRiver();
          return;
        }
        if (
          e.key === "Backspace" ||
          e.key === "Delete" ||
          ((e.ctrlKey || e.metaKey) && letter === "z" && !e.shiftKey)
        ) {
          e.preventDefault();
          editor.current?.undoRiverPoint();
          return;
        }
      }
      if (e.key === "Escape") {
        setModal(null);
        setMenu(false);
        setSrdDetail(null);
        setSelected([]);
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (busy || modal || srdDetail) return;
      if ((e.ctrlKey || e.metaKey) && letter === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && letter === "s") {
        e.preventDefault();
        saveProjectFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && ["c", "x", "v"].includes(letter)) {
        // Text selected on the page is copied by the browser as usual.
        if (letter !== "v" && window.getSelection()?.toString()) return;
        e.preventDefault();
        const key = letter;
        if (key === "c") copy();
        else if (key === "x") cut();
        else paste(e.shiftKey);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && letter === "g") {
        e.preventDefault();
        groupObjects();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && letter === "d") {
        e.preventDefault();
        duplicate();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteObjects();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setHidePanels((x) => !x);
        return;
      }
      // Only when nothing else has focus: Enter on a focused button must not regenerate the map.
      if (
        e.key === "Enter" &&
        !modal &&
        (e.target === document.body ||
          (e.target as HTMLElement).classList?.contains("interaction-canvas"))
      ) {
        void regenerate("all", !lockSeed);
        return;
      }
      if (letter === "[" || letter === "]") {
        setBrush((b) => ({
          ...b,
          size: Math.max(4, Math.min(240, b.size + (letter === "[" ? -4 : 4))),
        }));
        return;
      }
      if (letter === "x") {
        const old = brush.color;
        color(secondary);
        setSecondary(old);
        return;
      }
      if (letter === "d") {
        color(MAP_COLORS[0]);
        setSecondary("#eee6ce");
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const entry = Object.entries(toolInfo).find(
        ([, v]) => v[2] === letter.toUpperCase(),
      );
      if (entry) chooseTool(entry[0] as Tool);
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });
}
