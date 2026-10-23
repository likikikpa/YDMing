import { objectBounds } from "../extent";
import { idSet } from "../id-set";
import { riverThrough } from "../rivers";
import { SCULPT_TOOLS } from "../sculpt";
import type { Point } from "../types";
import type { EditorCore } from "./useEditorCore";

export type EditorOverlay = ReturnType<typeof createOverlay>;

export function createOverlay(deps: EditorCore) {
  const {
    overlay,
    latest,
    view,
    draft,
    drag,
    riverPoints,
    hover,
    preview,
    size,
    screenPoint,
    worldPoint,
  } = deps;
  function setRiverPoints(points: Point[]) {
    riverPoints.current = points;
    latest.current.onRiverPoints?.(points.length);
    drawOverlay();
  }
  const selectedBounds = () => {
    const p = latest.current,
      m = draft.current || p.map,
      chosen = idSet(p.selected),
      objects = m.objects.filter((o) => chosen.has(o.id));
    if (!objects.length) return null;
    const { left, top, right, bottom } = objectBounds(objects);
    return { x: left, y: top, w: right - left, h: bottom - top, objects };
  };
  /** Selected rivers, roads and walls: a dashed line along each. */
  function drawSelectedPaths(c: CanvasRenderingContext2D) {
    const p = latest.current,
      m = draft.current || p.map;
    c.strokeStyle = "#f3d391";
    c.lineWidth = 2;
    c.setLineDash([6, 4]);
    const chosen = idSet(p.selected);
    for (const q of m.paths) {
      if (!chosen.has(q.id)) continue;
      c.beginPath();
      q.points.forEach((pt, i) => {
        const t = screenPoint(pt);
        if (i) c.lineTo(t.x, t.y);
        else c.moveTo(t.x, t.y);
      });
      c.stroke();
    }
    c.setLineDash([]);
  }
  /**
   * Redraws the overlay. The brush ring stays where the pointer last was, so
   * it survives a lifted finger, a zoom and a size change; `null` clears it.
   */
  function drawOverlay(at?: Point | null) {
    const canvas = overlay.current;
    if (!canvas) return;
    if (at !== undefined) hover.current = at ?? undefined;
    let cursor = hover.current;
    const c = canvas.getContext("2d")!;
    c.clearRect(0, 0, canvas.width, canvas.height);
    const bounds = selectedBounds();
    if (bounds) {
      const a = screenPoint(bounds),
        w = bounds.w * view.current.scale,
        h = bounds.h * view.current.scale;
      c.strokeStyle = "#f3d391";
      c.lineWidth = 1;
      c.setLineDash([4, 3]);
      c.strokeRect(a.x, a.y, w, h);
      c.setLineDash([]);
      c.fillStyle = "#30281c";
      for (const [x, y] of [
        [0, 0],
        [0.5, 0],
        [1, 0],
        [0, 0.5],
        [1, 0.5],
        [0, 1],
        [0.5, 1],
        [1, 1],
      ]) {
        c.fillRect(a.x + w * x - 3, a.y + h * y - 3, 6, 6);
        c.strokeRect(a.x + w * x - 3, a.y + h * y - 3, 6, 6);
      }
      c.beginPath();
      c.moveTo(a.x + w / 2, a.y);
      c.lineTo(a.x + w / 2, a.y - 22);
      c.stroke();
      c.beginPath();
      c.arc(a.x + w / 2, a.y - 25, 4, 0, Math.PI * 2);
      c.fill();
      c.stroke();
    }
    drawSelectedPaths(c);
    if (drag.current?.box) {
      const a = screenPoint(drag.current.start),
        b = screenPoint(drag.current.box);
      c.fillStyle = "#d2af5b19";
      c.strokeStyle = "#d0b77a";
      c.fillRect(a.x, a.y, b.x - a.x, b.y - a.y);
      c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    }
    if (riverPoints.current.length && latest.current.tool === "river") {
      const placed = riverPoints.current,
        preview = riverThrough(
          cursor ? [...placed, worldPoint(cursor)] : placed,
          latest.current.map.paths.filter((p) => p.kind === "river"),
          "preview",
        );
      c.strokeStyle = "#7fb7d6";
      c.fillStyle = "#7fb7d6";
      c.lineWidth = 2;
      if (preview) {
        c.setLineDash(cursor ? [6, 4] : []);
        c.beginPath();
        preview.points.forEach((q, i) => {
          const t = screenPoint(q);
          if (i) c.lineTo(t.x, t.y);
          else c.moveTo(t.x, t.y);
        });
        c.stroke();
        c.setLineDash([]);
      }
      // The river bends at each of these, so they are drawn as handles.
      placed.forEach((q, i) => {
        const t = screenPoint(q);
        c.beginPath();
        c.arc(t.x, t.y, i === 0 ? 5 : 4, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#102028";
        c.lineWidth = 1;
        c.stroke();
      });
    }
    const trail = drag.current?.trail;
    if (trail && trail.length > 1) {
      c.beginPath();
      trail.forEach((p, i) => {
        const s = screenPoint(p);
        if (i) c.lineTo(s.x, s.y);
        else c.moveTo(s.x, s.y);
      });
      c.strokeStyle = "#e6c58a";
      c.lineWidth = 2;
      c.setLineDash([6, 4]);
      c.stroke();
      c.setLineDash([]);
    }
    const t = latest.current.tool;
    if (drag.current && ["island", "room"].includes(t) && drag.current.box) {
      const a = screenPoint(drag.current.start),
        b = screenPoint(drag.current.box);
      c.strokeStyle = "#e6c58a";
      c.setLineDash([5, 4]);
      if (t === "island") {
        c.beginPath();
        c.ellipse(
          (a.x + b.x) / 2,
          (a.y + b.y) / 2,
          Math.abs(b.x - a.x) / 2,
          Math.abs(b.y - a.y) / 2,
          0,
          0,
          Math.PI * 2,
        );
        c.stroke();
      } else c.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
      c.setLineDash([]);
    }
    // With no pointer on the map (a phone, or the size slider in use) the
    // ring is previewed in the middle of the view for a moment.
    if (!cursor && preview.current)
      cursor = { x: size.current.w / 2, y: size.current.h / 2 };
    if (
      cursor &&
      !["select", "hand", "text", "river", "island", "room"].includes(t)
    ) {
      const scatter = latest.current.brush.scatter,
        radius =
          t === "stamp" && scatter?.on && latest.current.map.kind === "world"
            ? scatter.radius * view.current.scale
            : (latest.current.brush.size * view.current.scale) / 2;
      c.beginPath();
      c.arc(cursor.x, cursor.y, radius, 0, Math.PI * 2);
      c.strokeStyle = "#fff9df";
      c.lineWidth = 1;
      c.stroke();
      c.beginPath();
      c.arc(cursor.x, cursor.y, radius + 1, 0, Math.PI * 2);
      c.strokeStyle = "#282c2277";
      c.stroke();
      if (SCULPT_TOOLS.includes(t)) {
        // The inner ring marks where the brush works at full strength.
        c.beginPath();
        c.arc(cursor.x, cursor.y, radius * 0.45, 0, Math.PI * 2);
        c.setLineDash([3, 3]);
        c.strokeStyle = "#fff9df99";
        c.stroke();
        c.setLineDash([]);
      }
    }
  }
  return { setRiverPoints, selectedBounds, drawOverlay };
}
