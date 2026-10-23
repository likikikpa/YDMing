import { useEffect } from "react";
import { resolveStyle } from "../map-styles";
import { preloadAllGround, preloadGround } from "../style-ground";
import { invalidateTerrain } from "../terrain-render";
import type { EditorCore } from "./useEditorCore";
import type { EditorRendering } from "./rendering";

/**
 * Loads the photo tiles a map style paints its ground with, then repaints, so
 * a map opened or switched to a photo style does not stay on generated ground.
 */
export function useGroundPhotos({
  props,
  ready,
  refresh,
}: Pick<EditorCore, "props" | "ready"> & Pick<EditorRendering, "refresh">) {
  const style = resolveStyle(props.map.settings.style);
  useEffect(() => {
    if (!ready) return;
    let active = true;
    void preloadGround(style).then((loaded) => {
      if (!active || !loaded) return;
      invalidateTerrain();
      refresh();
    });
    return () => {
      active = false;
    };
  }, [style, ready]);
  // Once the map is up, load the other styles' photos too: switching to one
  // then paints the map once instead of twice.
  useEffect(() => {
    const timer = setTimeout(() => void preloadAllGround(), 2000);
    return () => clearTimeout(timer);
  }, []);
}
