import {
  anyHidden,
  copyFog,
  encodeFog,
  fogReach,
  newFogGrid,
  paintBox,
  paintLine,
  roomAt,
  roomBox,
} from "../fog";
import type { MapData, Point } from "../types";
import { areaAround } from "./areas";
import type { Area } from "./types";
import type { EditorCore } from "./useEditorCore";

export type EditorFogTool = ReturnType<typeof createFogTool>;

/**
 * The fog tool: a brush that reveals or hides ground, or a click that
 * reveals or hides a whole room. Both return the map pixels to redraw.
 */
export function createFogTool(deps: EditorCore) {
  const { latest, drag } = deps;
  const radius = () => latest.current.brush.size / 2;
  const mode = () => latest.current.brush.fog ?? "reveal";
  const store = (m: MapData, d: NonNullable<typeof drag.current>) => {
    if (!d.fog) return;
    m.fog = encodeFog(d.fog);
    d.fogged = true;
  };

  /** A press: paints the first dab, or flips the room under the pointer. */
  function fogDown(m: MapData, world: Point): Area | undefined {
    const d = drag.current;
    if (!d) return undefined;
    // A map with no fog starts fully covered, so the first reveal has something to open.
    d.fog = m.fog ? copyFog(m) : newFogGrid(m, mode() !== "hide");
    if (mode() === "room") {
      const room = roomAt(m, world, d.fog.cell);
      if (!room) return undefined;
      const box = roomBox(room, d.fog.cell);
      if (paintBox(d.fog, box, !anyHidden(d.fog, box))) store(m, d);
      const reach = fogReach(d.fog, 0);
      return {
        x: Math.floor(box.x - reach),
        y: Math.floor(box.y - reach),
        w: Math.ceil(box.w + reach * 2),
        h: Math.ceil(box.h + reach * 2),
      };
    }
    if (paintLine(d.fog, world, world, radius(), mode() === "hide"))
      store(m, d);
    return areaAround([world], fogReach(d.fog, radius()));
  }

  /** A drag: paints from the last point to this one, leaving no gap. */
  function fogMove(m: MapData, world: Point): Area | undefined {
    const d = drag.current;
    if (!d?.fog || mode() === "room") return undefined;
    const from = d.last;
    if (paintLine(d.fog, from, world, radius(), mode() === "hide")) store(m, d);
    d.last = world;
    return areaAround([from, world], fogReach(d.fog, radius()));
  }
  return { fogDown, fogMove };
}
