import { useSyncExternalStore } from "react";

/** What the status bar shows about the pointer and the view. */
export interface CursorStatus {
  zoom: number;
  x: number;
  y: number;
  height: number;
  biome: number;
}

let current: CursorStatus = { zoom: 100, x: 0, y: 0, height: 0, biome: 0 };
const listeners = new Set<() => void>();

/**
 * The editor reports the pointer many times a second. Keeping it outside React
 * state means only the read-outs re-render, not the whole app with its panels.
 */
export const cursorStatus = {
  get: () => current,
  set(next: CursorStatus) {
    current = next;
    listeners.forEach((l) => l());
  },
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
};

export const useCursorStatus = () =>
  useSyncExternalStore(cursorStatus.subscribe, cursorStatus.get);
