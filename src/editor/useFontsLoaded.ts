import { useEffect } from "react";
import { onFontsLoaded } from "../font-loader";
import type { EditorCore } from "./useEditorCore";
import type { EditorRendering } from "./rendering";

/**
 * Text is drawn in the default until its font has loaded; draws the map again
 * when one has, so a map opened with a custom font does not keep the default.
 */
export function useFontsLoaded({
  ready,
  refresh,
}: Pick<EditorCore, "ready"> & Pick<EditorRendering, "refresh">) {
  useEffect(() => {
    if (!ready) return;
    return onFontsLoaded(() => refresh());
  }, [ready]);
}
