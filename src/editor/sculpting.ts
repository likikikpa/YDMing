import { sculptAmount, sculptDab, unionRects } from "../sculpt";
import type { CellRect } from "../terrain-render";
import type { EditorCore } from "./useEditorCore";
import type { EditorRendering } from "./rendering";

export type EditorSculpting = ReturnType<typeof createSculpting>;

export function createSculpting(deps: EditorCore & EditorRendering) {
  const { latest, view, draft, drag, queued, frame, sculpt, render } = deps;
  /** Time-based brush: the longer the pointer stays down, the more terrain moves. */
  function sculptFrame(now: number) {
    const s = sculpt.current,
      m = draft.current;
    if (!s || !m) return;
    if (s.holdUntil !== undefined) {
      const moved =
        Math.hypot(s.pos.x - s.last.x, s.pos.y - s.last.y) * view.current.scale;
      if (now < s.holdUntil && moved < 6) {
        s.frame = requestAnimationFrame(sculptFrame);
        return;
      }
      // Not a pinch: the first dab lands as a tap would, from where it began.
      s.holdUntil = undefined;
      s.time = now - 120;
    }
    // A long frame must not make the terrain jump, so time per step is capped.
    const b = latest.current.brush,
      tool = latest.current.tool,
      distance = Math.hypot(s.pos.x - s.last.x, s.pos.y - s.last.y),
      // Sweeping the brush counts as time spent on that ground, so a quick
      // swipe of a finger still shapes the land and not only a slow press.
      dt =
        Math.min(0.1, Math.max(0.001, (now - s.time) / 1000)) +
        Math.min(0.1, distance / (b.size * 12)),
      steps = Math.max(1, Math.ceil(distance / Math.max(2, b.size * 0.18))),
      amount = sculptAmount(b.strength, dt, s.pressure, tool) / steps;
    let dirty: CellRect | undefined;
    for (let k = 1; k <= steps; k++)
      dirty = unionRects(
        dirty,
        sculptDab(
          m,
          tool,
          {
            x: s.last.x + ((s.pos.x - s.last.x) * k) / steps,
            y: s.last.y + ((s.pos.y - s.last.y) * k) / steps,
          },
          amount,
          drag.current?.flat ?? 0,
          b,
        ) ?? undefined,
      );
    s.last = s.pos;
    s.time = now;
    if (dirty) {
      if (drag.current) {
        drag.current.sculpted = true;
        drag.current.sculptDirty = unionRects(drag.current.sculptDirty, dirty);
      }
      cancelAnimationFrame(frame.current);
      frame.current = 0;
      queued.current = null;
      render({ map: m, dirty });
    }
    s.frame = requestAnimationFrame(sculptFrame);
  }
  /** Stops the brush loop; a tap still waiting for its first dab gets it now. */
  function endSculpt(cancelled = false) {
    const s = sculpt.current;
    if (s) {
      cancelAnimationFrame(s.frame);
      if (!cancelled && s.holdUntil !== undefined) {
        s.holdUntil = -Infinity;
        sculptFrame(performance.now());
        cancelAnimationFrame(s.frame);
      }
    }
    sculpt.current = null;
  }
  return { sculptFrame, endSculpt };
}
