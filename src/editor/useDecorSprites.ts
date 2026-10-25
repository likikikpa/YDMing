import { useEffect } from "react";
import { onSpritesLoaded } from "../decor-sprites";
import { decorPack, preloadDecor } from "../style-decor";
import { invalidateDecor } from "../terrain-render";
import type { EditorCore } from "./useEditorCore";
import type { EditorRendering } from "./rendering";

/**
 * Loads the pictures a map style scatters over the land, then repaints, so a
 * map opened or switched to a painted style does not stay bare.
 */
export function useDecorSprites({
  props,
  ready,
  refresh,
}: Pick<EditorCore, "props" | "ready"> & Pick<EditorRendering, "refresh">) {
  const settings = props.map.settings,
    // The decoration follows the style, or the chosen stamp packs.
    decor = decorPack(settings),
    world = props.map.kind === "world",
    mapId = props.map.id;
  useEffect(() => {
    if (!ready || !world) return;
    let active = true;
    void preloadDecor(settings).then((loaded) => {
      if (!active || !loaded) return;
      invalidateDecor(mapId);
      refresh();
    });
    return () => {
      active = false;
    };
  }, [decor, world, mapId, ready]);
  // Pictures of kinds the map needed but had not loaded arrive later: draw again.
  useEffect(() => {
    if (!ready || !world) return;
    return onSpritesLoaded(() => {
      invalidateDecor(mapId);
      refresh();
    });
  }, [world, mapId, ready]);
}
