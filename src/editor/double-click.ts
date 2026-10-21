import { navigationTarget } from "../hit-test";
import type { EditorCore } from "./useEditorCore";

export type EditorDoubleClick = ReturnType<typeof createDoubleClick>;

export function createDoubleClick(deps: EditorCore) {
  const { latest, worldPoint, getPoint } = deps;
  function doubleClick(e: React.MouseEvent) {
    const point = worldPoint(getPoint(e));
    const { map, player } = latest.current;
    const o = navigationTarget(
      map.objects.filter(
        (o) =>
          map.layers.find((l) => l.id === o.layer)?.visible !== false &&
          !(player && o.layer === "GM-only"),
      ),
      point,
    );
    if (o) latest.current.onOpen(o);
  }
  return { doubleClick };
}
