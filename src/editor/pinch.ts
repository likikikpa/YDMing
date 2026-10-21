import { clamp } from "../random";
import type { EditorCore } from "./useEditorCore";
import type { EditorRendering } from "./rendering";

export type EditorPinch = ReturnType<typeof createPinch>;

export function createPinch(deps: EditorCore & EditorRendering) {
  const { view, touches, pinch, position } = deps;
  /** Two fingers zoom and pan the map, like any map app. */
  function pinchStart() {
    const [a, b] = [...touches.current.values()];
    pinch.current = {
      distance: Math.hypot(a.x - b.x, a.y - b.y) || 1,
      centre: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      view: { ...view.current },
    };
  }
  function pinchMove() {
    const g = pinch.current,
      [a, b] = [...touches.current.values()];
    if (!g || !a || !b) return;
    const centre = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      scale = clamp(
        (g.view.scale * (Math.hypot(a.x - b.x, a.y - b.y) || 1)) / g.distance,
        0.12,
        5,
      ),
      // Keep the map point that was under the starting midpoint under the fingers.
      anchor = {
        x: (g.centre.x - g.view.x) / g.view.scale,
        y: (g.centre.y - g.view.y) / g.view.scale,
      };
    view.current = {
      scale,
      x: centre.x - anchor.x * scale,
      y: centre.y - anchor.y * scale,
    };
    position();
  }
  return { pinchStart, pinchMove };
}
